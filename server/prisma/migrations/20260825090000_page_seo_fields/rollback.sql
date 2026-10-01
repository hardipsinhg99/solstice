-- Rollback for 20260825090000_page_seo_fields.
--
-- Prisma has no down-migrations, so this is the hand-run reverse. It is almost
-- never the right move: both columns are nullable and additive, so the PREVIOUS
-- application version runs against the migrated database untouched (rehearsed:
-- the pre-Part 2 API image boots and serves against this schema). Reverting the
-- container is therefore the rollback, and it needs no SQL at all.
--
-- This file exists for the one case that does need it: abandoning the feature.
-- It DESTROYS every per-page SEO title and description an editor has written.
--
--   docker compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
--     -f /path/to/rollback.sql
--
-- Take a dump first:
--   docker compose exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > before-rollback.sql
ALTER TABLE "pages"
  DROP COLUMN IF EXISTS "seoTitle",
  DROP COLUMN IF EXISTS "seoDescription";

DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260825090000_page_seo_fields';
