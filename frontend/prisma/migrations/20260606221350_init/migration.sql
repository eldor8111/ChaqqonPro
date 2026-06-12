/*
  Warnings:

  - You are about to drop the `HorecaReservation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HorecaTable` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "HorecaReservation_tenantId_idx";

-- DropIndex
DROP INDEX "HorecaTable_tenantId_tableNumber_key";

-- DropIndex
DROP INDEX "HorecaTable_tenantId_idx";

-- AlterTable
ALTER TABLE "InventoryReceipt" ADD COLUMN "costPriceUzs" REAL DEFAULT 0;
ALTER TABLE "InventoryReceipt" ADD COLUMN "currency" TEXT DEFAULT 'UZS';
ALTER TABLE "InventoryReceipt" ADD COLUMN "documentId" TEXT;
ALTER TABLE "InventoryReceipt" ADD COLUMN "invoiceNo" TEXT;
ALTER TABLE "InventoryReceipt" ADD COLUMN "totalCostUzs" REAL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "autoCalculate" INTEGER DEFAULT 1;
ALTER TABLE "Product" ADD COLUMN "hasBarcode" INTEGER DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "image" TEXT;
ALTER TABLE "Product" ADD COLUMN "inStock" INTEGER DEFAULT 1;
ALTER TABLE "Product" ADD COLUMN "isSetMenu" INTEGER DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "modifiers" TEXT;
ALTER TABLE "Product" ADD COLUMN "printerIp" TEXT;
ALTER TABLE "Product" ADD COLUMN "recipes" TEXT;
ALTER TABLE "Product" ADD COLUMN "type" TEXT DEFAULT 'taom';
ALTER TABLE "Product" ADD COLUMN "warehouse" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "HorecaReservation";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "HorecaTable";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "PlatformUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "agentCode" TEXT,
    "passwordHash" TEXT NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SmartPrinter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 9100,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SmartTable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "tableNumber" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "section" TEXT NOT NULL DEFAULT 'Main',
    "order" TEXT,
    "amount" REAL NOT NULL DEFAULT 0,
    "since" TEXT,
    "waiter" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SmartTable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SmartReservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "guestCount" INTEGER NOT NULL,
    "reservationTime" DATETIME NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SmartReservation_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "SmartTable" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SmartReservation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KassiHarakat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT 'Naqd pul',
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "kontragent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refId" TEXT,
    CONSTRAINT "KassiHarakat_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliveryOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "courierId" TEXT,
    "courierName" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT 'Naqd pul',
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" DATETIME,
    CONSTRAINT "DeliveryOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SmartRecommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "triggerProductId" TEXT,
    "triggerCategoryId" TEXT,
    "recommendProductId" TEXT NOT NULL,
    "recommendProductName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "badgeText" TEXT NOT NULL DEFAULT 'Tavsiya',
    "badgeColor" TEXT NOT NULL DEFAULT 'blue',
    "discountType" TEXT NOT NULL DEFAULT 'none',
    "discountValue" REAL NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "showAlways" BOOLEAN NOT NULL DEFAULT false,
    "minCartAmount" REAL NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "conversionCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SmartRecommendation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "staffRole" TEXT NOT NULL,
    "checkInTime" DATETIME NOT NULL,
    "checkOutTime" DATETIME,
    "workDuration" INTEGER,
    "breakDuration" INTEGER NOT NULL DEFAULT 0,
    "checkInLocation" TEXT,
    "checkOutLocation" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "ipAddress" TEXT,
    "deviceInfo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Attendance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PotentialClient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentCode" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "nextContactDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UbtCategory" (
    "id" TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'taom',
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL DEFAULT 'datetime(''now'')'
);

-- CreateTable
CREATE TABLE "UbtIngredient" (
    "id" TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "stock" REAL NOT NULL DEFAULT 0,
    "price" REAL NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT 'xomashyo',
    "categoryId" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT 'datetime(''now'')'
);

-- CreateTable
CREATE TABLE "UbtSupplier" (
    "id" TEXT PRIMARY KEY DEFAULT 'lower(hex(randomblob(8)))',
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "info" TEXT,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT DEFAULT 'UZS'
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KDSOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "KDSOrder_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "SmartTable" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KDSOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_KDSOrder" ("completedAt", "createdAt", "description", "id", "priority", "status", "tableId", "tenantId") SELECT "completedAt", "createdAt", "description", "id", "priority", "status", "tableId", "tenantId" FROM "KDSOrder";
DROP TABLE "KDSOrder";
ALTER TABLE "new_KDSOrder" RENAME TO "KDSOrder";
CREATE INDEX "KDSOrder_tenantId_idx" ON "KDSOrder"("tenantId");
CREATE INDEX "KDSOrder_tableId_idx" ON "KDSOrder"("tableId");
CREATE TABLE "new_Staff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "permissions" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "printerIp" TEXT NOT NULL DEFAULT '',
    "staffMeta" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL,
    "sales" REAL NOT NULL DEFAULT 0,
    "transactions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Staff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Staff" ("branch", "createdAt", "id", "name", "passwordHash", "permissions", "phone", "role", "sales", "status", "tenantId", "transactions", "username") SELECT "branch", "createdAt", "id", "name", "passwordHash", "permissions", "phone", "role", "sales", "status", "tenantId", "transactions", "username" FROM "Staff";
DROP TABLE "Staff";
ALTER TABLE "new_Staff" RENAME TO "Staff";
CREATE UNIQUE INDEX "Staff_username_key" ON "Staff"("username");
CREATE INDEX "Staff_tenantId_idx" ON "Staff"("tenantId");
CREATE INDEX "Staff_tenantId_status_idx" ON "Staff"("tenantId", "status");
CREATE INDEX "Staff_username_status_idx" ON "Staff"("username", "status");
CREATE TABLE "new_Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopCode" TEXT NOT NULL,
    "billingId" TEXT,
    "shopName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "adminUsername" TEXT NOT NULL,
    "adminPasswordHash" TEXT NOT NULL,
    "settings" TEXT,
    "agentCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "balance" REAL NOT NULL DEFAULT 0,
    "tariffId" TEXT,
    "isTrial" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Tenant_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "Tariff" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Tenant" ("address", "adminPasswordHash", "adminUsername", "balance", "createdAt", "email", "expiresAt", "id", "isTrial", "ownerName", "phone", "plan", "settings", "shopCode", "shopName", "status", "tariffId") SELECT "address", "adminPasswordHash", "adminUsername", "balance", "createdAt", "email", "expiresAt", "id", "isTrial", "ownerName", "phone", "plan", "settings", "shopCode", "shopName", "status", "tariffId" FROM "Tenant";
DROP TABLE "Tenant";
ALTER TABLE "new_Tenant" RENAME TO "Tenant";
CREATE UNIQUE INDEX "Tenant_shopCode_key" ON "Tenant"("shopCode");
CREATE UNIQUE INDEX "Tenant_billingId_key" ON "Tenant"("billingId");
CREATE INDEX "Tenant_adminUsername_idx" ON "Tenant"("adminUsername");
CREATE INDEX "Tenant_phone_idx" ON "Tenant"("phone");
CREATE INDEX "Tenant_agentCode_idx" ON "Tenant"("agentCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PlatformUser_phone_key" ON "PlatformUser"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformUser_agentCode_key" ON "PlatformUser"("agentCode");

-- CreateIndex
CREATE INDEX "SmartPrinter_tenantId_idx" ON "SmartPrinter"("tenantId");

-- CreateIndex
CREATE INDEX "SmartTable_tenantId_idx" ON "SmartTable"("tenantId");

-- CreateIndex
CREATE INDEX "SmartTable_tenantId_status_idx" ON "SmartTable"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SmartTable_tenantId_section_tableNumber_key" ON "SmartTable"("tenantId", "section", "tableNumber");

-- CreateIndex
CREATE INDEX "SmartReservation_tenantId_idx" ON "SmartReservation"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "KassiHarakat_tenantId_idx" ON "KassiHarakat"("tenantId");

-- CreateIndex
CREATE INDEX "KassiHarakat_type_idx" ON "KassiHarakat"("type");

-- CreateIndex
CREATE INDEX "DeliveryOrder_tenantId_idx" ON "DeliveryOrder"("tenantId");

-- CreateIndex
CREATE INDEX "DeliveryOrder_status_idx" ON "DeliveryOrder"("status");

-- CreateIndex
CREATE INDEX "SmartRecommendation_tenantId_idx" ON "SmartRecommendation"("tenantId");

-- CreateIndex
CREATE INDEX "SmartRecommendation_triggerProductId_idx" ON "SmartRecommendation"("triggerProductId");

-- CreateIndex
CREATE INDEX "SmartRecommendation_triggerCategoryId_idx" ON "SmartRecommendation"("triggerCategoryId");

-- CreateIndex
CREATE INDEX "SmartRecommendation_isActive_priority_idx" ON "SmartRecommendation"("isActive", "priority");

-- CreateIndex
CREATE INDEX "SmartRecommendation_tenantId_isActive_idx" ON "SmartRecommendation"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "Attendance_tenantId_idx" ON "Attendance"("tenantId");

-- CreateIndex
CREATE INDEX "Attendance_staffId_idx" ON "Attendance"("staffId");

-- CreateIndex
CREATE INDEX "Attendance_tenantId_staffId_idx" ON "Attendance"("tenantId", "staffId");

-- CreateIndex
CREATE INDEX "Attendance_checkInTime_idx" ON "Attendance"("checkInTime");

-- CreateIndex
CREATE INDEX "Attendance_tenantId_checkInTime_idx" ON "Attendance"("tenantId", "checkInTime");

-- CreateIndex
CREATE INDEX "Attendance_status_idx" ON "Attendance"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PotentialClient_phone_key" ON "PotentialClient"("phone");

-- CreateIndex
CREATE INDEX "PotentialClient_agentCode_idx" ON "PotentialClient"("agentCode");

-- CreateIndex
CREATE INDEX "PotentialClient_status_idx" ON "PotentialClient"("status");

-- CreateIndex
CREATE INDEX "Transaction_tenantId_status_idx" ON "Transaction"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Transaction_tenantId_createdAt_idx" ON "Transaction"("tenantId", "createdAt");
