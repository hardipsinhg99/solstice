/**
 * Mirrors src/lib/placeholder.js on the public bundle. Seed data across this
 * project marks anything not yet real with a bracketed marker -
 * "[WHATSAPP_NUMBER]", "[CONFIRM]", "[REWRITE]", "[VERIFY]" - rather than
 * leaving the field empty, so a plain emptiness check misses it. Used here to
 * build the dashboard's placeholder banner, not to validate input - the DTOs
 * already do that.
 */
const BRACKET_PATTERN = /^\[[A-Z_]+\]$/;

export function isPlaceholder(value: unknown): boolean {
  const s = String(value ?? '').trim();
  return s === '' || BRACKET_PATTERN.test(s);
}

/** Narrower than isPlaceholder: only the bracketed marker, not plain emptiness. */
export function isBracketPlaceholder(value: unknown): boolean {
  return BRACKET_PATTERN.test(String(value ?? '').trim());
}
