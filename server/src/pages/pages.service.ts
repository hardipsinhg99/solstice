import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizePlainText, sanitizeRichOptional } from '../common/sanitize';

/**
 * Section data is Json, so it is sanitized by walking it rather than field by
 * field. Every string is cleaned; which cleaner it gets is decided by the key,
 * because the shape is per-type and the server does not carry the field config.
 *
 * The rich-text keys are named explicitly. A default of "sanitize everything as
 * rich text" would let markup through into a plain field the day somebody adds
 * one, so the safe direction is the default and rich text is the exception.
 */
const RICH_KEYS = new Set(['body', 'bio']);

function clean(value: unknown, key?: string): unknown {
  if (Array.isArray(value)) return value.map((v) => clean(v));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v, k)]));
  }
  if (typeof value === 'string') {
    return key && RICH_KEYS.has(key) ? (sanitizeRichOptional(value) ?? '') : sanitizePlainText(value);
  }
  // Numbers and booleans pass through - a toggle or a stat value is not markup.
  return value;
}

@Injectable()
export class PagesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Public read. PUBLISHED pages only, and each section returns publishedData -
   * never draftData. This is the whole draft/publish contract in two lines: an
   * unpublished edit is not merely hidden by the UI, it is not in the response.
   */
  async findPublic(slug: string) {
    const page = await this.prisma.page.findFirst({
      where: { slug, status: ProductStatus.PUBLISHED },
      include: { sections: { orderBy: { order: 'asc' } } },
    });
    if (!page) return null;
    return {
      slug: page.slug,
      title: page.title,
      sections: page.sections
        // A section that has never been published has nothing to show. It is
        // omitted rather than rendered empty.
        .filter((s) => s.publishedData !== null)
        .map((s) => ({ key: s.key, type: s.type, data: s.publishedData })),
    };
  }

  async findAdmin(slug: string) {
    const page = await this.prisma.page.findUnique({
      where: { slug },
      include: { sections: { orderBy: { order: 'asc' } }, updatedBy: { select: { name: true } } },
    });
    if (!page) throw new NotFoundException(`No page with slug "${slug}"`);
    return {
      ...page,
      sections: page.sections.map((s) => ({
        ...s,
        // Computed, not stored: a stored flag is one more thing that can drift
        // out of step with the two payloads it is supposed to describe.
        hasUnpublishedChanges:
          s.publishedData === null || JSON.stringify(s.draftData) !== JSON.stringify(s.publishedData),
      })),
    };
  }

  listAdmin() {
    return this.prisma.page.findMany({ orderBy: { title: 'asc' } });
  }

  /** Saves a draft. Never touches publishedData - that is what Publish is for. */
  async saveSection(slug: string, key: string, data: unknown, adminId: string) {
    const page = await this.requirePage(slug);
    const section = await this.prisma.pageSection.findUnique({
      where: { pageId_key: { pageId: page.id, key } },
    });
    if (!section) throw new NotFoundException(`No section "${key}" on page "${slug}"`);

    const updated = await this.prisma.pageSection.update({
      where: { id: section.id },
      data: { draftData: clean(data) as Prisma.InputJsonValue, updatedById: adminId },
    });
    await this.audit(page.id, 'page.section.saved', adminId, `${page.title} — ${key}`);
    return updated;
  }

  /**
   * Publish the page: every section's draft becomes its published copy, and the
   * page itself goes PUBLISHED. All-or-nothing per page, in a transaction -
   * publishing half a page is not a state anybody asked for.
   */
  async publish(slug: string, adminId: string) {
    const page = await this.requirePage(slug);
    const sections = await this.prisma.pageSection.findMany({ where: { pageId: page.id } });

    await this.prisma.$transaction([
      ...sections.map((s) =>
        this.prisma.pageSection.update({
          where: { id: s.id },
          data: { publishedData: s.draftData as Prisma.InputJsonValue },
        }),
      ),
      this.prisma.page.update({
        where: { id: page.id },
        data: { status: ProductStatus.PUBLISHED, publishedAt: new Date(), updatedById: adminId },
      }),
    ]);
    await this.audit(page.id, 'published', adminId, page.title);
    return this.findAdmin(slug);
  }

  /** Takes the whole page off the public site. Drafts are untouched. */
  async unpublish(slug: string, adminId: string) {
    const page = await this.requirePage(slug);
    await this.prisma.page.update({
      where: { id: page.id },
      data: { status: ProductStatus.DRAFT, updatedById: adminId },
    });
    await this.audit(page.id, 'unpublished', adminId, page.title);
    return this.findAdmin(slug);
  }

  /** Throws away unpublished edits and returns the draft to what is live. */
  async discardDraft(slug: string, adminId: string) {
    const page = await this.requirePage(slug);
    const sections = await this.prisma.pageSection.findMany({ where: { pageId: page.id } });
    await this.prisma.$transaction(
      sections
        .filter((s) => s.publishedData !== null)
        .map((s) =>
          this.prisma.pageSection.update({
            where: { id: s.id },
            data: { draftData: s.publishedData as Prisma.InputJsonValue },
          }),
        ),
    );
    await this.audit(page.id, 'page.draft.discarded', adminId, page.title);
    return this.findAdmin(slug);
  }

  private async requirePage(slug: string) {
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException(`No page with slug "${slug}"`);
    return page;
  }

  /** The same AuditLog the dashboard's activity feed reads. No second log. */
  private audit(entityId: string, action: string, actorId: string, summary?: string) {
    return this.prisma.auditLog.create({
      data: { entityType: 'Page', entityId, action, actorId, summary },
    });
  }
}
