import { Injectable } from '@nestjs/common';
import { SiteSettings } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizePlainText } from '../common/sanitize';
import { UpdateSettingsDto } from './dto';

/** Fixed id, so the singleton is addressed rather than discovered. */
const SINGLETON = 'singleton';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Upsert rather than findUnique: a fresh database that has run migrations but
   * not the seed would otherwise 404 the public site's settings fetch, which
   * would blank the footer email and the WhatsApp button.
   */
  async get(): Promise<SiteSettings> {
    return this.prisma.siteSettings.upsert({
      where: { id: SINGLETON },
      update: {},
      create: {
        id: SINGLETON,
        whatsappNumber: '',
        whatsappMessage: '',
        contactEmail: '',
      },
    });
  }

  /** Only what the public site needs. Never returns updatedById. */
  async getPublic() {
    const s = await this.get();
    return {
      whatsappNumber: s.whatsappNumber,
      whatsappMessage: s.whatsappMessage,
      contactEmail: s.contactEmail,
    };
  }

  async update(dto: UpdateSettingsDto, adminId: string): Promise<SiteSettings> {
    await this.get();
    const data: Record<string, string> = {};
    if (dto.whatsappNumber !== undefined) data.whatsappNumber = sanitizePlainText(dto.whatsappNumber);
    if (dto.whatsappMessage !== undefined) data.whatsappMessage = sanitizePlainText(dto.whatsappMessage);
    if (dto.contactEmail !== undefined) data.contactEmail = sanitizePlainText(dto.contactEmail);

    const updated = await this.prisma.siteSettings.update({
      where: { id: SINGLETON },
      data: { ...data, updatedById: adminId },
    });
    await this.prisma.auditLog.create({
      data: {
        entityType: 'SiteSettings', entityId: SINGLETON, action: 'updated',
        actorId: adminId, summary: Object.keys(data).join(', ') || 'no change',
      },
    });
    return updated;
  }
}
