import DOMPurify from 'isomorphic-dompurify';

// Server-side sanitization is the baseline from Phase 1a, not a Phase 2 addition,
// even though no field accepts rich text yet. Sanitizing only at render leaves
// hostile content sitting in the database for the next consumer to forget about
// - and the next consumer here is a public marketing site.
//
// Phase 1a stores plain text only, so the allowlist is empty: every tag is
// stripped rather than escaped. When TipTap arrives with Pages, rich-text fields
// get a second function with an explicit tag allowlist; this one stays as-is.
export function sanitizePlainText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

export function sanitizeOptional(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const clean = sanitizePlainText(value);
  return clean === '' ? null : clean;
}
