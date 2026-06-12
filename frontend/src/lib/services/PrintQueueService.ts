/**
 * PrintQueueService — DB-ga asoslangan print navbati
 *
 * Oqim:  POS → createJob (pending) → worker claim → PrinterService.print → ack
 * Worker ikki xil bo'lishi mumkin:
 *   1. processTick() — server o'zi chop etadi (EXE rejimi, server lokal mashinada)
 *   2. tray-agent — claim/ack API orqali (VPS rejimi, printer lokal tarmoqda)
 */
import * as net from "net";
import { prisma } from "@/lib/backend/db";
import { PrinterService, PrintJob as PrintPayload } from "./PrinterService";

/** Retry backoff: 2s → 5s → 15s → 60s → 5min */
const BACKOFF_MS = [2000, 5000, 15000, 60000, 300000];
const JOB_TTL_MS = 30 * 60 * 1000; // 30 daqiqa
const STALE_CLAIM_MS = 2 * 60 * 1000; // claim qilingan-u ack kelmagan

export interface CreateJobInput {
    tenantId: string;
    printerId: string;
    type?: string; // receipt | kitchen | report | test
    payload: Omit<PrintPayload, "printerIp" | "port">; // IP/port printer yozuvidan olinadi
    priority?: number;
}

async function log(jobId: string, printerId: string, tenantId: string, event: string, detail?: string, agentId?: string, durationMs?: number) {
    try {
        await prisma.printLog.create({ data: { jobId, printerId, tenantId, event, detail, agentId, durationMs } });
    } catch { /* log yozilmasa ham print to'xtamasin */ }
}

export const PrintQueueService = {
    async createJob(input: CreateJobInput) {
        const job = await prisma.printJob.create({
            data: {
                tenantId: input.tenantId,
                printerId: input.printerId,
                type: input.type || "receipt",
                payload: JSON.stringify(input.payload),
                priority: input.priority ?? 5,
                expiresAt: new Date(Date.now() + JOB_TTL_MS),
            },
        });
        await log(job.id, input.printerId, input.tenantId, "created");
        return job;
    },

    /** Agent yoki server-worker pending joblarni oladi (optimistic lock) */
    async claimJobs(tenantId: string, agentId: string, limit = 10) {
        await this.recoverStale(tenantId);
        const now = new Date();
        const candidates = await prisma.printJob.findMany({
            where: {
                tenantId,
                status: "pending",
                expiresAt: { gt: now },
                OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
            },
            orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
            take: limit,
            include: { printer: true },
        });

        const claimed = [];
        for (const job of candidates) {
            // updateMany + status sharti — ikki worker bir jobni olmasligi kafolati
            const res = await prisma.printJob.updateMany({
                where: { id: job.id, status: "pending" },
                data: { status: "claimed", claimedBy: agentId, claimedAt: now, attempts: { increment: 1 } },
            });
            if (res.count === 1) {
                claimed.push(job);
                await log(job.id, job.printerId, tenantId, "claimed", undefined, agentId);
            }
        }
        return claimed;
    },

    /** Natijani qabul qilish: done yoki failed (failed → backoff bilan qayta pending) */
    async ackJob(tenantId: string, jobId: string, ok: boolean, error?: string, agentId?: string, durationMs?: number) {
        const job = await prisma.printJob.findFirst({ where: { id: jobId, tenantId } });
        if (!job) return null;

        if (ok) {
            await prisma.printJob.update({
                where: { id: jobId },
                data: { status: "done", printedAt: new Date(), lastError: null },
            });
            await log(jobId, job.printerId, tenantId, "done", undefined, agentId, durationMs);
        } else if (job.attempts >= job.maxAttempts) {
            await prisma.printJob.update({
                where: { id: jobId },
                data: { status: "failed", lastError: error || "Noma'lum xato" },
            });
            await log(jobId, job.printerId, tenantId, "failed", error, agentId, durationMs);
        } else {
            const delay = BACKOFF_MS[Math.min(job.attempts - 1, BACKOFF_MS.length - 1)];
            await prisma.printJob.update({
                where: { id: jobId },
                data: { status: "pending", nextAttemptAt: new Date(Date.now() + delay), lastError: error || null },
            });
            await log(jobId, job.printerId, tenantId, "retry", `${error || ""} (urinish ${job.attempts}/${job.maxAttempts}, ${delay / 1000}s dan keyin)`, agentId);
        }
        return job;
    },

    /** Failed jobni qo'lda qayta navbatga qo'yish */
    async retryJob(tenantId: string, jobId: string) {
        const res = await prisma.printJob.updateMany({
            where: { id: jobId, tenantId, status: { in: ["failed", "expired", "cancelled"] } },
            data: {
                status: "pending", attempts: 0, nextAttemptAt: null, lastError: null,
                expiresAt: new Date(Date.now() + JOB_TTL_MS),
            },
        });
        if (res.count === 1) {
            const job = await prisma.printJob.findUnique({ where: { id: jobId } });
            if (job) await log(jobId, job.printerId, tenantId, "requeued");
        }
        return res.count === 1;
    },

    async cancelJob(tenantId: string, jobId: string) {
        const res = await prisma.printJob.updateMany({
            where: { id: jobId, tenantId, status: { in: ["pending", "claimed", "failed"] } },
            data: { status: "cancelled" },
        });
        if (res.count === 1) {
            const job = await prisma.printJob.findUnique({ where: { id: jobId } });
            if (job) await log(jobId, job.printerId, tenantId, "cancelled");
        }
        return res.count === 1;
    },

    /** Stale claimed (worker o'lib qolgan) va muddati o'tgan joblarni tozalash */
    async recoverStale(tenantId: string) {
        const now = new Date();
        await prisma.printJob.updateMany({
            where: { tenantId, status: { in: ["claimed", "printing"] }, claimedAt: { lt: new Date(now.getTime() - STALE_CLAIM_MS) } },
            data: { status: "pending", claimedBy: null },
        });
        await prisma.printJob.updateMany({
            where: { tenantId, status: "pending", expiresAt: { lt: now } },
            data: { status: "expired" },
        });
    },

    /**
     * Server-worker tick: claim qilib o'zi chop etadi.
     * EXE rejimida ishlaydi (server printer bilan bitta tarmoqda).
     */
    async processTick(tenantId: string, limit = 5) {
        const jobs = await this.claimJobs(tenantId, "server-worker", limit);
        const results = [];
        for (const job of jobs) {
            const started = Date.now();
            try {
                const payload: PrintPayload = JSON.parse(job.payload);
                payload.printerIp = job.printer.ipAddress;
                payload.port = job.printer.port;
                payload.tenantId = tenantId;
                const r = await PrinterService.print(payload);
                await this.ackJob(tenantId, job.id, r.success, r.error, "server-worker", Date.now() - started);
                results.push({ id: job.id, ok: r.success, error: r.error });
            } catch (err) {
                await this.ackJob(tenantId, job.id, false, String(err), "server-worker", Date.now() - started);
                results.push({ id: job.id, ok: false, error: String(err) });
            }
        }
        return results;
    },

    /** Heartbeat: barcha aktiv printerlarni TCP probe qilib statusini yangilash */
    async probeAll(tenantId: string) {
        const printers = await prisma.smartPrinter.findMany({ where: { tenantId, isActive: true } });
        const results = await Promise.all(printers.map(async (p) => {
            if (p.ipAddress.startsWith("usb://")) {
                // USB ni serverdan probe qilib bo'lmaydi — agent xabariga tayanamiz
                return { id: p.id, status: p.status, latencyMs: p.latencyMs };
            }
            const started = Date.now();
            const ok = await probeTcp(p.ipAddress, p.port, 1500);
            const latency = ok ? Date.now() - started : null;
            const status = ok ? "online" : "offline";
            await prisma.smartPrinter.update({
                where: { id: p.id },
                data: { status, latencyMs: latency, ...(ok ? { lastSeenAt: new Date() } : {}) },
            }).catch(() => {});
            return { id: p.id, status, latencyMs: latency };
        }));
        return results;
    },
};

function probeTcp(ip: string, port: number, timeout = 1500): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let settled = false;
        const finish = (val: boolean) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            socket.destroy();
            resolve(val);
        };
        const timer = setTimeout(() => finish(false), timeout);
        socket.on("error", () => finish(false));
        socket.connect(port, ip, () => finish(true));
    });
}
