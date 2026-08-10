import { Injectable, NotFoundException } from '@nestjs/common';
import { Enquiry, EnquiryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizePlainText } from '../common/sanitize';
import { MailService } from './mail.service';
import { CreateEnquiryDto } from './dto';

@Injectable()
export class EnquiriesService {
  constructor(private prisma: PrismaService, private mail: MailService) {}

  /**
   * Persist first, notify second, and never let the notification fail the
   * submission. The lead is the asset; the email is a convenience.
   */
  async create(dto: CreateEnquiryDto): Promise<{ id: string; received: true }> {
    // Honeypot tripped: report success and store nothing. A bot that is told it
    // failed simply retries with the field cleared.
    if (dto.company_website && dto.company_website.trim() !== '') {
      return { id: 'discarded', received: true };
    }

    const enquiry = await this.prisma.enquiry.create({
      data: {
        name: sanitizePlainText(dto.name),
        email: sanitizePlainText(dto.email).toLowerCase(),
        phone: sanitizePlainText(dto.phone),
        message: sanitizePlainText(dto.message),
        consentAt: dto.consent ? new Date() : null,
      },
    });

    const notified = await this.mail.sendEnquiryNotification(enquiry);
    if (notified) {
      await this.prisma.enquiry.update({ where: { id: enquiry.id }, data: { notifiedAt: new Date() } });
    }

    // The buyer is told the enquiry was received either way, because it was.
    return { id: enquiry.id, received: true };
  }

  findAll(search?: string, status?: EnquiryStatus): Promise<Enquiry[]> {
    return this.prisma.enquiry.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { message: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setStatus(id: string, status: EnquiryStatus, adminId: string): Promise<Enquiry> {
    await this.require(id);
    const updated = await this.prisma.enquiry.update({ where: { id }, data: { status } });
    await this.audit(id, `status.${status.toLowerCase()}`, adminId, updated.name);
    return updated;
  }

  async remove(id: string, adminId: string) {
    const enquiry = await this.require(id);
    await this.prisma.enquiry.delete({ where: { id } });
    await this.audit(id, 'deleted', adminId, enquiry.name);
    return { id, deleted: true };
  }

  private async require(id: string): Promise<Enquiry> {
    const enquiry = await this.prisma.enquiry.findUnique({ where: { id } });
    if (!enquiry) throw new NotFoundException('Enquiry not found');
    return enquiry;
  }

  private audit(entityId: string, action: string, actorId: string, summary?: string) {
    return this.prisma.auditLog.create({
      data: { entityType: 'Enquiry', entityId, action, actorId, summary },
    });
  }
}
