-- CreateEnum
CREATE TYPE "TradeDirection" AS ENUM ('EXPORT', 'IMPORT');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "Incoterm" AS ENUM ('EXW', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trade" "TradeDirection" NOT NULL DEFAULT 'EXPORT',
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "type" TEXT NOT NULL,
    "image" TEXT,
    "description" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "packaging" TEXT NOT NULL,
    "placeholder" BOOLEAN NOT NULL DEFAULT false,
    "hsCode" TEXT,
    "incoterms" "Incoterm"[],
    "moqValue" DECIMAL(10,2),
    "moqUnit" TEXT,
    "shelfLifeDays" INTEGER,
    "storageTempC" TEXT,
    "storageHumidity" TEXT,
    "portsOfLoading" TEXT[],
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_varieties" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grade" TEXT,
    "calibreMin" INTEGER,
    "calibreMax" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "updatedById" TEXT,

    CONSTRAINT "product_varieties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_pack_options" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "cartonWeightKg" DECIMAL(6,2) NOT NULL,
    "cartonsPerPallet" INTEGER,
    "palletsPerReefer" INTEGER,
    "cartonsPerReefer" INTEGER,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "updatedById" TEXT,

    CONSTRAINT "product_pack_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_certifications" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "verifiable" BOOLEAN NOT NULL DEFAULT false,
    "reference" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "updatedById" TEXT,

    CONSTRAINT "product_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_trade_status_idx" ON "products"("trade", "status");

-- CreateIndex
CREATE INDEX "product_varieties_productId_order_idx" ON "product_varieties"("productId", "order");

-- CreateIndex
CREATE INDEX "product_pack_options_productId_order_idx" ON "product_pack_options"("productId", "order");

-- CreateIndex
CREATE INDEX "product_certifications_productId_order_idx" ON "product_certifications"("productId", "order");

-- CreateIndex
CREATE INDEX "audit_log_entityType_entityId_createdAt_idx" ON "audit_log"("entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_varieties" ADD CONSTRAINT "product_varieties_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_varieties" ADD CONSTRAINT "product_varieties_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_pack_options" ADD CONSTRAINT "product_pack_options_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_pack_options" ADD CONSTRAINT "product_pack_options_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_certifications" ADD CONSTRAINT "product_certifications_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_certifications" ADD CONSTRAINT "product_certifications_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
