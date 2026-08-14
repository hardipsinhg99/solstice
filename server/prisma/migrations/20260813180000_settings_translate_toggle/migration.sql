-- Google Translate widget toggle.
--
-- DEFAULT true: every existing row keeps the widget, so applying this changes
-- nothing about a live site. Turning it off is the deliberate act.
ALTER TABLE "site_settings" ADD COLUMN "translateEnabled" BOOLEAN NOT NULL DEFAULT true;
