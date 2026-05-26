/**
 * PrinterService — ESC/POS printer boshqaruvi (TCP + USB)
 * Print route bu classdan foydalanadi (thin controller pattern)
 */
import * as net from "net";
import { cacheGet, cacheSet, TTL } from "@/lib/cache";
import { prisma } from "@/lib/backend/db";
import fs from "fs";
import path from "path";

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

/**
 * QR Code ESC/POS (GS ( k) — ko'pchilik termal printerlarda ishlaydi
 * @param data URL yoki matn
 * @param size 1-8 (default 4)
 */
function qrCode(data: string, size = 4): Buffer {
    const d = Buffer.from(data, "utf8");
    const pL = (d.length + 3) & 0xFF;
    const pH = ((d.length + 3) >> 8) & 0xFF;
    return Buffer.concat([
        // Model 2
        Buffer.from([GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]),
        // Size
        Buffer.from([GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size]),
        // Error correction level M
        Buffer.from([GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31]),
        // Store data
        Buffer.from([GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30]),
        d,
        // Print
        Buffer.from([GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]),
    ]);
}

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
function dashed(): Buffer { return line("------------------------------------------------"); }
function solid(): Buffer  { return line("================================================"); }
function pad(left: string, right: string, width = 48): string {
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
    orderNum?: number | string;
    paymentMethod?: string;
    cashAmount?: number;
    cardAmount?: number;
    servicePercent?: number;
    tenantId?: string;
    isCancellation?: boolean;
    isReprint?: boolean;
}

interface ReceiptOpts {
    shopName: string;
    customShopName: string;
    shopNameFontSize: number;
    shopNameAlign: string;
    shopNameBold: boolean;
    headerText: string;
    headerFontSize: number;
    headerAlign: string;
    headerBold: boolean;
    footerText: string;
    footerFontSize: number;
    footerAlign: string;
    footerBold: boolean;
    servicePercent: number;
    showQr: boolean;
    qrUrl: string;
    showCashierName: boolean;
    kitchenShowTable: boolean;
    kitchenShowWaiter: boolean;
    kitchenShowOrderNo: boolean;
    kitchenShowTime: boolean;
    kitchenShowNote: boolean;
    kitchenShowOrderType: boolean;
    kitchenItemFontSize: number;
    kitchenHeaderText: string;
}

function alignCode(align: string): number {
    if (align === "right") return 2;
    if (align === "center") return 1;
    return 0;
}

function sizeCmd(px: number): Buffer {
    return px >= 18 ? cmd.doubleHW() : cmd.normal();
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
        const r = (settings.receiptSettings ?? {}) as Record<string, any>;
        const h = (settings.smartSettings  ?? {}) as Record<string, any>;
        const k = (settings.kitchenReceiptSettings ?? {}) as Record<string, any>;

        const opts: ReceiptOpts = {
            shopName:       tenant.shopName || "RESTORAN",
            customShopName: (r.customShopName as string) || "",
            shopNameFontSize: Number(r.shopNameFontSize) || 20,
            shopNameAlign:  (r.shopNameAlign as string) || "center",
            shopNameBold:   r.shopNameBold !== false, // default true
            headerText:     r.headerText    || "XARIDINGIZ UCHUN RAXMAT!",
            headerFontSize: Number(r.headerFontSize) || 13,
            headerAlign:    (r.headerAlign as string) || "center",
            headerBold:     r.headerBold === true, // default false
            footerText:     r.footerText    || "",
            footerFontSize: Number(r.footerFontSize) || 10,
            footerAlign:    (r.footerAlign as string) || "center",
            footerBold:     r.footerBold === true,
            servicePercent: Number(h.serviceFee) || 0,
            showQr:         r.showBarcode === true || r.showBarcode === "true" || (r.showBarcode as unknown) !== false,
            qrUrl:          (r.qrUrl as string)   || "",
            showCashierName: r.showCashierName !== false, // default true
            kitchenShowTable: k.kitchenShowTable !== false,
            kitchenShowWaiter: k.kitchenShowWaiter !== false,
            kitchenShowOrderNo: k.kitchenShowOrderNo !== false,
            kitchenShowTime: k.kitchenShowTime !== false,
            kitchenShowNote: k.kitchenShowNote !== false,
            kitchenShowOrderType: k.kitchenShowOrderType !== false,
            kitchenItemFontSize: Number(k.kitchenItemFontSize) || 16,
            kitchenHeaderText: (k.kitchenHeaderText as string) || "OSHXONA BUYURTMASI",
        };

        cacheSet(cacheKey, opts, TTL.RECEIPT_SETTINGS);
        return opts;
    } catch {
        return { 
            shopName: "RESTORAN", customShopName: "", shopNameFontSize: 20, shopNameAlign: "center", shopNameBold: true,
            headerText: "XARIDINGIZ UCHUN RAXMAT!", headerFontSize: 13, headerAlign: "center", headerBold: false,
            footerText: "", footerFontSize: 10, footerAlign: "center", footerBold: false,
            servicePercent: 0, showQr: false, qrUrl: "", showCashierName: true,
            kitchenShowTable: true, kitchenShowWaiter: true, kitchenShowOrderNo: true, kitchenShowTime: true,
            kitchenShowNote: true, kitchenShowOrderType: true, kitchenItemFontSize: 16, kitchenHeaderText: "OSHXONA BUYURTMASI"
        };
    }
}

// ─── Buffer builders ─────────────────────────────────────────────────────────
function buildKitchenBuffer(job: PrintJob, opts: ReceiptOpts): Buffer {
    const parts: Buffer[] = [];
    const now = job.time || new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
    const headerTitle = job.isCancellation ? "BEKOR QILINDI" : opts.kitchenHeaderText;
    
    parts.push(cmd.init(), cmd.align(1), cmd.bold(true), cmd.doubleHW(), line(toAscii(headerTitle)), cmd.normal(), cmd.bold(false));
    if (opts.kitchenShowOrderNo && job.orderNum) parts.push(line(`Zakaz #${job.orderNum}`));
    if (opts.kitchenShowTime) parts.push(line(now));
    if (opts.kitchenShowTable && job.tableName) parts.push(line(`Stol: ${job.tableName}${job.tableZone ? ` (${job.tableZone})` : ""}`));
    if (opts.kitchenShowWaiter && job.waiter)    parts.push(line(`Ofitsiant: ${job.waiter}`));
    if (opts.kitchenShowOrderType && job.tableType) parts.push(line(`Tur: ${job.tableType}`));
    
    parts.push(cmd.align(0), dashed(), cmd.bold(true), line("TAOM                MIQDOR"), cmd.bold(false), dashed());
    
    const isItemLarge = opts.kitchenItemFontSize >= 18;
    for (const item of (job.items || [])) {
        if (isItemLarge) {
            parts.push(cmd.doubleHW(), cmd.bold(true));
            parts.push(line(`${item.qty}x ${toAscii(item.name).substring(0, 16)}`));
            parts.push(cmd.normal(), cmd.bold(false));
        } else {
            const name = toAscii(item.name).substring(0, 20).padEnd(20);
            const qty  = `${item.qty} ${item.unit || "ta"}`.padStart(8);
            parts.push(line(`${name}${qty}`));
        }
    }
    parts.push(dashed(), line(""), line(""), cmd.cut());
    return Buffer.concat(parts);
}

function buildClientBuffer(job: PrintJob, opts: ReceiptOpts): Buffer {
    const parts: Buffer[] = [];
    const now = new Date();
    const timeStr = job.time || `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const dateStr = `${String(now.getDate()).padStart(2,"0")}.${String(now.getMonth()+1).padStart(2,"0")}.${now.getFullYear()}`;
    const shopName   = (opts.customShopName || opts.shopName).toUpperCase();
    const serviceP   = job.servicePercent ?? opts.servicePercent ?? 0;
    const subtotal   = (job.items || []).reduce((s, it) => s + it.price * it.qty, 0);
    const serviceAmt = serviceP ? Math.round(subtotal * serviceP / 100) : 0;
    const grandTotal = Math.round(subtotal + serviceAmt);

    // ── Header ──────────────────────────────────────────────────
    parts.push(cmd.init());
    parts.push(cmd.align(alignCode(opts.shopNameAlign)));
    parts.push(cmd.bold(opts.shopNameBold));
    parts.push(sizeCmd(opts.shopNameFontSize));
    parts.push(line(shopName));
    parts.push(cmd.normal(), cmd.bold(false));
    parts.push(line(""));

    if (job.isReprint) {
        parts.push(cmd.align(1));
        parts.push(cmd.bold(true));
        parts.push(line("*** NUSXA ***"));
        parts.push(cmd.bold(false));
        parts.push(line(""));
    }

    // ── Order meta ──────────────────────────────────────────────
    parts.push(cmd.align(0));
    parts.push(solid());
    if (job.orderNum) parts.push(line(pad("Buyurtma #:", String(job.orderNum))));
    parts.push(line(pad("Sana:", dateStr)));
    parts.push(line(pad("Vaqt:", timeStr)));
    if (job.tableName) {
        const label = job.tableZone ? `${job.tableName} (${job.tableZone})` : job.tableName;
        parts.push(line(pad("Stol:", label)));
    }
    if (job.tableType) parts.push(line(pad("Tur:", job.tableType)));
    if (opts.showCashierName && job.waiter) parts.push(line(pad("Ofitsiant:", job.waiter)));
    parts.push(solid());

    // ── Items ────────────────────────────────────────────────────
    parts.push(line(""));

    for (const item of (job.items || [])) {
        const totalAmount = String(Math.round(item.price * item.qty));
        const namePart = toAscii(item.name).substring(0, 20);
        const leftText = `${namePart} x ${item.qty}`;
        parts.push(line(pad(leftText, totalAmount)));
    }
    parts.push(dashed());

    // ── Totals ───────────────────────────────────────────────────
    if (serviceP && serviceAmt > 0) {
        parts.push(line(pad(`Jami (chegirmasiz):`, String(Math.round(subtotal)))));
        parts.push(line(pad(`Xizmat haqi (${serviceP}%):`, `+${serviceAmt}`)));
        parts.push(dashed());
    }

    parts.push(cmd.bold(true));
    parts.push(solid());
    parts.push(cmd.doubleHW());
    parts.push(line(pad("JAMI TO'LOV:", String(grandTotal) + " so'm", 24)));
    parts.push(cmd.normal(), cmd.bold(false));
    parts.push(solid());

    // ── Payment breakdown ────────────────────────────────────────
    if (job.cashAmount && job.cashAmount > 0)
        parts.push(line(pad("  Naqd pul:", String(Math.round(job.cashAmount)) + " so'm")));
    if (job.cardAmount && job.cardAmount > 0)
        parts.push(line(pad("  Plastik karta:", String(Math.round(job.cardAmount)) + " so'm")));
    if (!job.cashAmount && !job.cardAmount && job.paymentMethod)
        parts.push(line(pad("  To'lov turi:", job.paymentMethod)));

    // ── Footer ───────────────────────────────────────────────────
    parts.push(line(""));
    
    if (opts.headerText) {
        parts.push(cmd.align(alignCode(opts.headerAlign)));
        parts.push(cmd.bold(opts.headerBold));
        parts.push(sizeCmd(opts.headerFontSize));
        parts.push(line(toAscii(opts.headerText)));
        parts.push(cmd.normal(), cmd.bold(false));
    }
    
    if (opts.footerText) {
        parts.push(line(""));
        parts.push(cmd.align(alignCode(opts.footerAlign)));
        parts.push(cmd.bold(opts.footerBold));
        parts.push(sizeCmd(opts.footerFontSize));
        parts.push(line(toAscii(opts.footerText)));
        parts.push(cmd.normal(), cmd.bold(false));
    }
    // ── QR Code ──────────────────────────────────────────────────
    if (opts.showQr) {
        parts.push(line(""));
        parts.push(cmd.align(1));
        const qrData = opts.qrUrl || `ORDER:${job.orderNum || ""} ${shopName}`;
        parts.push(qrCode(qrData, 4));
        parts.push(line(""));
    }
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
        let settled = false;
        const done = (err?: Error) => {
            if (settled) return;
            settled = true;
            socket.destroy();
            if (err) {
                const extendedMsg = `LAN Printer Error (${ip}:${port}) - ${err.message}. (Printer o'chiq, IP xato, yoki tarmoq/firewall bloklagan bo'lishi mumkin)`;
                reject(new Error(extendedMsg));
            } else {
                resolve();
            }
        };
        const timer = setTimeout(() => {
            done(new Error(`Timeout`));
        }, 5000);
        socket.on("error", (err) => done(err));
        socket.connect(port, ip, () => {
            clearTimeout(timer);
            socket.write(data, () => {
                setTimeout(() => done(), 200);
            });
        });
    });
}

/** Retry: muvaffaqiyatsiz bo'lsa 2s dan keyin 1 marta qayta urinadi */
async function printTcp(ip: string, port: number, data: Buffer): Promise<void> {
    // Agar server Linux (Bulutli) bo'lsa va IP lokal tarmoq bo'lsa, uni agentga uzatamiz.
    const os = await import("os");
    const isLocalNetwork = /^(192\.168|10\.|172\.(1[6-9]|2[0-9]|3[0-1]))\./.test(ip) || ip === "127.0.0.1" || ip === "localhost";
    
    if (os.platform() !== 'win32' && isLocalNetwork) {
        const fs = await import("fs");
        const path = await import("path");
        const queueDir = path.join(process.cwd(), ".print_queue");
        if (!fs.existsSync(queueDir)) fs.mkdirSync(queueDir, { recursive: true });
        
        const jobId = Date.now().toString() + Math.random().toString().slice(2, 6);
        const jobData = {
            printerIp: ip,
            printerPort: port,
            data: data.toString('base64'),
            timestamp: Date.now()
        };
        
        fs.writeFileSync(path.join(queueDir, jobId + ".json"), JSON.stringify(jobData));
        console.log(`[PrinterService] LAN printer (Agent uchun) navbatga qo'shildi: ${jobId}.json (${ip}:${port})`);
        return;
    }

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
    const { execFile }    = await import("child_process");
    const { promisify }   = await import("util");
    const { writeFile, unlink } = await import("fs/promises");
    const { join }        = await import("path");
    const os              = await import("os");
    const execFileAsync   = promisify(execFile);

    // ESC/POS binary faylni vaqtincha saqlash
    const tmpFile = join(process.cwd(), `tmp_print_${Date.now()}.bin`);
    await writeFile(tmpFile, data);

    try {
        if (os.platform() === 'win32') {
            // --- WINDOWS (PowerShell) ---
            const psScript = `
$code = @"
using System;
using System.IO;
using System.Runtime.InteropServices;
public class RawPrint {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }
    [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
    [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
    [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);
    public static bool SendFileToPrinter(string szPrinterName, string szFileName) {
        FileStream fs = new FileStream(szFileName, FileMode.Open);
        BinaryReader br = new BinaryReader(fs);
        Byte[] bytes = br.ReadBytes((int)fs.Length);
        IntPtr pBytes = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, pBytes, bytes.Length);
        Int32 dwWritten = 0;
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "RAW";
        di.pDataType = null; // null makes it bypass strict datatype check and use printer's default
        bool ok = false;
        if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    ok = WritePrinter(hPrinter, pBytes, bytes.Length, out dwWritten);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        Marshal.FreeCoTaskMem(pBytes);
        fs.Close();
        return ok;
    }
}
"@
Add-Type -TypeDefinition $code -Language CSharp
$result = [RawPrint]::SendFileToPrinter("${printerName}", "${tmpFile}")
if (-not $result) { exit 1 }
`;
            await execFileAsync("powershell", [
                "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
                "-Command", psScript
            ], { timeout: 15000 });
        } else {
            // --- LINUX (Ahost yoki Raspberry Pi) ---
            try {
                // Agar printerName fayl manzili bo'lsa (masalan: /dev/usb/lp0)
                if (printerName.startsWith('/dev/')) {
                    fs.writeFileSync(printerName, data);
                } else {
                    // Bulutli tizimda bo'lib lokal printer bo'lsa, polling orqali topshiriqqa yozamiz
                    const queueDir = path.join(process.cwd(), ".print_queue");
                    if (!fs.existsSync(queueDir)) fs.mkdirSync(queueDir, { recursive: true });
                    
                    const jobId = Date.now().toString() + Math.random().toString().slice(2, 6);
                    const jobData = {
                        printerName: printerName, // masalan "XP-80C"
                        data: data.toString('base64'),
                        timestamp: Date.now()
                    };
                    
                    fs.writeFileSync(path.join(queueDir, jobId + ".json"), JSON.stringify(jobData));
                    console.log(`[PrinterService] USB printer navbatiga qo'shildi: ${jobId}.json`);
                }
            } catch (linuxErr) {
                console.error("[PrinterService Linux USB Error]:", linuxErr);
                throw linuxErr;
            }
        }
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
                    const opts = await getReceiptOpts(job.tenantId);
                    buffer = buildKitchenBuffer(job, opts);
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
        cacheInvalidate("receiptOpts:default");
    },
};
