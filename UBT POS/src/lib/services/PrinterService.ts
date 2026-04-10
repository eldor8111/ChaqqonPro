/**
 * PrinterService — ESC/POS printer boshqaruvi (TCP + USB)
 * Print route bu classdan foydalanadi (thin controller pattern)
 */
import * as net from "net";
import { cacheGet, cacheSet, TTL } from "@/lib/cache";
import { prisma } from "@/lib/backend/db";

// ─── ESC/POS helper commands ────────────────────────────────────────────────
const ESC = 0x1b, GS = 0x1d;
const cmd = {
    init:      () => Buffer.from([ESC, 0x40]),
    align:     (n: number) => Buffer.from([ESC, 0x61, n]),
    bold:      (on: boolean) => Buffer.from([ESC, 0x45, on ? 1 : 0]),
    doubleHW:  () => Buffer.from([GS, 0x21, 0x11]),
    normal:    () => Buffer.from([GS, 0x21, 0x00]),
    cut:       () => Buffer.from([GS, 0x56, 0x41, 0x03]),
};

// ─── Text helpers ────────────────────────────────────────────────────────────
function strLen(s: string): number { return Array.from(s).length; }

/**
 * Transliterate — Kirill & special chars → ASCII for ESC/POS printers
 */
function toAscii(text: string): string {
    return text
        .replace(/[\u02BB\u2018\u2019']/g, "'")
        .replace(/[\u201C\u201D"]/g, '"')
        .replace(/[\u0400-\u04FF]/g, (c) => {
            const map: Record<string, string> = {
                "А":"A","Б":"B","В":"V","Г":"G","Д":"D","Е":"E","Ж":"J","З":"Z","И":"I",
                "К":"K","Л":"L","М":"M","Н":"N","О":"O","П":"P","Р":"R","С":"S","Т":"T",
                "У":"U","Ф":"F","Х":"X","Ч":"Ch","Ш":"Sh","Э":"E","Ю":"Yu","Я":"Ya",
                "а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ж":"j","з":"z","и":"i",
                "к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t",
                "у":"u","ф":"f","х":"x","ч":"ch","ш":"sh","э":"e","ю":"yu","я":"ya",
            };
            return map[c] ?? c;
        });
}

function line(text = ""): Buffer { return Buffer.from(toAscii(text) + "\n", "utf8"); }
function dashed(): Buffer { return line("- - - - - - - - - - - - - - - -"); }
function solid(): Buffer  { return line("================================"); }
function pad(left: string, right: string, width = 32): string {
    const gap = width - strLen(left) - strLen(right);
    return left + " ".repeat(Math.max(1, gap)) + right;
}

// ─── Types ───────────────────────────────────────────────────────────────────
export interface PrintJob {
    printerIp: string;
    port?: number;
    receiptType?: "kitchen" | "client" | "report";
    tableName?: string;
    tableZone?: string;
    tableType?: string;
    waiter?: string;
    time?: string;
    items?: { name: string; qty: number; price: number; unit?: string }[];
    total: number;
    orderNum?: number;
    paymentMethod?: string;
    cashAmount?: number;
    cardAmount?: number;
    servicePercent?: number;
    tenantId?: string;
}

interface ReceiptOpts {
    shopName: string;
    headerText: string;
    footerText: string;
    servicePercent: number;
}

// ─── Receipt settings cache ──────────────────────────────────────────────────
async function getReceiptOpts(tenantId?: string): Promise<ReceiptOpts> {
    const cacheKey = `receiptOpts:${tenantId ?? "default"}`;
    const cached = cacheGet<ReceiptOpts>(cacheKey);
    if (cached) return cached;

    try {
        const where = tenantId ? { id: tenantId } : { status: "active" as const };
        const tenant = await prisma.tenant.findFirst({ where });
        if (!tenant) throw new Error("Tenant topilmadi");

        let settings: Record<string, unknown> = {};
        try { settings = JSON.parse((tenant as { settings?: string }).settings || "{}"); } catch {}
        const r = (settings.receiptSettings ?? {}) as Record<string, string>;
        const h = (settings.ubtSettings  ?? {}) as Record<string, string>;

        const opts: ReceiptOpts = {
            shopName:       tenant.shopName || "RESTORAN",
            headerText:     r.headerText    || "XARIDINGIZ UCHUN RAXMAT!",
            footerText:     r.footerText    || "",
            servicePercent: Number(h.serviceFee) || 0,
        };

        cacheSet(cacheKey, opts, TTL.RECEIPT_SETTINGS);
        return opts;
    } catch {
        return { shopName: "RESTORAN", headerText: "XARIDINGIZ UCHUN RAXMAT!", footerText: "", servicePercent: 0 };
    }
}

// ─── Buffer builders ─────────────────────────────────────────────────────────
function buildKitchenBuffer(job: PrintJob): Buffer {
    const parts: Buffer[] = [];
    const now = job.time || new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
    parts.push(cmd.init(), cmd.align(1), cmd.bold(true), cmd.doubleHW(), line("OSHXONA"), cmd.normal(), cmd.bold(false));
    if (job.orderNum) parts.push(line(`Zakaz #${job.orderNum}`));
    parts.push(line(now));
    if (job.tableName) parts.push(line(`Stol: ${job.tableName}${job.tableZone ? ` (${job.tableZone})` : ""}`));
    if (job.waiter)    parts.push(line(`Ofitsiant: ${job.waiter}`));
    parts.push(cmd.align(0), dashed(), cmd.bold(true), line("TAOM                MIQDOR"), cmd.bold(false), dashed());
    for (const item of (job.items || [])) {
        const name = item.name.substring(0, 20).padEnd(20);
        const qty  = `${item.qty} ${item.unit || "ta"}`.padStart(8);
        parts.push(line(`${name}${qty}`));
    }
    parts.push(dashed(), line(""), line(""), cmd.cut());
    return Buffer.concat(parts);
}

function buildClientBuffer(job: PrintJob, opts: ReceiptOpts): Buffer {
    const parts: Buffer[] = [];
    const now = new Date();
    const timeStr = job.time || `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const dateStr = `${String(now.getDate()).padStart(2,"0")}.${String(now.getMonth()+1).padStart(2,"0")}.${now.getFullYear()}`;
    const shopName   = opts.shopName.toUpperCase();
    const headerText = opts.headerText.toUpperCase();
    const serviceP   = job.servicePercent ?? opts.servicePercent ?? 0;
    const serviceAmt = serviceP ? Math.round(job.total * serviceP / (100 + serviceP)) : 0;

    parts.push(cmd.init(), cmd.align(1), cmd.bold(true), cmd.doubleHW(), line(shopName), cmd.normal(), cmd.bold(false));
    if (job.orderNum) parts.push(line(`Nomeri zakaza: ${job.orderNum}`));
    parts.push(line(`Data: ${timeStr}  ${dateStr}`));

    parts.push(cmd.align(0), line(""), dashed());
    parts.push(line(pad("Tip zakaza", job.tableType || "Na stol")), dashed());
    if (job.tableName) {
        const label = job.tableZone ? `${job.tableName} (${job.tableZone})` : job.tableName;
        parts.push(line(pad("Nomeri stola", label)), dashed());
    }
    if (job.waiter) { parts.push(line(pad("Ofitsiant", job.waiter)), dashed()); }

    parts.push(line(""), cmd.bold(true));
    parts.push(line("Naim.".padEnd(15) + "Kol".padStart(3) + "Narx".padStart(7) + "Jami".padStart(7)));
    parts.push(cmd.bold(false), dashed());

    for (const item of (job.items || [])) {
        const name  = item.name.substring(0, 15).padEnd(15);
        const qty   = String(item.qty).padStart(3);
        const p     = String(Math.round(item.price)).padStart(7);
        const total = String(Math.round(item.price * item.qty)).padStart(7);
        parts.push(line(`${name}${qty}${p}${total}`));
    }
    parts.push(dashed());

    if (serviceP && serviceAmt > 0) {
        parts.push(line(""), line(pad(`Xizmat ${serviceP}%`, String(serviceAmt))));
    }

    parts.push(solid(), line(pad("ITOGO:", String(Math.round(job.total)))), solid());

    if (job.cashAmount && job.cashAmount > 0) parts.push(line(pad("Nalichnye:", String(Math.round(job.cashAmount)))));
    if (job.cardAmount && job.cardAmount > 0)  parts.push(line(pad("Karta:",     String(Math.round(job.cardAmount)))));
    if (!job.cashAmount && !job.cardAmount && job.paymentMethod) parts.push(line(pad("To'lov:", job.paymentMethod)));

    parts.push(line(""), cmd.align(1), cmd.bold(true), line(headerText), cmd.bold(false));
    if (opts.footerText) { parts.push(line(""), line(opts.footerText)); }
    parts.push(line(""), line(""), cmd.cut());
    return Buffer.concat(parts);
}

function buildReportBuffer(job: PrintJob, opts: ReceiptOpts): Buffer {
    const parts: Buffer[] = [];
    const now = new Date();
    const timeStr = job.time || `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const dateStr = `${String(now.getDate()).padStart(2,"0")}.${String(now.getMonth()+1).padStart(2,"0")}.${now.getFullYear()}`;
    const shopName   = opts.shopName.toUpperCase();

    parts.push(cmd.init(), cmd.align(1), cmd.bold(true), cmd.doubleHW(), line(shopName), cmd.normal(), cmd.bold(false));
    parts.push(line(""), cmd.bold(true), line("KUNLIK HISOBOT"), cmd.bold(false));
    parts.push(line(`Sana: ${dateStr}  Vaqt: ${timeStr}`));
    if (job.waiter) parts.push(line(`Kassir: ${job.waiter}`));

    parts.push(cmd.align(0), line(""), dashed());
    parts.push(cmd.bold(true), line(pad("JAMI TUSHUM:", String(Math.round(job.total)))), cmd.bold(false));
    parts.push(dashed());
    
    if (job.cashAmount !== undefined) parts.push(line(pad("NAQD:", String(Math.round(job.cashAmount)))));
    if (job.cardAmount !== undefined) parts.push(line(pad("PLASTIK KARTA:", String(Math.round(job.cardAmount)))));
    
    parts.push(dashed(), line(""), line("Xizmat ko'rsatganingiz uchun rahmat!"), line(""), line(""), cmd.cut());
    return Buffer.concat(parts);
}

// ─── Transport layer ─────────────────────────────────────────────────────────
/** Bir marta urinish */
function printTcpOnce(ip: string, port: number, data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(5000);
        socket.connect(port, ip, () => { socket.write(data, () => { socket.end(); resolve(); }); });
        socket.on("timeout", () => { socket.destroy(); reject(new Error(`Timeout: ${ip}:${port}`)); });
        socket.on("error",   (err) => { socket.destroy(); reject(err); });
    });
}

/** Retry: muvaffaqiyatsiz bo'lsa 2s dan keyin 1 marta qayta urinadi */
async function printTcp(ip: string, port: number, data: Buffer): Promise<void> {
    try {
        await printTcpOnce(ip, port, data);
    } catch (firstErr) {
        console.warn(`[PrinterService] Retry ${ip}:${port} — 2s dan keyin`);
        await new Promise(r => setTimeout(r, 2000));
        try {
            await printTcpOnce(ip, port, data); // ikkinchi urinish
        } catch {
            throw firstErr; // birinchi xato xabarini qaytarish
        }
    }
}

async function printUsb(printerName: string, data: Buffer): Promise<void> {
    const { exec }        = await import("child_process");
    const { promisify }   = await import("util");
    const { writeFile, unlink } = await import("fs/promises");
    const { join }        = await import("path");
    const execAsync       = promisify(exec);
    const tmpFile         = join(process.cwd(), `tmp_print_${Date.now()}.bin`);
    try {
        await writeFile(tmpFile, data);
        await execAsync(`copy /b "${tmpFile}" "\\\\.\\${printerName}"`, { shell: "cmd.exe" })
            .catch(() => execAsync(`print /d:"${printerName}" "${tmpFile}"`));
    } finally {
        await unlink(tmpFile).catch(() => {});
    }
}

// ─── In-Memory Print Queue ───────────────────────────────────────────────────
/** Bir vaqtda maksimal 3 ta print ulanishi (printer overload himoyasi) */
class PrintQueue {
    private running = 0;
    private readonly limit: number;
    private readonly queue: Array<() => void> = [];

    constructor(concurrencyLimit = 3) { this.limit = concurrencyLimit; }

    async run<T>(task: () => Promise<T>): Promise<T> {
        if (this.running >= this.limit) {
            await new Promise<void>(resolve => this.queue.push(resolve));
        }
        this.running++;
        try {
            return await task();
        } finally {
            this.running--;
            this.queue.shift()?.(); // keyingi taskni boshlash
        }
    }
}

const printQueue = new PrintQueue(3);

// ─── Public API ──────────────────────────────────────────────────────────────
export const PrinterService = {
    /**
     * Print job ni queue orqali bajarish
     * - Bir vaqtda max 3 ta printer ulanishi
     * - TCP: avtomatik 1 marta retry (2s delay)
     * - USB: Windows copy /b orqali
     */
    async print(job: PrintJob): Promise<{ success: boolean; error?: string }> {
        return printQueue.run(async () => {
            try {
                let buffer: Buffer;
                if (job.receiptType === "kitchen") {
                    buffer = buildKitchenBuffer(job);
                } else if (job.receiptType === "report") {
                    const opts = await getReceiptOpts(job.tenantId);
                    buffer = buildReportBuffer(job, opts);
                } else {
                    const opts = await getReceiptOpts(job.tenantId);
                    buffer = buildClientBuffer(job, opts);
                }

                const port = Number(job.port) || 9100;
                if (job.printerIp.startsWith("usb://")) {
                    await printUsb(job.printerIp.slice(6), buffer);
                } else {
                    await printTcp(job.printerIp, port, buffer); // retry bilan
                }
                return { success: true };
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error("[PrinterService]", msg);
                return { success: false, error: msg };
            }
        });
    },

    /** Receipt settings cache ni tozalash (settings yangilanganda chaqiriladi) */
    invalidateReceiptCache(tenantId?: string): void {
        const { cacheInvalidate } = require("@/lib/cache");
        cacheInvalidate(`receiptOpts:${tenantId ?? "default"}`);
    },
};
