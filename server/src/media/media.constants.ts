/** Single source of truth. No magic numbers scattered through the stack. */
export const MEDIA = {
  /** Hard ceiling on the uploaded byte count, enforced by multer AND re-checked. */
  MAX_UPLOAD_BYTES: 8 * 1024 * 1024, // 8 MB
  /** Longest edge of the processed output. */
  MAX_LONG_EDGE: 1600,
  /** Target for the processed file. Quality steps down until it fits. */
  TARGET_OUTPUT_BYTES: 400 * 1024, // 400 KB
  /** Quality ladder walked from the top until the target is met. */
  QUALITY_STEPS: [82, 74, 66, 58, 50],
  /** Gallery images per product. Configurable constant, not a scattered literal. */
  MAX_GALLERY_IMAGES: 6,
  /** Output format for every processed image. */
  OUTPUT_FORMAT: 'webp' as const,
  OUTPUT_MIME: 'image/webp',
} as const;

/**
 * Accepted input types, identified by MAGIC BYTES - never by the client's
 * Content-Type header or the filename extension, both of which are attacker
 * controlled. A renamed executable called photo.jpg fails here.
 */
export const MAGIC_SIGNATURES: { label: string; test: (b: Buffer) => boolean }[] = [
  { label: 'image/jpeg', test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    label: 'image/png',
    test: (b) =>
      b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    label: 'image/webp',
    test: (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  },
];

/**
 * SVG is deliberately absent. It is a script-execution vector, cannot be
 * meaningfully sanitised by a raster pipeline, and no product photograph needs
 * it. AVIF/HEIC are absent because sharp's support depends on the libvips build
 * and a format that works locally but not on the deploy host is worse than one
 * that is refused consistently.
 */
export function detectImageType(buffer: Buffer): string | null {
  return MAGIC_SIGNATURES.find((s) => s.test(buffer))?.label ?? null;
}

/**
 * Video. Separate caps from images on purpose - MEDIA.MAX_UPLOAD_BYTES is 8MB,
 * which a 60-second phone clip clears in the first two seconds. Raising the
 * shared cap would have quietly raised it for every image endpoint too.
 *
 * Every number here was chosen against THIS box: 2 vCPU, ~800MB free, shared
 * with another client's live stack.
 */
export const VIDEO = {
  /** Accepted before a byte is processed. A phone-shot 60s 1080p clip fits. */
  MAX_UPLOAD_BYTES: 200 * 1024 * 1024, // 200 MB

  /**
   * 60 seconds. Gallery b-roll, not archival footage - and the cap is really a
   * bound on worst-case transcode time, which on 2 shared vCPUs is roughly 2-4x
   * realtime at 1080p. 60s keeps the ceiling near four minutes; 90s pushed it
   * past six, which is long enough to matter to the neighbouring stack.
   */
  MAX_DURATION_SECONDS: 60,

  /** Downscale only. An upscale invents detail and costs bytes for nothing. */
  MAX_WIDTH: 1920,
  MAX_HEIGHT: 1080,

  /**
   * CRF 26 with the veryfast preset. 23 is the visually-transparent default and
   * roughly doubles the file for a gallery clip nobody inspects frame by frame;
   * 28 shows banding on the graded, low-contrast footage this brand uses.
   * veryfast rather than medium because CPU time is the scarce resource here,
   * not disk.
   */
  CRF: 26,
  PRESET: 'veryfast',

  /** Audio is stripped. See -an in the argument list and the report. */
  STRIP_AUDIO: true,

  /** Hard wall-clock ceilings. A hung ffmpeg on a shared box is a DoS. */
  PROBE_TIMEOUT_MS: 15_000,
  TRANSCODE_TIMEOUT_MS: 8 * 60_000,

  /**
   * One at a time. Two vCPUs and a neighbouring production site mean a second
   * concurrent transcode does not halve the wall time, it doubles the load and
   * starves the other stack. libx264 also gets -threads 1 for the same reason.
   */
  MAX_CONCURRENT: 1,

  OUTPUT_MIME: 'video/mp4',
  OUTPUT_EXT: 'mp4',

  /**
   * Container sniffing before ffprobe ever runs - the direct analogue of
   * detectImageType. Not a substitute for ffprobe, a cheap first gate so an
   * obviously-wrong file never reaches the C decoder at all.
   */
  MAGIC: [
    { label: 'video/mp4', test: (b: Buffer) => b.length > 12 && b.toString('ascii', 4, 8) === 'ftyp' },
    { label: 'video/webm', test: (b: Buffer) => b.length > 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
    { label: 'video/quicktime', test: (b: Buffer) => b.length > 12 && b.toString('ascii', 4, 8) === 'ftyp' },
    { label: 'video/x-msvideo', test: (b: Buffer) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'AVI ' },
  ] as { label: string; test: (b: Buffer) => boolean }[],
} as const;

/**
 * The Home hero background video. Same validation and the same transcoder as
 * the gallery (VIDEO above); a different encode, because the job is different.
 * A gallery clip is watched; a hero clip loops behind a dark overlay on every
 * first visit, and a looping video is in practice downloaded in full - so it is
 * sized for the network, not for inspection.
 *
 * Measured on production's ffmpeg build (5.1.9), 19s of high-bitrate 1080p
 * footage, single-threaded as production runs it:
 *
 *   gallery profile, 1080p CRF26 veryfast   11.7 MB
 *   desktop below, 1600w CRF27 cap 2.5M      6.0 MB   SSIM 0.960
 *   mobile below,  960w CRF28 cap 1M         2.4 MB   SSIM 0.947
 *
 * SSIM is against the source at the same size; >0.95 reads as the source.
 * `medium` rather than the gallery's `veryfast`: a hero is encoded once and
 * downloaded on every first visit, so CPU time spent here is repaid many times
 * over in bytes not sent. The bitrate CAP, not CRF alone, is what bounds the
 * worst case: CRF lets a busy scene (water, foliage, crowds) balloon.
 */
export const HERO_VIDEO = {
  /**
   * 20 seconds. A hero loop needs 8-15; duration is the biggest lever on size
   * (the file is roughly proportional to it), and a longer clip is not a
   * better background. Rejected with a message rather than silently trimmed,
   * because which 20 seconds to keep is an editorial decision.
   */
  MAX_DURATION_SECONDS: 20,

  /** 60fps phone footage is halved for free: nobody sees the difference in a
   *  background, everybody pays for the bytes. Never raised - 24 stays 24. */
  MAX_FPS: 30,

  /**
   * Seamless loop. The clip's last second is crossfaded into its opening, so
   * the end of the file runs straight into the frame the loop jumps back to
   * and the native `loop` attribute never shows a cut.
   *
   * Measured as the SSIM between the last and first frames (1.0 = identical),
   * against ordinary consecutive frames inside the same encode (0.84-0.87):
   *   plain encode, no crossfade                    0.48   a hard cut
   *   crossfade, bitrate-capped                     0.74   the fade starved
   *   crossfade + pure tail + buffer + keyframe     0.81   (19s clip; 0.78 on 6s)
   * A crossfade changes every pixel on every frame - the most expensive thing
   * H.264 can be asked to encode - so under the bitrate cap the fade and the
   * frames after it were starved: the picture at the seam was right and its
   * quality was not. Three changes fixed most of that: the fade finishes
   * PURE_TAIL_SECONDS early so the last frames are unblended source; the
   * buffer is 4x the cap so the fade can borrow bits without raising the
   * average; and a keyframe opens the fade. x264 zones were tried and moved
   * nothing. The remaining gap is a one-frame sharpness step, not a cut.
   *
   * Costs one second of running time. Skipped on clips too short to spare it.
   */
  CROSSFADE_SECONDS: 1,
  PURE_TAIL_SECONDS: 0.25,
  MIN_SECONDS_FOR_CROSSFADE: 4,

  PRESET: 'medium',
  /** A keyframe every 2s: starts fast, seeks fast, costs little. */
  GOP_SECONDS: 2,

  /** Fit inside these boxes, downscale only; aspect ratio is kept. */
  DESKTOP: { MAX_WIDTH: 1600, MAX_HEIGHT: 900, CRF: 27, MAXRATE: '2500k', BUFSIZE: '10000k' },
  MOBILE: { MAX_WIDTH: 960, MAX_HEIGHT: 540, CRF: 28, MAXRATE: '1000k', BUFSIZE: '4000k' },

  /** Two encodes at `medium` of up to 20s: comfortably inside, on 2 vCPUs. */
  TRANSCODE_TIMEOUT_MS: 8 * 60_000,
} as const;

/** Cheap container check. Returns null when nothing matches. */
export function detectVideoContainer(buffer: Buffer): string | null {
  return VIDEO.MAGIC.find((s) => s.test(buffer))?.label ?? null;
}
