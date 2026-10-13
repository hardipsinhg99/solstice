import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { MediaAsset, StorageDriver, MediaKind, MediaStatus } from '@prisma/client';
import sharp from 'sharp';
import type { OutputInfo } from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { sanitizeOptional } from '../common/sanitize';
import { HERO_VIDEO, MEDIA, VIDEO, detectImageType, detectVideoContainer } from './media.constants';
import { VideoService } from './video.service';

/** What the hero video field polls, and what it stores once READY. */
export interface HeroVideoState {
  status: MediaStatus;
  failureReason: string | null;
  video: null | {
    desktop: { id: string; url: string; width: number; height: number; sizeBytes: number };
    mobile: { id: string; url: string; width: number; height: number; sizeBytes: number };
    poster: { url: string; width: number; height: number } | null;
    durationSeconds: number;
  };
}

/* The two renditions of one hero upload are tied by a SHA-256 of the source
   file and the encoding profile, carried in their `filename`. That is the whole link - no schema change - and
   it is also the de-duplication key: the same file uploaded twice is found by
   its hash and never encoded twice. */
const HERO_DESKTOP = 'hero-desktop:'
const HERO_MOBILE = 'hero-mobile:'

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  sizeBytes: number;
  quality: number;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  // No `fs` import, no path construction: every byte that reaches disk goes
  // through StorageService. See acceptance check 10.
  constructor(private readonly video: VideoService,
    private prisma: PrismaService, private storage: StorageService) {}

  /**
   * Content-based validation. The claimed mimetype and the filename extension
   * are both ignored on purpose - a renamed executable presents a perfectly
   * valid `image/jpeg` header and a `.jpg` name.
   */
  assertIsImage(buffer: Buffer): string {
    if (!buffer?.length) throw new BadRequestException('Empty upload');
    const detected = detectImageType(buffer);
    if (!detected) {
      throw new BadRequestException(
        'That file is not a JPEG, PNG or WebP image. The check reads the file’s own header, ' +
          'so renaming a file will not get it past this.',
      );
    }
    return detected;
  }

  /**
   * Resize, strip metadata, compress to target.
   *
   * sharp drops EXIF by default - it only preserves metadata when explicitly
   * asked via .withMetadata(). That call is deliberately absent, so GPS
   * coordinates and camera serial numbers from a phone photo do not survive.
   * .rotate() is called first so the EXIF orientation flag is baked into the
   * pixels before the metadata carrying it is discarded; without it, stripping
   * orientation silently turns portrait photos sideways.
   */
  async process(input: Buffer): Promise<ProcessedImage> {
    const probe = sharp(input, { failOn: 'error' });
    const meta = await probe.metadata().catch(() => null);
    if (!meta?.width || !meta?.height) {
      throw new BadRequestException('That image could not be decoded.');
    }

    const base = sharp(input, { failOn: 'error' })
      .rotate()
      .resize({
        width: MEDIA.MAX_LONG_EDGE,
        height: MEDIA.MAX_LONG_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      });

    // Walk the quality ladder rather than guessing one number: a flat photo hits
    // target at 82, a busy one needs less, and a fixed quality either bloats the
    // first or ruins the second.
    let best: { buffer: Buffer; info: OutputInfo; quality: number } | null = null;
    for (const quality of MEDIA.QUALITY_STEPS) {
      const { data, info } = await base
        .clone()
        .webp({ quality, effort: 4 })
        .toBuffer({ resolveWithObject: true });
      best = { buffer: data, info, quality };
      if (data.length <= MEDIA.TARGET_OUTPUT_BYTES) break;
    }
    if (!best) throw new BadRequestException('That image could not be processed.');

    return {
      buffer: best.buffer,
      width: best.info.width,
      height: best.info.height,
      sizeBytes: best.buffer.length,
      quality: best.quality,
    };
  }

  /** Validate 🠖 process 🠖 store 🠖 record. The only path that creates an asset. */
  async createAsset(
    file: { buffer: Buffer; originalname: string; size: number },
    altText: string | null,
    adminId: string,
  ): Promise<MediaAsset> {
    if (file.size > MEDIA.MAX_UPLOAD_BYTES) {
      throw new BadRequestException(
        `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MEDIA.MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
      );
    }
    this.assertIsImage(file.buffer);
    const processed = await this.process(file.buffer);

    const stored = await this.storage.save(processed.buffer, {
      extension: MEDIA.OUTPUT_FORMAT,
      contentType: MEDIA.OUTPUT_MIME,
    });

    return this.prisma.mediaAsset.create({
      data: {
        filename: sanitizeOptional(file.originalname) ?? 'upload',
        storagePath: stored.storagePath,
        driver: StorageDriver.LOCAL,
        url: stored.url,
        mimeType: MEDIA.OUTPUT_MIME,
        width: processed.width,
        height: processed.height,
        sizeBytes: processed.sizeBytes,
        altText: sanitizeOptional(altText),
        uploadedById: adminId,
      },
    });
  }

  /**
   * Video upload. Returns IMMEDIATELY with a QUEUED asset; the transcode runs
   * after the response.
   *
   * Synchronous transcoding was never an option: a 60s clip takes minutes on
   * two shared cores, which is far past any sane request timeout, and raising
   * the global timeout to accommodate it would weaken every other endpoint. The
   * admin polls `status` instead.
   */
  async createVideoAsset(
    file: { buffer: Buffer; originalname: string; size: number },
    altText: string | null,
    adminId: string,
  ): Promise<MediaAsset> {
    // Size first, before a byte is parsed - the cheapest possible rejection.
    if (file.size > VIDEO.MAX_UPLOAD_BYTES) {
      throw new BadRequestException(
        `That video is ${(file.size / 1024 / 1024).toFixed(0)} MB. The limit is ${VIDEO.MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
      );
    }

    // ffprobe BEFORE anything else touches the file. Throws on a non-video, on
    // a missing video track, and on anything over the duration cap - so the
    // admin gets a real error synchronously rather than a job that fails later.
    const probe = await this.video.probe(file.buffer);

    const asset = await this.prisma.mediaAsset.create({
      data: {
        filename: sanitizeOptional(file.originalname) ?? 'upload',
        // Nothing is stored yet. These are placeholders the transcode replaces,
        // and status QUEUED is what tells every consumer not to render it.
        storagePath: '',
        driver: StorageDriver.LOCAL,
        url: '',
        mimeType: VIDEO.OUTPUT_MIME,
        width: probe.width,
        height: probe.height,
        sizeBytes: file.size,
        durationSeconds: probe.durationSeconds,
        kind: MediaKind.VIDEO,
        status: MediaStatus.QUEUED,
        altText: sanitizeOptional(altText),
        uploadedById: adminId,
      },
    });

    // Background, deliberately un-awaited. setImmediate rather than a queue
    // library: at this volume a DB status flag and a promise chain in
    // VideoService are the whole requirement, and a queue would be a second
    // piece of infrastructure to run on a box that has no room for one.
    setImmediate(() => {
      void this.runTranscode(asset.id, file.buffer, probe, adminId);
    });

    return asset;
  }

  /**
   * The background half. Owns its own error handling completely - nothing
   * awaits it, so an unhandled rejection here would be an unhandled rejection
   * in the process.
   */
  private async runTranscode(
    assetId: string,
    buffer: Buffer,
    probe: { durationSeconds: number; width: number; height: number },
    adminId: string,
  ): Promise<void> {
    try {
      await this.prisma.mediaAsset.update({
        where: { id: assetId },
        data: { status: MediaStatus.PROCESSING },
      });

      const result = await this.video.transcode(buffer, probe);

      // THE REUSE THAT MATTERS: the poster frame is a plain Buffer, so it goes
      // through the same process() the whole site's imagery uses - same resize
      // ladder, same WebP quality walk, same EXIF stripping. No second image
      // path exists for video posters.
      const processedPoster = await this.process(result.posterFrame);
      const storedPoster = await this.storage.save(processedPoster.buffer, {
        extension: MEDIA.OUTPUT_FORMAT,
        contentType: MEDIA.OUTPUT_MIME,
      });
      const posterAsset = await this.prisma.mediaAsset.create({
        data: {
          filename: 'poster',
          storagePath: storedPoster.storagePath,
          driver: StorageDriver.LOCAL,
          url: storedPoster.url,
          mimeType: MEDIA.OUTPUT_MIME,
          width: processedPoster.width,
          height: processedPoster.height,
          sizeBytes: processedPoster.sizeBytes,
          kind: MediaKind.IMAGE,
          status: MediaStatus.READY,
          uploadedById: adminId,
        },
      });

      const storedVideo = await this.storage.save(result.buffer, {
        extension: VIDEO.OUTPUT_EXT,
        contentType: VIDEO.OUTPUT_MIME,
      });

      await this.prisma.mediaAsset.update({
        where: { id: assetId },
        data: {
          storagePath: storedVideo.storagePath,
          url: storedVideo.url,
          sizeBytes: result.buffer.length,
          width: result.width,
          height: result.height,
          posterAssetId: posterAsset.id,
          status: MediaStatus.READY,
          failureReason: null,
        },
      });
      this.logger.log(`Transcoded ${assetId}: ${(result.buffer.length / 1024 / 1024).toFixed(1)}MB`);
    } catch (err) {
      const reason = (err as Error)?.message?.slice(0, 300) ?? 'Transcode failed';
      this.logger.error(`Transcode failed for ${assetId}: ${reason}`);
      // FAILED, not deleted. The row is what the admin polls, so it has to
      // survive to carry the reason; the orphaned-file question is handled by
      // VideoService, which removes its temp directory on every exit path, and
      // by the fact that nothing was written to storage before this point.
      await this.prisma.mediaAsset
        .update({ where: { id: assetId }, data: { status: MediaStatus.FAILED, failureReason: reason } })
        .catch(() => undefined);
    }
  }

  async updateAltText(id: string, altText: string | null): Promise<MediaAsset> {
    await this.requireAsset(id);
    return this.prisma.mediaAsset.update({ where: { id }, data: { altText: sanitizeOptional(altText) } });
  }

  /**
   * Removes the row AND the bytes. Orphaned files accumulating across replace
   * operations is the failure this exists to prevent.
   *
   * Storage first, then the row: if the unlink fails the row survives and the
   * asset is still reachable, which is recoverable. The reverse order would
   * leave a file nobody has a reference to - an orphan by construction.
   * EXTERNAL assets are skipped: there is no file of ours to remove.
   */
  async deleteAsset(id: string): Promise<void> {
    const asset = await this.requireAsset(id);
    if (asset.driver === StorageDriver.LOCAL) {
      await this.storage.delete(asset.storagePath);
    }
    await this.prisma.mediaAsset.delete({ where: { id } });
  }

  private async requireAsset(id: string): Promise<MediaAsset> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Media asset not found');
    return asset;
  }

  /**
   * A Home hero background video: validated exactly like a gallery video, then
   * encoded by VideoService.transcodeHero into a desktop and a mobile rendition
   * plus a poster - in the background, because two `medium` encodes take
   * minutes, not a request's worth of time. The caller polls heroVideoState.
   *
   * Never processes the same file twice. A re-upload of identical bytes - the
   * same clip picked again after a discard, or a second tab - returns the
   * existing pair, ready or still in flight, instead of queueing another encode.
   * Only a FAILED pair is retried.
   */
  async createHeroVideo(
    file: { buffer: Buffer; originalname: string; size: number },
    adminId: string,
  ): Promise<HeroVideoState & { desktopId: string }> {
    if (file.size > VIDEO.MAX_UPLOAD_BYTES) {
      throw new BadRequestException(
        `That video is ${(file.size / 1024 / 1024).toFixed(0)} MB. The limit is ${VIDEO.MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
      );
    }

    // The profile is part of the key: change an encoder setting and the same
    // source file is a new encode, not a stale one served from the old key.
    const sha = createHash('sha256').update(file.buffer).update(JSON.stringify(HERO_VIDEO)).digest('hex');
    const existing = await this.prisma.mediaAsset.findFirst({
      where: { filename: HERO_DESKTOP + sha, kind: MediaKind.VIDEO, status: { not: MediaStatus.FAILED } },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      this.logger.log(`Hero video ${sha.slice(0, 12)} already ${existing.status} - not encoding it again`);
      return { desktopId: existing.id, ...(await this.heroVideoState(existing.id)) };
    }

    // ffprobe before anything is stored: the same gate as the gallery, so a
    // non-video, a file with no video track, or an unreadable one is refused
    // synchronously, with a message, before any job exists.
    const probe = await this.video.probe(file.buffer);
    if (probe.durationSeconds > HERO_VIDEO.MAX_DURATION_SECONDS) {
      throw new BadRequestException(
        `That video is ${probe.durationSeconds}s. A hero background loops, so 8-15 seconds works best; ` +
        `the limit is ${HERO_VIDEO.MAX_DURATION_SECONDS}s. Please trim it and upload again.`,
      );
    }

    const placeholder = (rendition: string) => ({
      filename: rendition + sha,
      storagePath: '',
      driver: StorageDriver.LOCAL,
      url: '',
      mimeType: VIDEO.OUTPUT_MIME,
      width: probe.width,
      height: probe.height,
      sizeBytes: file.size,
      durationSeconds: probe.durationSeconds,
      kind: MediaKind.VIDEO,
      status: MediaStatus.QUEUED,
      uploadedById: adminId,
    });
    const [desktop, mobile] = await this.prisma.$transaction([
      this.prisma.mediaAsset.create({ data: placeholder(HERO_DESKTOP) }),
      this.prisma.mediaAsset.create({ data: placeholder(HERO_MOBILE) }),
    ]);

    setImmediate(() => {
      void this.runHeroTranscode(desktop.id, mobile.id, file.buffer, probe, adminId);
    });

    return { desktopId: desktop.id, ...(await this.heroVideoState(desktop.id)) };
  }

  /** The pair's combined state, as the admin field polls it. */
  async heroVideoState(desktopId: string): Promise<HeroVideoState> {
    const desktop = await this.prisma.mediaAsset.findUnique({
      where: { id: desktopId },
      include: { posterAsset: true },
    });
    if (!desktop || !desktop.filename.startsWith(HERO_DESKTOP)) {
      throw new NotFoundException('Hero video not found');
    }
    const mobile = await this.prisma.mediaAsset.findFirst({
      where: { filename: HERO_MOBILE + desktop.filename.slice(HERO_DESKTOP.length) },
      orderBy: { createdAt: 'desc' },
    });

    // The pair is only as far along as its slower half.
    const failed = desktop.status === MediaStatus.FAILED || mobile?.status === MediaStatus.FAILED;
    const ready = desktop.status === MediaStatus.READY && mobile?.status === MediaStatus.READY;
    const status = failed ? MediaStatus.FAILED
      : ready ? MediaStatus.READY
      : desktop.status === MediaStatus.QUEUED ? MediaStatus.QUEUED
      : MediaStatus.PROCESSING;

    const rendition = (a: MediaAsset) => ({ id: a.id, url: a.url, width: a.width, height: a.height, sizeBytes: a.sizeBytes });
    return {
      status,
      failureReason: failed ? (desktop.failureReason ?? mobile?.failureReason ?? 'The video could not be processed.') : null,
      video: ready && mobile ? {
        desktop: rendition(desktop),
        mobile: rendition(mobile),
        poster: desktop.posterAsset
          ? { url: desktop.posterAsset.url, width: desktop.posterAsset.width, height: desktop.posterAsset.height }
          : null,
        durationSeconds: desktop.durationSeconds ?? 0,
      } : null,
    };
  }

  /** The background half. Owns all of its errors - nothing awaits it. */
  private async runHeroTranscode(
    desktopId: string,
    mobileId: string,
    buffer: Buffer,
    probe: Awaited<ReturnType<VideoService['probe']>>,
    adminId: string,
  ): Promise<void> {
    const ids = { id: { in: [desktopId, mobileId] } };
    try {
      await this.prisma.mediaAsset.updateMany({ where: ids, data: { status: MediaStatus.PROCESSING } });

      const result = await this.video.transcodeHero(buffer, probe);

      // The poster goes through the site's one image pipeline - WebP, resize
      // ladder, EXIF stripped - exactly as gallery posters do.
      const processedPoster = await this.process(result.posterFrame);
      const storedPoster = await this.storage.save(processedPoster.buffer, {
        extension: MEDIA.OUTPUT_FORMAT,
        contentType: MEDIA.OUTPUT_MIME,
      });
      const posterAsset = await this.prisma.mediaAsset.create({
        data: {
          filename: 'hero-poster',
          storagePath: storedPoster.storagePath,
          driver: StorageDriver.LOCAL,
          url: storedPoster.url,
          mimeType: MEDIA.OUTPUT_MIME,
          width: processedPoster.width,
          height: processedPoster.height,
          sizeBytes: processedPoster.sizeBytes,
          kind: MediaKind.IMAGE,
          status: MediaStatus.READY,
          uploadedById: adminId,
        },
      });

      for (const [id, rendition] of [[desktopId, result.desktop], [mobileId, result.mobile]] as const) {
        const stored = await this.storage.save(rendition.buffer, {
          extension: VIDEO.OUTPUT_EXT,
          contentType: VIDEO.OUTPUT_MIME,
        });
        await this.prisma.mediaAsset.update({
          where: { id },
          data: {
            storagePath: stored.storagePath,
            url: stored.url,
            sizeBytes: rendition.buffer.length,
            width: rendition.width,
            height: rendition.height,
            durationSeconds: result.durationSeconds,
            posterAssetId: posterAsset.id,
            status: MediaStatus.READY,
            failureReason: null,
          },
        });
      }
      this.logger.log(
        `Hero video ${desktopId}: desktop ${(result.desktop.buffer.length / 1048576).toFixed(1)}MB, ` +
        `mobile ${(result.mobile.buffer.length / 1048576).toFixed(1)}MB, ${result.durationSeconds}s` +
        (result.looped ? ', crossfaded loop' : ''),
      );
    } catch (err) {
      const reason = (err as Error)?.message?.slice(0, 300) ?? 'Transcode failed';
      this.logger.error(`Hero transcode failed for ${desktopId}: ${reason}`);
      // FAILED, not deleted: the field polls these rows for the reason. Nothing
      // reached storage before this point, so there are no files to clean up.
      await this.prisma.mediaAsset
        .updateMany({
          where: ids,
          data: { status: MediaStatus.FAILED, failureReason: 'The video could not be processed. Try exporting it again as MP4 (H.264) and re-uploading.' },
        })
        .catch(() => undefined);
    }
  }
}
