import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeOptional, sanitizePlainText } from '../common/sanitize';
import { UpsertProductDto } from './dto';

const INCLUDE = {
  primaryImage: true,
  gallery: { include: { mediaAsset: true }, orderBy: { order: 'asc' } },
  varieties: { orderBy: { order: 'asc' } },
  packOptions: { orderBy: { order: 'asc' } },
  certifications: { orderBy: { order: 'asc' } },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  /** Public read: published only, and the filter lives here rather than in a
   *  query param the client controls. */
  findPublic(trade?: string) {
    return this.prisma.product.findMany({
      where: {
        status: ProductStatus.PUBLISHED,
        ...(trade ? { trade: trade.toUpperCase() as any } : {}),
      },
      include: INCLUDE,
      orderBy: [{ trade: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findPublicOne(slug: string) {
    return this.prisma.product.findFirst({
      where: { slug, status: ProductStatus.PUBLISHED },
      include: INCLUDE,
    });
  }

  findAllAdmin(search?: string) {
    return this.prisma.product.findMany({
      where: search
        ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { slug: { contains: search, mode: 'insensitive' } }] }
        : undefined,
      include: INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOneAdmin(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: INCLUDE });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private scalars(dto: UpsertProductDto) {
    return {
      slug: sanitizePlainText(dto.slug),
      name: sanitizePlainText(dto.name),
      type: sanitizePlainText(dto.type),
      description: sanitizePlainText(dto.description),
      season: sanitizePlainText(dto.season),
      origin: sanitizePlainText(dto.origin),
      packaging: sanitizePlainText(dto.packaging),
      trade: dto.trade ?? undefined,
      status: dto.status ?? undefined,
      placeholder: dto.placeholder ?? undefined,
      hsCode: sanitizeOptional(dto.hsCode),
      incoterms: dto.incoterms ?? undefined,
      moqValue: dto.moqValue ?? null,
      moqUnit: sanitizeOptional(dto.moqUnit),
      shelfLifeDays: dto.shelfLifeDays ?? null,
      storageTempC: sanitizeOptional(dto.storageTempC),
      storageHumidity: sanitizeOptional(dto.storageHumidity),
      portsOfLoading: dto.portsOfLoading?.map(sanitizePlainText).filter(Boolean) ?? undefined,
      seoTitle: sanitizeOptional(dto.seoTitle),
      seoDescription: sanitizeOptional(dto.seoDescription),
    };
  }

  private children(dto: UpsertProductDto, adminId: string) {
    return {
      varieties: (dto.varieties ?? []).map((v, i) => ({
        name: sanitizePlainText(v.name), grade: sanitizeOptional(v.grade),
        calibreMin: v.calibreMin ?? null, calibreMax: v.calibreMax ?? null,
        order: i, updatedById: adminId,
      })),
      packOptions: (dto.packOptions ?? []).map((p, i) => ({
        cartonWeightKg: new Prisma.Decimal(p.cartonWeightKg),
        cartonsPerPallet: p.cartonsPerPallet ?? null,
        palletsPerReefer: p.palletsPerReefer ?? null,
        cartonsPerReefer: p.cartonsPerReefer ?? null,
        notes: sanitizeOptional(p.notes), order: i, updatedById: adminId,
      })),
      certifications: (dto.certifications ?? []).map((c, i) => ({
        name: sanitizePlainText(c.name),
        // A reference is what makes a claim verifiable. Setting verifiable
        // without one is rejected at the boundary, not just discouraged in the UI.
        verifiable: Boolean(c.verifiable) && Boolean(sanitizeOptional(c.reference)),
        reference: sanitizeOptional(c.reference), order: i, updatedById: adminId,
      })),
    };
  }

  async create(dto: UpsertProductDto, adminId: string) {
    const existing = await this.prisma.product.findUnique({ where: { slug: sanitizePlainText(dto.slug) } });
    if (existing) throw new ConflictException(`A product with slug "${dto.slug}" already exists`);
    const kids = this.children(dto, adminId);

    const product = await this.prisma.product.create({
      data: {
        ...(this.scalars(dto) as any),
        updatedById: adminId,
        varieties: { create: kids.varieties },
        packOptions: { create: kids.packOptions },
        certifications: { create: kids.certifications },
      },
      include: INCLUDE,
    });
    await this.audit('Product', product.id, 'created', adminId, product.name);
    return product;
  }

  /** Children are replaced wholesale inside one transaction. Diffing three child
   *  collections by id buys nothing at this scale and is where subtle
   *  lost-update bugs live. */
  async update(id: string, dto: UpsertProductDto, adminId: string) {
    await this.findOneAdmin(id);
    const clash = await this.prisma.product.findFirst({
      where: { slug: sanitizePlainText(dto.slug), NOT: { id } },
    });
    if (clash) throw new ConflictException(`A product with slug "${dto.slug}" already exists`);
    const kids = this.children(dto, adminId);

    const product = await this.prisma.$transaction(async (tx) => {
      await tx.productVariety.deleteMany({ where: { productId: id } });
      await tx.productPackOption.deleteMany({ where: { productId: id } });
      await tx.productCertification.deleteMany({ where: { productId: id } });
      return tx.product.update({
        where: { id },
        data: {
          ...(this.scalars(dto) as any),
          updatedById: adminId,
          varieties: { create: kids.varieties },
          packOptions: { create: kids.packOptions },
          certifications: { create: kids.certifications },
        },
        include: INCLUDE,
      });
    });
    await this.audit('Product', id, 'updated', adminId, product.name);
    return product;
  }

  async remove(id: string, adminId: string) {
    const product = await this.findOneAdmin(id);
    await this.prisma.product.delete({ where: { id } });
    await this.audit('Product', id, 'deleted', adminId, product.name);
    return { id, deleted: true };
  }

  async setStatus(id: string, status: ProductStatus, adminId: string) {
    const product = await this.prisma.product.update({ where: { id }, data: { status, updatedById: adminId }, include: INCLUDE });
    await this.audit('Product', id, status === ProductStatus.PUBLISHED ? 'published' : 'unpublished', adminId, product.name);
    return product;
  }

  private audit(entityType: string, entityId: string, action: string, actorId: string, summary?: string) {
    return this.prisma.auditLog.create({ data: { entityType, entityId, action, actorId, summary } });
  }
}
