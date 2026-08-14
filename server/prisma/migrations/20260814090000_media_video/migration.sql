-- Video support on MediaAsset.
--
-- Every default is chosen so that applying this changes nothing about existing
-- rows: kind IMAGE, status READY. Products, team photos and gallery images all
-- keep their exact current behaviour without a backfill.
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO');
CREATE TYPE "MediaStatus" AS ENUM ('QUEUED', 'PROCESSING', 'READY', 'FAILED');

ALTER TABLE "media_assets" ADD COLUMN "kind" "MediaKind" NOT NULL DEFAULT 'IMAGE';
ALTER TABLE "media_assets" ADD COLUMN "status" "MediaStatus" NOT NULL DEFAULT 'READY';
ALTER TABLE "media_assets" ADD COLUMN "failureReason" TEXT;
ALTER TABLE "media_assets" ADD COLUMN "durationSeconds" INTEGER;
ALTER TABLE "media_assets" ADD COLUMN "posterAssetId" TEXT;

-- SET NULL, not CASCADE: deleting a poster must never silently delete the video
-- it belonged to. The video is the asset with value; a missing poster degrades
-- to a black first frame, which is recoverable.
ALTER TABLE "media_assets"
  ADD CONSTRAINT "media_assets_posterAssetId_fkey"
  FOREIGN KEY ("posterAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "media_assets_status_idx" ON "media_assets"("status");
