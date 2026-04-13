-- AlterTable: Tenant billing maydonlari
ALTER TABLE "Tenant" ADD COLUMN "balance" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN "tariffId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "isTrial" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: Tariff
CREATE TABLE "Tariff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pricePerMonth" REAL NOT NULL DEFAULT 0,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "maxUsers" INTEGER NOT NULL DEFAULT 10,
    "maxBranches" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable: BalanceLog
CREATE TABLE "BalanceLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "logType" TEXT NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BalanceLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: PlatformSettings
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Tariff_isActive_idx" ON "Tariff"("isActive");
CREATE INDEX "Tariff_sortOrder_idx" ON "Tariff"("sortOrder");
CREATE INDEX "BalanceLog_tenantId_idx" ON "BalanceLog"("tenantId");
CREATE INDEX "BalanceLog_tenantId_createdAt_idx" ON "BalanceLog"("tenantId", "createdAt");
CREATE UNIQUE INDEX "PlatformSettings_key_key" ON "PlatformSettings"("key");

-- ForeignKey: Tenant -> Tariff
CREATE INDEX "Tenant_tariffId_idx" ON "Tenant"("tariffId");

-- Default platform settings (karta, telegram, telefon)
INSERT INTO "PlatformSettings" ("id", "key", "value", "updatedAt") VALUES
  ('ps_card_number', 'card_number', '8600 0000 0000 0000', CURRENT_TIMESTAMP),
  ('ps_card_owner',  'card_owner',  'Karta egasi',         CURRENT_TIMESTAMP),
  ('ps_tg_username', 'tg_username', 'chaqqon_support',     CURRENT_TIMESTAMP),
  ('ps_phone',       'phone',       '+998 99 000 00 00',   CURRENT_TIMESTAMP),
  ('ps_phone_raw',   'phone_raw',   '+998990000000',        CURRENT_TIMESTAMP);
