import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MediaAsset, StorageDriver, MediaKind, MediaStatus } from '@prisma/client';
import sharp from 'sharp';
import type { OutputInfo } from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { sanitizeOptional } from '../common/sanitize';
import { MEDIA, VIDEO, detectImageType, detectVideoContainer } from './media.constants';
import { VideoService } from './video.service';

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
}
