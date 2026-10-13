import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { HERO_VIDEO, VIDEO, detectVideoContainer } from './media.constants';

export interface ProbeResult {
  durationSeconds: number;
  width: number;
  height: number;
  /** Unrounded. The hero crossfade offset needs it; the gallery does not. */
  exactDurationSeconds?: number;
  /** Source frame rate, when ffprobe reports a usable one. */
  fps?: number;
}

export interface HeroRendition {
  buffer: Buffer;
  width: number;
  height: number;
}

export interface TranscodedHero {
  desktop: HeroRendition;
  mobile: HeroRendition;
  posterFrame: Buffer;
  durationSeconds: number;
  looped: boolean;
}

export interface TranscodedVideo {
  buffer: Buffer;
  posterFrame: Buffer;
  durationSeconds: number;
  width: number;
  height: number;
}

/**
 * ffmpeg/ffprobe wrapper. Every invocation in this file obeys three rules, and
 * they are the reason the file exists as a boundary at all:
 *
 *   1. execFile with an ARGUMENT ARRAY. Never exec, never a template string,
 *      never a shell. A filename or a metadata field reaching a shell is a
 *      command-injection path, and user-supplied video metadata is exactly the
 *      kind of string that carries one.
 *   2. A hard wall-clock timeout with SIGKILL on every call. An unbounded
 *      ffmpeg on a 2-vCPU box shared with another client's production stack is
 *      a denial-of-service vector, not a hypothetical.
 *   3. Paths are generated here, never derived from the upload. The temp
 *      directory is created by mkdtemp and the filenames inside it are fixed
 *      constants, so nothing an uploader controls ever becomes a path segment.
 */
@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  /**
   * One transcode at a time, process-wide. Not a queue library - a promise
   * chain. Two concurrent x264 jobs on two shared cores do not finish in half
   * the time each; they double the load average and starve the neighbouring
   * site. Callers await their turn.
   */
  private chain: Promise<unknown> = Promise.resolve();

  private runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const result = this.chain.then(task, task);
    // Swallow on the chain itself so one failure cannot poison every later job.
    this.chain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  /**
   * Runs a binary with an argument array and a hard timeout.
   *
   * killSignal SIGKILL rather than the default SIGTERM: ffmpeg traps TERM and
   * tries to finalise the container, which on a pathological input is exactly
   * the work we are trying to stop.
   */
  private run(bin: string, args: string[], timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(
        bin,
        args,
        { timeout: timeoutMs, killSignal: 'SIGKILL', maxBuffer: 8 * 1024 * 1024, windowsHide: true },
        (error, stdout, stderr) => {
          if (error) {
            const killed = (error as NodeJS.ErrnoException & { killed?: boolean }).killed;
            if (killed) {
              return reject(new Error(`${bin} exceeded its ${timeoutMs / 1000}s limit and was killed`));
            }
            return reject(new Error(`${bin} failed: ${String(stderr || error.message).slice(0, 400)}`));
          }
          resolve(stdout);
        },
      );
    });
  }

  /**
   * Validation, BEFORE the transcoder ever sees the file.
   *
   * This is the video analogue of detectImageType: a cheap container sniff
   * first, then ffprobe as the authority. ffprobe only reads headers - it does
   * not decode frames - so it is a far smaller attack surface than ffmpeg, and
   * running it first means a file that merely looks like a video by extension
   * is rejected before the full decoder is involved.
   */
  async probe(buffer: Buffer): Promise<ProbeResult> {
    if (!detectVideoContainer(buffer)) {
      throw new BadRequestException(
        'That file is not a video we recognise. Accepted: MP4, MOV, WebM or AVI.',
      );
    }

    const dir = await mkdtemp(join(tmpdir(), 'solstice-probe-'));
    const input = join(dir, 'input');
    try {
      await writeFile(input, buffer);
      const out = await this.run(
        'ffprobe',
        [
          '-v', 'error',
          '-select_streams', 'v:0',
          '-show_entries', 'stream=width,height,codec_type,r_frame_rate',
          '-show_entries', 'format=duration',
          '-of', 'json',
          input,
        ],
        VIDEO.PROBE_TIMEOUT_MS,
      );

      const meta = JSON.parse(out || '{}');
      const stream = meta?.streams?.[0];
      // A real video stream, not merely a parseable container. A renamed JPEG
      // or a WAV in an MP4 wrapper both fail here rather than at the encoder.
      if (!stream || stream.codec_type !== 'video' || !stream.width || !stream.height) {
        throw new BadRequestException('That file has no playable video track.');
      }

      const durationSeconds = Math.round(Number(meta?.format?.duration ?? 0));
      if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        throw new BadRequestException('That video has no readable duration.');
      }
      if (durationSeconds > VIDEO.MAX_DURATION_SECONDS) {
        throw new BadRequestException(
          `That video is ${durationSeconds}s. The limit is ${VIDEO.MAX_DURATION_SECONDS}s - please trim it before uploading.`,
        );
      }

      // "30000/1001" -> 29.97. Absent or nonsense ("0/0") stays undefined, and
      // the hero encode then keeps whatever rate the source has.
      const [num, den] = String(stream.r_frame_rate ?? '').split('/').map(Number);
      const fps = num > 0 && den > 0 ? num / den : undefined;
      return {
        durationSeconds,
        width: Number(stream.width),
        height: Number(stream.height),
        exactDurationSeconds: Number(meta?.format?.duration),
        fps,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        'That file could not be read as a video. Accepted: MP4, MOV, WebM or AVI.',
      );
    } finally {
      // The temp directory goes whether we succeeded, threw, or were killed.
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  /**
   * Normalises any accepted input to ONE delivery format: H.264 / MP4, no
   * audio. The direct analogue of "every image becomes WebP" - a MOV from an
   * iPhone and a WebM from a screen recorder leave here byte-identical in
   * format, so the public player has exactly one thing to support.
   *
   * Also extracts a poster frame as a PNG buffer. It is returned rather than
   * stored, because the CALLER runs it through the existing image pipeline -
   * this service deliberately knows nothing about sharp, WebP or storage.
   */
  async transcode(buffer: Buffer, probe: ProbeResult): Promise<TranscodedVideo> {
    return this.runExclusive(async () => {
      const dir = await mkdtemp(join(tmpdir(), 'solstice-video-'));
      const input = join(dir, 'input');
      const output = join(dir, `output.${VIDEO.OUTPUT_EXT}`);
      const poster = join(dir, 'poster.png');

      try {
        await writeFile(input, buffer);

        // Downscale only - the min() keeps the source size when it is already
        // under the cap, so nothing is ever upscaled. -2 keeps the other axis
        // even, which x264 requires.
        const scale =
          `scale='min(${VIDEO.MAX_WIDTH},iw)':'min(${VIDEO.MAX_HEIGHT},ih)'` +
          `:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`;

        await this.run(
          'ffmpeg',
          [
            '-nostdin',              // never wait on a terminal
            '-y',
            '-i', input,
            '-vf', scale,
            '-c:v', 'libx264',
            '-preset', VIDEO.PRESET,
            '-crf', String(VIDEO.CRF),
            '-profile:v', 'high',
            '-pix_fmt', 'yuv420p',   // the only pixel format Safari reliably plays
            '-movflags', '+faststart', // moov atom first, so it streams before full download
            '-threads', '1',         // one core, so the neighbouring stack keeps the other
            '-an',                   // audio stripped - see the report
            '-t', String(VIDEO.MAX_DURATION_SECONDS), // belt and braces past the probe check
            output,
          ],
          VIDEO.TRANSCODE_TIMEOUT_MS,
        );

        // Poster from one second in, not frame zero: the first frame of a fade
        // or a camera start is very often black.
        const at = Math.min(1, Math.max(0, probe.durationSeconds - 1));
        await this.run(
          'ffmpeg',
          ['-nostdin', '-y', '-ss', String(at), '-i', input, '-frames:v', '1', '-an', poster],
          VIDEO.PROBE_TIMEOUT_MS,
        );

        const [video, posterFrame] = await Promise.all([readFile(output), readFile(poster)]);
        return {
          buffer: video,
          posterFrame,
          durationSeconds: probe.durationSeconds,
          width: Math.min(probe.width, VIDEO.MAX_WIDTH),
          height: Math.min(probe.height, VIDEO.MAX_HEIGHT),
        };
      } finally {
        // Input, output and poster all live in this one directory, so a single
        // recursive remove cleans up every partial artefact on any exit path -
        // success, throw, or timeout kill.
        await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      }
    });
  }

  /**
   * The Home hero encode: a desktop and a mobile rendition plus a poster, in
   * one exclusive job - the same queue as the gallery, so a hero upload never
   * runs alongside a gallery transcode on the shared cores.
   *
   * Differs from transcode() in three ways, each measured (see HERO_VIDEO):
   *   - two sizes, so a phone downloads ~2 MB rather than ~6;
   *   - a bitrate cap as well as CRF, so a busy scene cannot balloon;
   *   - a crossfaded loop seam, so `loop` never shows a cut.
   *
   * The poster is frame 0 of the ENCODED desktop file, not of the source: it
   * is what sits on screen until the video plays, so it must be exactly the
   * first frame the video shows or the hand-off jumps.
   */
  async transcodeHero(buffer: Buffer, probe: ProbeResult): Promise<TranscodedHero> {
    return this.runExclusive(async () => {
      const dir = await mkdtemp(join(tmpdir(), 'solstice-hero-'));
      const input = join(dir, 'input');
      const desktopOut = join(dir, 'desktop.mp4');
      const mobileOut = join(dir, 'mobile.mp4');
      const poster = join(dir, 'poster.png');

      try {
        await writeFile(input, buffer);

        const duration = probe.exactDurationSeconds && probe.exactDurationSeconds > 0
          ? probe.exactDurationSeconds
          : probe.durationSeconds;
        const fade = HERO_VIDEO.CROSSFADE_SECONDS;
        const looped = duration >= HERO_VIDEO.MIN_SECONDS_FOR_CROSSFADE;
        // Never raise the rate: fps=30 on 24fps footage would duplicate frames
        // and pay for them.
        const fps = probe.fps && probe.fps > 0
          ? Math.min(HERO_VIDEO.MAX_FPS, Math.round(probe.fps * 1000) / 1000)
          : HERO_VIDEO.MAX_FPS;

        for (const [profile, out] of [[HERO_VIDEO.DESKTOP, desktopOut], [HERO_VIDEO.MOBILE, mobileOut]] as const) {
          await this.run('ffmpeg', this.heroArgs(input, out, profile, { duration, fade, looped, fps }), HERO_VIDEO.TRANSCODE_TIMEOUT_MS);
        }

        await this.run(
          'ffmpeg',
          ['-nostdin', '-y', '-i', desktopOut, '-frames:v', '1', '-an', poster],
          VIDEO.PROBE_TIMEOUT_MS,
        );

        const [desktop, mobile, posterFrame] = await Promise.all([
          readFile(desktopOut), readFile(mobileOut), readFile(poster),
        ]);
        const [dSize, mSize, outDuration] = await Promise.all([
          this.dimensions(desktopOut), this.dimensions(mobileOut), this.duration(desktopOut),
        ]);
        return {
          desktop: { buffer: desktop, ...dSize },
          mobile: { buffer: mobile, ...mSize },
          posterFrame,
          durationSeconds: Math.max(1, Math.round(outDuration)),
          looped,
        };
      } finally {
        await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      }
    });
  }

  /**
   * Arguments for one hero rendition. Built as an array, like every call in
   * this file: nothing here is ever a shell string.
   *
   * The loop graph, for a clip of length D, a fade of F and a pure tail of T:
   *   body = source[F+T .. D]
   *   head = source[0 .. F+T]
   *   out  = body crossfaded into head, the fade ending T before the end
   * The file ends on unblended source frames just before F+T and starts on
   * source[F+T]: the loop point joins two consecutive source frames. The
   * running time is D-F. See HERO_VIDEO.CROSSFADE_SECONDS for the measurements.
   */
  private heroArgs(
    input: string,
    output: string,
    profile: { MAX_WIDTH: number; MAX_HEIGHT: number; CRF: number; MAXRATE: string; BUFSIZE: string },
    o: { duration: number; fade: number; looped: boolean; fps: number },
  ): string[] {
    const size =
      `scale=${profile.MAX_WIDTH}:${profile.MAX_HEIGHT}:force_original_aspect_ratio=decrease,` +
      `scale='min(iw,${profile.MAX_WIDTH})':-2,scale=trunc(iw/2)*2:trunc(ih/2)*2`;
    // Downscale only: the second scale clamps to the source width, so a 720p
    // upload is never inflated to the box.
    const base = `fps=${o.fps},${size},format=yuv420p`;
    const gop = String(Math.max(1, Math.round(o.fps * HERO_VIDEO.GOP_SECONDS)));

    const split = o.fade + HERO_VIDEO.PURE_TAIL_SECONDS;
    const offset = (o.duration - split - o.fade).toFixed(3);
    const graph = o.looped
      ? [
          '-filter_complex',
          `[0:v]${base},split[a][b];` +
          `[a]trim=start=${split},setpts=PTS-STARTPTS[body];` +
          `[b]trim=end=${split},setpts=PTS-STARTPTS[head];` +
          `[body][head]xfade=transition=fade:duration=${o.fade}:offset=${offset}[out]`,
          '-map', '[out]',
          // A fresh keyframe where the fade begins, so the costliest frames in
          // the file are not predicted from a stale reference.
          '-force_key_frames', offset,
        ]
      : ['-vf', base];

    return [
      '-nostdin', '-y',
      '-i', input,
      ...graph,
      '-c:v', 'libx264',
      '-preset', HERO_VIDEO.PRESET,
      '-crf', String(profile.CRF),
      '-maxrate', profile.MAXRATE,
      '-bufsize', profile.BUFSIZE,
      '-g', gop,
      '-profile:v', 'high',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-threads', '1',
      '-an',
      '-t', String(HERO_VIDEO.MAX_DURATION_SECONDS),
      output,
    ];
  }

  private async dimensions(file: string): Promise<{ width: number; height: number }> {
    const out = await this.run(
      'ffprobe',
      ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', file],
      VIDEO.PROBE_TIMEOUT_MS,
    );
    const s = JSON.parse(out || '{}')?.streams?.[0] ?? {};
    return { width: Number(s.width) || 0, height: Number(s.height) || 0 };
  }

  private async duration(file: string): Promise<number> {
    const out = await this.run(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', file],
      VIDEO.PROBE_TIMEOUT_MS,
    );
    return Number(JSON.parse(out || '{}')?.format?.duration) || 0;
  }
}
