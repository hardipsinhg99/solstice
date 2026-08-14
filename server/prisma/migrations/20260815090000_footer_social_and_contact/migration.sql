-- Footer contact rows: enable flags and optional labels.
-- Enabled defaults to TRUE so applying this changes nothing about a site that
-- already shows its email and phone. The flag is a separate question from the
-- value being empty: empty means unconfigured, disabled means deliberately
-- withheld, and collapsing the two would make hiding a number destroy it.
ALTER TABLE "site_settings"
  ADD COLUMN "contactPhoneEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "contactEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "contactPhoneLabel"   TEXT    NOT NULL DEFAULT '',
  ADD COLUMN "contactEmailLabel"   TEXT    NOT NULL DEFAULT '';

-- Social profiles. A table rather than more singleton columns because this is an
-- ordered collection with per-row enable - the same call already made for
-- gallery images and team members.
CREATE TABLE "social_links" (
  "id"          TEXT NOT NULL,
  "platform"    TEXT NOT NULL,
  "url"         TEXT NOT NULL DEFAULT '',
  "enabled"     BOOLEAN NOT NULL DEFAULT false,
  "order"       INTEGER NOT NULL DEFAULT 0,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  "updatedById" TEXT,
  CONSTRAINT "social_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "social_links_platform_key" ON "social_links"("platform");
CREATE INDEX "social_links_enabled_order_idx" ON "social_links"("enabled", "order");

ALTER TABLE "social_links"
  ADD CONSTRAINT "social_links_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the four supported platforms, all DISABLED with empty URLs. Enabling them
-- here would publish four dead links the instant this migration ran; the
-- operator turns each on once a real profile URL exists. WhatsApp is ordered
-- first because it is the channel this business actually answers on.
INSERT INTO "social_links" ("id", "platform", "url", "enabled", "order", "updatedAt") VALUES
  ('seed_social_whatsapp',  'whatsapp',  '', false, 0, NOW()),
  ('seed_social_facebook',  'facebook',  '', false, 1, NOW()),
  ('seed_social_instagram', 'instagram', '', false, 2, NOW()),
  ('seed_social_linkedin',  'linkedin',  '', false, 3, NOW());
