import { Injectable } from '@nestjs/common';
import { EnquiryStatus, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isBracketPlaceholder, isPlaceholder } from '../common/placeholder';

/** Field name -> the label an operator sees on the settings form. */
const SETTINGS_FIELDS: Array<{ key: 'whatsappNumber' | 'whatsappMessage' | 'contactEmail' | 'contactPhone'; label: string }> = [
  { key: 'whatsappNumber', label: 'WhatsApp number' },
  { key: 'whatsappMessage', label: 'WhatsApp pre-filled message' },
  { key: 'contactEmail', label: 'Public enquiry email' },
];

/**
 * Walks a section's JSON looking for the `unresolvedCopy` / `unresolvedScope`
 * flags the page editor writes onto placeholder content (see
 * sectionTypes.js). The shape differs per section type, so this recurses
 * through arrays and objects rather than assuming a fixed structure.
 */
function findUnresolvedFlags(node: unknown, path: string[] = []): string[] {
  if (Array.isArray(node)) {
    return node.flatMap((item, i) => findUnresolvedFlags(item, [...path, String(i)]));
  }
  if (node && typeof node === 'object') {
    const hits: string[] = [];
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if ((key === 'unresolvedCopy' || key === 'unresolvedScope') && value === true) {
        hits.push(path.join('.') || 'section');
      } else {
        hits.push(...findUnresolvedFlags(value, [...path, key]));
      }
    }
    return hits;
  }
  return [];
}

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
   * Settings fields still carrying the seeded bracket placeholder, or left
   * empty where emptiness is not a valid configured state. contactPhone is
   * deliberately excluded from the emptiness check - "Leave empty to show no
   * phone number at all" is documented, legitimate configuration for that one
   * field, so it is only flagged if it still holds a literal bracket marker.
   */
  async placeholderSettings() {
    const settings = await this.prisma.siteSettings.findUnique({ where: { id: 'singleton' } });
    if (!settings) return [];
    const flagged = SETTINGS_FIELDS.filter(({ key }) => isPlaceholder(settings[key]));
    if (isBracketPlaceholder(settings.contactPhone)) {
      flagged.push({ key: 'contactPhone', label: 'Public phone number' });
    }
    return flagged.map(({ key, label }) => ({ field: key, label }));
  }

  /**
   * Page sections still flagged unresolvedCopy/unresolvedScope in their LIVE
   * (published) content - what a buyer can read right now, not the draft. One
   * row per page, listing which sections, so the banner can link straight to
   * the editor rather than making an admin hunt for it.
   */
  async unresolvedPageSections() {
    const pages = await this.prisma.page.findMany({
      select: {
        slug: true,
        title: true,
        sections: { select: { key: true, publishedData: true } },
      },
    });
    return pages
      .map((page) => ({
        slug: page.slug,
        title: page.title,
        sections: page.sections
          .filter((s) => findUnresolvedFlags(s.publishedData).length > 0)
          .map((s) => s.key),
      }))
      .filter((page) => page.sections.length > 0);
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
