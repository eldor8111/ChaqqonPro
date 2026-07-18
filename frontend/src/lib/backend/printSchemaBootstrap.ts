/**
 * Print queue jadvallarini eski DB larda avtomatik yaratish.
 * EXE yangilanganda eski pos.db da PrintJob/PrintLog bo'lmaydi —
 * shu modul birinchi so'rovda ularni yaratadi (idempotent).
 */
import { prisma } from "@/lib/backend/db";

const globalAny = globalThis as any;

export async function ensurePrintSchema(): Promise<void> {
    if (globalAny.__printSchemaBootstrapped) return;
    globalAny.__printSchemaBootstrapped = true;

    // SmartPrinter ga yangi ustunlar (mavjud bo'lsa xato — e'tiborsiz)
    const alters = [
        `ALTER TABLE \"SmartPrinter\" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'cashier'`,
        `ALTER TABLE \"SmartPrinter\" ADD COLUMN "paperWidth" INTEGER NOT NULL DEFAULT 80`,
        `ALTER TABLE \"SmartPrinter\" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'unknown'`,
        `ALTER TABLE \"SmartPrinter\" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT 1`,
        `ALTER TABLE \"SmartPrinter\" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT 0`,
        `ALTER TABLE \"SmartPrinter\" ADD COLUMN "lastSeenAt" TIMESTAMP`,
        `ALTER TABLE \"SmartPrinter\" ADD COLUMN "latencyMs" INTEGER`,
    ];
    for (const sql of alters) {
        try { await prisma.$executeRawUnsafe(sql); } catch { /* ustun allaqachon bor */ }
    }

    try {
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "PrintJob" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "tenantId" TEXT NOT NULL,
            "printerId" TEXT NOT NULL,
            "type" TEXT NOT NULL DEFAULT 'receipt',
            "payload" TEXT NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'pending',
            "priority" INTEGER NOT NULL DEFAULT 5,
            "attempts" INTEGER NOT NULL DEFAULT 0,
            "maxAttempts" INTEGER NOT NULL DEFAULT 5,
            "claimedBy" TEXT,
            "claimedAt" TIMESTAMP,
            "printedAt" TIMESTAMP,
            "nextAttemptAt" TIMESTAMP,
            "lastError" TEXT,
            "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP NOT NULL,
            CONSTRAINT "PrintJob_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "SmartPrinter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PrintJob_tenantId_status_idx" ON "PrintJob"("tenantId", "status")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PrintJob_printerId_status_idx" ON "PrintJob"("printerId", "status")`);

        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "PrintLog" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "jobId" TEXT NOT NULL,
            "printerId" TEXT NOT NULL,
            "tenantId" TEXT NOT NULL,
            "event" TEXT NOT NULL,
            "detail" TEXT,
            "agentId" TEXT,
            "durationMs" INTEGER,
            "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "PrintLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PrintJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PrintLog_tenantId_createdAt_idx" ON "PrintLog"("tenantId", "createdAt")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PrintLog_jobId_idx" ON "PrintLog"("jobId")`);
    } catch (e) {
        console.error("[printSchemaBootstrap]", e);
    }
}
