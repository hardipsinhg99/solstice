-- Per-page search metadata, mirroring the columns Product already carries.
-- Nullable with no backfill on purpose: a guessed description ships to search
-- results looking authored, and a field that looks filled never gets reviewed.
-- Empty falls back to the page title plus a site suffix at render time.
ALTER TABLE "pages"
  ADD COLUMN "seoTitle"       TEXT,
  ADD COLUMN "seoDescription" TEXT;
