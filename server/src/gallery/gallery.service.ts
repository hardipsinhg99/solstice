import { MediaKind, MediaStatus } from '@prisma/client';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { detectVideoContainer } from '../media/media.constants';
import { MediaService } from '../media/media.service';
import { sanitizeOptional } from '../common/sanitize';

/** Same ceiling reasoning as MAX_GALLERY_IMAGES on a product: a configurable
 *  constant rather than a literal buried in a guard. Higher, because a site
 *  gallery is the one place a larger set is the point. */
export const MAX_GALLERY_IMAGES = 24;

// posterAsset comes along for video rows. One extra join rather than a second
// query per tile, and null for every image row.
const WITH_ASSET = { mediaAsset: { include: { posterAsset: true } } } as const;

@Injectable()
export class GalleryService {
  // MediaService, not StorageService. Every byte still reaches disk through the
  // storage seam, but it does so via the one pipeline that validates magic
  // bytes, re-encodes through sharp and strips EXIF. There is no `fs` import
  // here and no second upload path - acceptance check 8.
  constructor(private prisma: PrismaService, private media: MediaService) {}

  /** Public read: published rows only, and the filter lives here, never in a query param. */
  async findPublic() {
    const rows = await this.prisma.galleryImage.findMany({
      where: {
        published: true,
        // A video that is still transcoding, or that failed, must never reach
        // the public grid - it has no url yet. Images are created READY, so
        // this excludes nothing that used to be included.
        mediaAsset: { status: MediaStatus.READY },
      },
      include: WITH_ASSET,
      orderBy: { order: 'asc' },
    });
    return rows.map((row) => ({
      id: row.id,
      kind: row.mediaAsset.kind === MediaKind.VIDEO ? 'video' : 'image',
      url: row.mediaAsset.url,
      // Video only. The public component branches on `kind`, and this is the
      // still it shows before playback.
      posterUrl: row.mediaAsset.posterAsset?.url ?? null,
      durationSeconds: row.mediaAsset.durationSeconds ?? null,
      // Emitted only when real. The migrated Unsplash rows have 0/0 because
      // nobody measured them, and a zero attribute is worse than none.
      width: row.mediaAsset.width || null,
      height: row.mediaAsset.height || null,
      alt: row.mediaAsset.altText || null,
      caption: row.caption,
    }));
  }

  findAllAdmin() {
    return this.prisma.galleryImage.findMany({ include: WITH_ASSET, orderBy: { order: 'asc' } });
  }

  async add(
    file: { buffer: Buffer; originalname: string; size: number },
    body: { caption?: string; altText?: string },
    adminId: string,
  ) {
    const count = await this.prisma.galleryImage.count();
    if (count >= MAX_GALLERY_IMAGES) {
      throw new BadRequestException(`The gallery holds at most ${MAX_GALLERY_IMAGES} items.`);
    }

    // One control, two pipelines. The container sniff decides which - not the
    // filename, and not the browser-supplied mimetype, both of which an
    // uploader controls.
    const asset = detectVideoContainer(file.buffer)
      ? await this.media.createVideoAsset(file, body.altText ?? null, adminId)
      : await this.media.createAsset(file, body.altText ?? null, adminId);
    const created = await this.prisma.galleryImage.create({
      data: {
        mediaAssetId: asset.id,
        caption: sanitizeOptional(body.caption),
        order: count,
        updatedById: adminId,
      },
      include: WITH_ASSET,
    });
    await this.audit(created.id, 'gallery.added', adminId, asset.filename);
    return created;
  }

  async update(id: string, body: { caption?: string; published?: boolean }, adminId: string) {
    await this.require(id);
    const updated = await this.prisma.galleryImage.update({
      where: { id },
      data: {
        ...(body.caption !== undefined ? { caption: sanitizeOptional(body.caption) } : {}),
        ...(typeof body.published === 'boolean' ? { published: body.published } : {}),
        updatedById: adminId,
      },
      include: WITH_ASSET,
    });
    await this.audit(id, 'gallery.updated', adminId, updated.caption ?? undefined);
    return updated;
  }

  /**
   * Reorder takes the whole list, not a from/to pair. A partial reorder cannot
   * be validated against what the client was actually looking at; a full list
   * can, and a stale client is rejected rather than silently reshuffling rows
   * somebody else added. Lifted from ProductMediaService.reorderGallery.
   */
  async reorder(ids: string[], adminId: string) {
    const rows = await this.prisma.galleryImage.findMany({ select: { id: true } });
    const known = new Set(rows.map((r) => r.id));
    if (ids.length !== rows.length || ids.some((id) => !known.has(id))) {
      throw new BadRequestException('The reorder must list exactly the images currently in the gallery.');
    }
    await this.prisma.$transaction(
      ids.map((id, order) => this.prisma.galleryImage.update({ where: { id }, data: { order } })),
    );
    await this.audit('gallery', 'gallery.reordered', adminId);
    return this.findAllAdmin();
  }

  /**
   * Removes the row AND the bytes, via MediaService.deleteAsset - which skips
   * the unlink for EXTERNAL assets, so deleting a migrated Unsplash row does
   * not try to remove a file this server never wrote. The GalleryImage row goes
   * with it by cascade on mediaAssetId.
   */
  async remove(id: string, adminId: string) {
    const row = await this.require(id);
    await this.media.deleteAsset(row.mediaAssetId);
    await this.compact();
    await this.audit(id, 'gallery.deleted', adminId, row.caption ?? undefined);
    return { id, deleted: true };
  }

  /** Close the hole a delete leaves, so `order` stays 0..n-1 and dense. */
  private async compact() {
    const rows = await this.prisma.galleryImage.findMany({ orderBy: { order: 'asc' }, select: { id: true } });
    await this.prisma.$transaction(
      rows.map((r, order) => this.prisma.galleryImage.update({ where: { id: r.id }, data: { order } })),
    );
  }

  private async require(id: string) {
    const row = await this.prisma.galleryImage.findUnique({ where: { id }, include: WITH_ASSET });
    if (!row) throw new NotFoundException('Gallery image not found');
    return row;
  }

  private audit(entityId: string, action: string, actorId: string, summary?: string) {
    return this.prisma.auditLog.create({
      data: { entityType: 'GalleryImage', entityId, action, actorId, summary },
    });
  }
}
