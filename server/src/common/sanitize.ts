import DOMPurify from 'isomorphic-dompurify';

// Server-side sanitization is the baseline from Phase 1a, not a Phase 2 addition,
// even though no field accepts rich text yet. Sanitizing only at render leaves
// hostile content sitting in the database for the next consumer to forget about
// - and the next consumer here is a public marketing site.
//
// Phase 1a stores plain text only, so the allowlist is empty: every tag is
// stripped rather than escaped. TipTap arrived with Pages in Phase 1e and got
// sanitizeRichText below - a second function with an explicit tag allowlist,
// exactly as planned. This one stays as-is.
export function sanitizePlainText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

export function sanitizeOptional(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const clean = sanitizePlainText(value);
  return clean === '' ? null : clean;
}

/**
 * Rich text from TipTap. An ALLOWLIST, never a blocklist: the set of things that
 * can execute script in an HTML document is open-ended and grows with every
 * browser release, so the only defensible position is to name what is permitted
 * and drop the rest.
 *
 * <script>, <style>, <iframe>, <object>, every on* handler and every
 * javascript: URL fall outside this list and are therefore removed - not
 * escaped, removed. The editor cannot produce them either, but the editor is a
 * convenience and this is the control: the endpoint accepts whatever is POSTed
 * to it, and an attacker POSTs directly.
 */
const RICH_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'a',
  'ul', 'ol', 'li', 'blockquote', 'h2', 'h3', 'h4', 'code', 'pre', 'img', 'figure', 'figcaption',
];

export function sanitizeRichText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: RICH_TAGS,
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height'],
    // Anything that is not http(s), mailto or a same-origin path is dropped.
    // This is what stops javascript: and data: URIs in an href or an src.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|[/#])/i,
  }).trim();
}

export function sanitizeRichOptional(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const clean = sanitizeRichText(value);
  return clean === '' ? null : clean;
}
