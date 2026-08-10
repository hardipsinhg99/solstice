-- Phase 1b: one media system.
--
-- Ordering matters here and the generated diff had it wrong. Prisma wanted to
-- DROP products.image before media_assets existed, which would have destroyed
-- the six seeded Unsplash URLs. This migration creates the new tables first,
-- copies every non-null products.image into a MediaAsset row marked EXTERNAL,
-- points products.primaryImageId at it, and only then drops the old column.
--
-- EXTERNAL is what keeps StorageService honest: those rows are URLs we merely
-- reference, so a delete must never try to unlink a file for them.

-- CreateEnum
CREATE TYPE "StorageDriver" AS ENUM ('LOCAL', 'EXTERNAL');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "primaryImageId" TEXT;

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "driver" "StorageDriver" NOT NULL DEFAULT 'LOCAL',
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "altText" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_media" (
    "productId" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("productId","mediaAssetId")
);

-- CreateIndex
CREATE INDEX "product_media_productId_order_idx" ON "product_media"("productId", "order");

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_primaryImageId_fkey" FOREIGN KEY ("primaryImageId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- ── Data migration: products.image -> MediaAsset(EXTERNAL) ──────────────────
-- Dimensions are recorded as 0: these are remote Unsplash URLs whose intrinsic
-- size this migration cannot measure without a network call. Nothing reads them
-- for external assets - the public site passes the URL through the existing
-- unsplashAt()/unsplashSrcSet() helpers exactly as before.
INSERT INTO "media_assets" ("id", "filename", "storagePath", "driver", "url", "mimeType", "width", "height", "sizeBytes", "altText", "createdAt")
SELECT
  'seed_img_' || p."id",
  p."slug" || ' (external)',
  p."image",
  'EXTERNAL',
  p."image",
  'image/jpeg',
  0, 0, 0,
  p."name",
  CURRENT_TIMESTAMP
FROM "products" p
WHERE p."image" IS NOT NULL AND p."image" <> '';

UPDATE "products" p
SET "primaryImageId" = 'seed_img_' || p."id"
WHERE p."image" IS NOT NULL AND p."image" <> '';

-- Only now is the column safe to remove.
ALTER TABLE "products" DROP COLUMN "image";
