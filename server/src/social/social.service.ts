import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReorderSocialDto, UpsertSocialLinkDto } from './dto';

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  /**
   * Public read. Enabled AND non-empty, because those are two different ways for
   * a row not to be ready and the footer must survive both. A row enabled with no
   * URL would otherwise render an icon linking to nowhere.
   *
   * Ordered by `order` then `platform` so the sort is TOTAL - two rows sharing an
   * order value would otherwise come back in whatever sequence Postgres felt like
   * and the footer would reshuffle between requests.
   */
  async findPublic() {
    const rows = await this.prisma.socialLink.findMany({
      where: { enabled: true, NOT: { url: '' } },
      orderBy: [{ order: 'asc' }, { platform: 'asc' }],
      select: { platform: true, url: true },
    });
    return rows;
  }

  /** Admin read: everything, including the disabled and unconfigured rows. */
  findAll() {
    return this.prisma.socialLink.findMany({
      orderBy: [{ order: 'asc' }, { platform: 'asc' }],
      select: { id: true, platform: true, url: true, enabled: true, order: true, updatedAt: true },
    });
  }

  /**
   * Upsert on platform rather than create/update on id. The platform IS the
   * identity here - there is exactly one Instagram row - so "add" and "edit" are
   * the same operation and the admin cannot produce two Instagram rows by
   * double-clicking.
   */
  async upsert(dto: UpsertSocialLinkDto, adminId: string) {
    const enabling = dto.enabled === true;
    const url = dto.url?.trim() ?? undefined;

    // Enabling a row with no URL is the one combination that reaches a buyer as a
    // broken affordance, so it is refused here rather than silently filtered out
    // by findPublic - the operator needs to be told why nothing appeared.
    if (enabling) {
      const existing = await this.prisma.socialLink.findUnique({ where: { platform: dto.platform } });
      const effective = url !== undefined ? url : existing?.url ?? '';
      if (!effective) {
        throw new BadRequestException(`Add a ${dto.platform} URL before enabling it.`);
      }
    }

    return this.prisma.socialLink.upsert({
      where: { platform: dto.platform },
      create: {
        platform: dto.platform,
        url: url ?? '',
        enabled: dto.enabled ?? false,
        order: dto.order ?? 0,
        updatedById: adminId,
      },
      update: {
        ...(url !== undefined ? { url } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
        updatedById: adminId,
      },
      select: { id: true, platform: true, url: true, enabled: true, order: true },
    });
  }

  /**
   * Clears the row rather than deleting it. The four platforms are a fixed set
   * the sprite supports, so deleting one would leave the admin with no way to add
   * it back short of a code change. "Remove" therefore means "forget the URL and
   * switch it off", which is what an operator actually wants and is reversible.
   */
  async clear(id: string, adminId: string) {
    const row = await this.prisma.socialLink.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Social link not found');
    return this.prisma.socialLink.update({
      where: { id },
      data: { url: '', enabled: false, updatedById: adminId },
      select: { id: true, platform: true, url: true, enabled: true, order: true },
    });
  }

  /** One transaction: the list is never observable half-sorted. */
  async reorder(dto: ReorderSocialDto, adminId: string) {
    await this.prisma.$transaction(
      dto.ids.map((id, index) =>
        this.prisma.socialLink.update({ where: { id }, data: { order: index, updatedById: adminId } }),
      ),
    );
    return this.findAll();
  }
}
