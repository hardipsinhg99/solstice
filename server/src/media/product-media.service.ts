import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from './media.service';
import { MEDIA } from './media.constants';

/**
 * Product-side media wiring. Kept apart from MediaService on purpose: MediaService
 * knows about images and storage and nothing about products, which is what lets
 * Phase 2 point Pages at it unchanged.
 */
@Injectable()
export class ProductMediaService {
  constructor(private prisma: PrismaService, private media: MediaService) {}

  /**
   * Setting a primary image on a placeholder product retires the awaiting-details
   * state. The two are the same statement about the record - "we do not have this
   * yet" - so leaving the flag set after a real photograph arrives would keep the
   * public card hatched with a picture nobody can see.
   */
  async setPrimary(
    productId: string,
    file: { buffer: Buffer; originalname: string; size: number },
    altText: string | null,
    adminId: string,
  ) {
    const product = await this.requireProduct(productId);
    const asset = await this.media.createAsset(file, altText, adminId);

    await this.prisma.product.update({
      where: { id: productId },
      data: { primaryImageId: asset.id, placeholder: false, updatedById: adminId },
    });

    // Replace, not accumulate: the outgoing file leaves disk too.
    if (product.primaryImageId) await this.media.deleteAsset(product.primaryImageId).catch(() => undefined);

    await this.audit(productId, 'image.primary.set', adminId, asset.filename);
    return this.withMedia(productId);
  }

  async clearPrimary(productId: string, adminId: string) {
    const product = await this.requireProduct(productId);
    if (!product.primaryImageId) return this.withMedia(productId);

    await this.prisma.product.update({
      where: { id: productId },
      data: { primaryImageId: null, updatedById: adminId },
    });
    await this.media.deleteAsset(product.primaryImageId);
    await this.audit(productId, 'image.primary.cleared', adminId);
    return this.withMedia(productId);
  }

  async addGalleryImage(
    productId: string,
    file: { buffer: Buffer; originalname: string; size: number },
    altText: string | null,
    adminId: string,
  ) {
    await this.requireProduct(productId);
    const count = await this.prisma.productMedia.count({ where: { productId } });
    if (count >= MEDIA.MAX_GALLERY_IMAGES) {
      throw new BadRequestException(`A product can have at most ${MEDIA.MAX_GALLERY_IMAGES} gallery images.`);
    }

    const asset = await this.media.createAsset(file, altText, adminId);
    await this.prisma.productMedia.create({
      data: { productId, mediaAssetId: asset.id, order: count },
    });
    await this.audit(productId, 'image.gallery.added', adminId, asset.filename);
    return this.withMedia(productId);
  }

  async removeGalleryImage(productId: string, assetId: string, adminId: string) {
    const link = await this.prisma.productMedia.findUnique({
      where: { productId_mediaAssetId: { productId, mediaAssetId: assetId } },
    });
    if (!link) throw new NotFoundException('That image is not on this product');

    await this.prisma.productMedia.delete({
      where: { productId_mediaAssetId: { productId, mediaAssetId: assetId } },
    });
    await this.media.deleteAsset(assetId);
    await this.compact(productId);
    await this.audit(productId, 'image.gallery.removed', adminId);
    return this.withMedia(productId);
  }

  /** Explicit id order from the client, rewritten as 0..n-1 in one transaction. */
  async reorderGallery(productId: string, assetIds: string[], adminId: string) {
    await this.requireProduct(productId);
    const links = await this.prisma.productMedia.findMany({ where: { productId } });
    const known = new Set(links.map((l) => l.mediaAssetId));

    if (assetIds.length !== links.length || assetIds.some((id) => !known.has(id))) {
      throw new BadRequestException('The reorder must list exactly the images currently on this product.');
    }

    await this.prisma.$transaction(
      assetIds.map((mediaAssetId, order) =>
        this.prisma.productMedia.update({
          where: { productId_mediaAssetId: { productId, mediaAssetId } },
          data: { order },
        }),
      ),
    );
    await this.audit(productId, 'image.gallery.reordered', adminId);
    return this.withMedia(productId);
  }

  /** Keeps order dense after a removal so the next append lands at the end. */
  private async compact(productId: string) {
    const links = await this.prisma.productMedia.findMany({
      where: { productId },
      orderBy: { order: 'asc' },
    });
    await this.prisma.$transaction(
      links.map((l, order) =>
        this.prisma.productMedia.update({
          where: { productId_mediaAssetId: { productId, mediaAssetId: l.mediaAssetId } },
          data: { order },
        }),
      ),
    );
  }

  private withMedia(productId: string) {
    return this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        primaryImage: true,
        gallery: { include: { mediaAsset: true }, orderBy: { order: 'asc' } },
        varieties: { orderBy: { order: 'asc' } },
        packOptions: { orderBy: { order: 'asc' } },
        certifications: { orderBy: { order: 'asc' } },
      },
    });
  }

  private async requireProduct(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private audit(entityId: string, action: string, actorId: string, summary?: string) {
    return this.prisma.auditLog.create({
      data: { entityType: 'Product', entityId, action, actorId, summary },
    });
  }
}
