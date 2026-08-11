import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { sanitizePlainText, sanitizeRichOptional } from '../common/sanitize';

const WITH_PHOTO = { photo: true } as const;

/**
 * Team members are records, not section JSON, because they need what
 * GalleryImage needs: individual CRUD, ordering, and a photograph through the
 * media pipeline. The photo goes through MediaService - the same single upload
 * path products and the gallery use. There is no `fs` here.
 */
@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService, private media: MediaService) {}

  async findPublic() {
    const rows = await this.prisma.teamMember.findMany({
      where: { published: true },
      include: WITH_PHOTO,
      orderBy: { order: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      bio: r.bio,
      photo: r.photo
        ? { url: r.photo.url, alt: r.photo.altText || null, width: r.photo.width || null, height: r.photo.height || null }
        : null,
    }));
  }

  findAllAdmin() {
    return this.prisma.teamMember.findMany({ include: WITH_PHOTO, orderBy: { order: 'asc' } });
  }

  async create(body: { name?: string; role?: string; bio?: string }, adminId: string) {
    const name = sanitizePlainText(body.name);
    if (!name) throw new BadRequestException('A team member needs a name.');
    const count = await this.prisma.teamMember.count();
    const created = await this.prisma.teamMember.create({
      data: {
        name,
        role: sanitizePlainText(body.role),
        bio: sanitizeRichOptional(body.bio),
        order: count,
        updatedById: adminId,
      },
      include: WITH_PHOTO,
    });
    await this.audit(created.id, 'team.added', adminId, created.name);
    return created;
  }

  async update(id: string, body: { name?: string; role?: string; bio?: string; published?: boolean }, adminId: string) {
    await this.require(id);
    const updated = await this.prisma.teamMember.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: sanitizePlainText(body.name) } : {}),
        ...(body.role !== undefined ? { role: sanitizePlainText(body.role) } : {}),
        ...(body.bio !== undefined ? { bio: sanitizeRichOptional(body.bio) } : {}),
        ...(typeof body.published === 'boolean' ? { published: body.published } : {}),
        updatedById: adminId,
      },
      include: WITH_PHOTO,
    });
    await this.audit(id, 'team.updated', adminId, updated.name);
    return updated;
  }

  /**
   * Replacing a photo deletes the previous asset. Without this, every reupload
   * leaves an orphan on disk that nothing references - the failure the media
   * module exists to prevent.
   */
  async setPhoto(
    id: string,
    file: { buffer: Buffer; originalname: string; size: number },
    altText: string | null,
    adminId: string,
  ) {
    const member = await this.require(id);
    const asset = await this.media.createAsset(file, altText ?? `${member.name}, ${member.role}`, adminId);
    const updated = await this.prisma.teamMember.update({
      where: { id },
      data: { photoId: asset.id, updatedById: adminId },
      include: WITH_PHOTO,
    });
    if (member.photoId) await this.media.deleteAsset(member.photoId).catch(() => undefined);
    await this.audit(id, 'team.photo.set', adminId, member.name);
    return updated;
  }

  async clearPhoto(id: string, adminId: string) {
    const member = await this.require(id);
    if (!member.photoId) return member;
    const updated = await this.prisma.teamMember.update({
      where: { id },
      data: { photoId: null, updatedById: adminId },
      include: WITH_PHOTO,
    });
    await this.media.deleteAsset(member.photoId);
    await this.audit(id, 'team.photo.cleared', adminId, member.name);
    return updated;
  }

  /** Full-list reorder, the same contract the gallery uses. */
  async reorder(ids: string[], adminId: string) {
    const rows = await this.prisma.teamMember.findMany({ select: { id: true } });
    const known = new Set(rows.map((r) => r.id));
    if (ids.length !== rows.length || ids.some((id) => !known.has(id))) {
      throw new BadRequestException('The reorder must list exactly the members currently on the team.');
    }
    await this.prisma.$transaction(
      ids.map((id, order) => this.prisma.teamMember.update({ where: { id }, data: { order } })),
    );
    await this.audit('team', 'team.reordered', adminId);
    return this.findAllAdmin();
  }

  async remove(id: string, adminId: string) {
    const member = await this.require(id);
    await this.prisma.teamMember.delete({ where: { id } });
    if (member.photoId) await this.media.deleteAsset(member.photoId).catch(() => undefined);
    await this.compact();
    await this.audit(id, 'team.removed', adminId, member.name);
    return { id, deleted: true };
  }

  private async compact() {
    const rows = await this.prisma.teamMember.findMany({ orderBy: { order: 'asc' }, select: { id: true } });
    await this.prisma.$transaction(
      rows.map((r, order) => this.prisma.teamMember.update({ where: { id: r.id }, data: { order } })),
    );
  }

  private async require(id: string) {
    const member = await this.prisma.teamMember.findUnique({ where: { id }, include: WITH_PHOTO });
    if (!member) throw new NotFoundException('Team member not found');
    return member;
  }

  private audit(entityId: string, action: string, actorId: string, summary?: string) {
    return this.prisma.auditLog.create({
      data: { entityType: 'TeamMember', entityId, action, actorId, summary },
    });
  }
}
