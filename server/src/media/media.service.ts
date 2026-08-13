import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaAsset, StorageDriver } from '@prisma/client';
import sharp from 'sharp';
import type { OutputInfo } from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { sanitizeOptional } from '../common/sanitize';
import { MEDIA, detectImageType } from './media.constants';

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  sizeBytes: number;
  quality: number;
}

@Injectable()
export class MediaService {
  // No `fs` import, no path construction: every byte that reaches disk goes
  // through StorageService. See acceptance check 10.
  constructor(private prisma: PrismaService, private storage: StorageService) {}

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
