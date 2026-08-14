-- A public phone number for the contact page and the footer.
-- DEFAULT '' so applying this changes nothing: an empty string renders nothing.
ALTER TABLE "site_settings" ADD COLUMN "contactPhone" TEXT NOT NULL DEFAULT '';

-- Backfill from whatsappNumber so the number appears without an operator having
-- to retype it. Guarded to exactly 10 digits, which is an Indian mobile, and
-- formatted +91 XXXXX XXXXX - the grouping the number is normally read in.
-- Anything else is left empty rather than mangled into a wrong number, and the
-- admin form can correct either outcome.
UPDATE "site_settings"
   SET "contactPhone" = '+91 ' || substr("whatsappNumber", 1, 5) || ' ' || substr("whatsappNumber", 6)
 WHERE "contactPhone" = ''
   AND "whatsappNumber" ~ '^[0-9]{10}$';
