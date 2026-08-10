import { Injectable } from '@nestjs/common';
import { EnquiryStatus, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * Every number here is a count query. Nothing is derived from a constant, a
   * sample or a "this month so far" estimate.
   *
   * The reference mockup carried an "Exports This Month" card. Nothing in this
   * schema tracks an export, a shipment or a dispatch, so that card could only
   * ever have been a fabricated number on a tool whose whole job is trustworthy
   * status. It is replaced by OPEN ENQUIRIES - leads not yet closed - which the
   * Enquiry table can actually answer and which is the one number on this page
   * that represents work waiting to be done.
   *
   * Open, not "new in 30 days": the bell already counts NEW, and a second card
   * repeating it would be decoration. Open spans NEW and CONTACTED, so it says
   * how much is in flight rather than how much just arrived.
   */
  async stats() {
    const [totalProducts, publishedProducts, unverifiedProducts, openEnquiries, newEnquiries] =
      await Promise.all([
        this.prisma.product.count(),
        this.prisma.product.count({ where: { status: ProductStatus.PUBLISHED } }),
        // "At least one certification claim that cannot be evidenced." Counted
        // over PRODUCTS, not certification rows, because the operator acts on a
        // product. `some` compiles to EXISTS, so a product with three
        // unverifiable claims still counts once.
        this.prisma.product.count({ where: { certifications: { some: { verifiable: false } } } }),
        this.prisma.enquiry.count({ where: { status: { not: EnquiryStatus.CLOSED } } }),
        this.prisma.enquiry.count({ where: { status: EnquiryStatus.NEW } }),
      ]);

    return { totalProducts, publishedProducts, unverifiedProducts, openEnquiries, newEnquiries };
  }

  /**
   * The bell. Real rows, never a badge constant - the count and the list come
   * from the same query, so they cannot disagree.
   */
  async notifications() {
    const rows = await this.prisma.enquiry.findMany({
      where: { status: EnquiryStatus.NEW },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, name: true, message: true, createdAt: true },
    });
    const count = await this.prisma.enquiry.count({ where: { status: EnquiryStatus.NEW } });
    return {
      count,
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        // Snippet, not the whole message: this is a peek that decides whether to
        // open the enquiry, not a reading surface.
        snippet: r.message.length > 90 ? r.message.slice(0, 90).trimEnd() + '…' : r.message,
        createdAt: r.createdAt,
      })),
    };
  }

  /**
   * AuditLog has been written to since Phase 1a and read by nothing. Surfacing
   * the last few entries costs one query and answers "what changed recently"
   * without a chart, a library or a new table.
   */
  async activity() {
    const rows = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { actor: { select: { name: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      entityType: r.entityType,
      action: r.action,
      summary: r.summary,
      actor: r.actor?.name ?? null,
      createdAt: r.createdAt,
    }));
  }
}
