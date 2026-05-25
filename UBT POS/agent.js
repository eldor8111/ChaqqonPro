const { execFile } = require("child_process");
const { promisify } = require("util");
const { writeFile, unlink } = require("fs/promises");
const { join } = require("path");
const net = require("net");
const os = require("os");

const execFileAsync = promisify(execFile);

// E-Code UZ orqali bulutli server bilan sinxronizatsiya
const SERVER_URL = "https://smart.e-code.uz";

async function getWindowsPrinters() {
    try {
        const { stdout } = await execFileAsync("powershell", [
            "-Command",
            "Get-Printer | Select-Object -ExpandProperty Name | ConvertTo-Json"
        ], { timeout: 8000 });
        let printers = [];
        try {
            const parsed = JSON.parse(stdout.trim());
            printers = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            printers = stdout.trim().split("\n").map(s => s.trim()).filter(Boolean);
        }
        return printers;
    } catch {
        return [];
    }
}

async function syncPrinters() {
    try {
        const printers = await getWindowsPrinters();
        if (printers.length > 0) {
            await fetch(`${SERVER_URL}/api/smart/agent-printers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ printers, _t: Date.now() })
            });
            console.log(`[SYNC] Serverga uzatildi, ${printers.length} ta printer mavjud.`);
        }
    } catch (e) {
        console.log(`[XATO] Printerlarni serverga ulab bo'lmadi.`);
    }
}

/**
 * LAN printer'ga to'g'ridan-to'g'ri TCP/IP (port 9100) orqali chop etish.
 * Windows spooler'siz ishlaydi — oshxona printeriga eng ishonchli usul.
 */
function printOverNetwork(ip, data, port = 9100, timeout = 8000) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        let settled = false;

        const done = (err) => {
            if (settled) return;
            settled = true;
            client.destroy();
            if (err) reject(err);
            else resolve();
        };

        const timer = setTimeout(() => {
            done(new Error(`TCP timeout: ${ip}:${port} ga ${timeout}ms ichida ulanib bo'lmadi`));
        }, timeout);

        client.connect(port, ip, () => {
            client.write(data, (writeErr) => {
                clearTimeout(timer);
                setTimeout(() => done(writeErr || null), 200);
            });
        });

        client.on('error', (err) => {
            clearTimeout(timer);
            done(err);
        });

        client.on('close', () => {
            clearTimeout(timer);
            done(null);
        });
    });
}

/**
 * Base64 ESC/POS ma'lumotini printer'ga yuborish.
 * printerIp berilsa → LAN TCP/IP, aks holda → USB Windows Spooler.
 */
async function printRaw(printerName, base64data, options = {}) {
    if (!base64data) {
        console.log(`[XATO] Ma'lumot bo'sh.`);
        return;
    }

    const rawBuffer = Buffer.from(base64data, 'base64');
    const { printerIp, printerPort = 9100 } = options;

    // ── LAN (TCP/IP) ─────────────────────────────────────────────────────────
    if (printerIp) {
        try {
            console.log(`[LAN] ${printerIp}:${printerPort} ga ulanilmoqda...`);
            await printOverNetwork(printerIp, rawBuffer, printerPort);
            console.log(`[PECHAT ✅ LAN] ${printerIp}:${printerPort} ga chop etildi.`);
        } catch (err) {
            console.log(`[XATO LAN] ${printerIp}:${printerPort} → ${String(err)}`);
        }
        return;
    }

    // ── USB / Windows Spooler ─────────────────────────────────────────────────
    if (!printerName) {
        console.log(`[XATO] printerName yoki printerIp ko'rsatilmagan.`);
        return;
    }

    const tmpFile = join(os.tmpdir(), `tmp_print_${Date.now()}.bin`);
    await writeFile(tmpFile, rawBuffer);

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
        di.pDocName = "Smart USB Invoice";
        di.pDataType = null;
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
$result = [RawPrint]::SendFileToPrinter("${printerName.replace(/"/g, '`"')}", "${tmpFile.replace(/\\/g, '\\\\')}")
if (-not $result) { exit 1 }
`;

    try {
        await execFileAsync("powershell", [
            "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
            "-Command", psScript
        ], { timeout: 15000 });
        console.log(`[PECHAT ✅ USB] "${printerName}" ga chop etildi.`);
    } catch(err) {
        console.log(`[XATO USB] "${printerName}" ga chop etib bo'lmadi:`, String(err));
    } finally {
        await unlink(tmpFile).catch(() => {});
    }
}

async function pollJobs() {
    try {
        const res = await fetch(`${SERVER_URL}/api/smart/poll-jobs`);
        if (res.ok) {
            const data = await res.json();
            if (data.jobs && data.jobs.length > 0) {
                for (const job of data.jobs) {
                    const printerName = job.printerName || job.printer || job.name || '';
                    const base64data  = job.data || job.payload || job.escpos || '';
                    const printerIp   = job.printerIp   || job.ip   || null;
                    const printerPort = job.printerPort || job.port || 9100;

                    await printRaw(printerName, base64data, { printerIp, printerPort });
                }
            }
        }
    } catch (e) {
        // Tizimga kirish biroz kechiksa ogohlantirmay turaveradi.
    }
    setTimeout(pollJobs, 2500);
}

console.log("=========================================");
console.log("  SMART PRO - LOKAL PRINTER AGENTI     ");
console.log(`  Tarmoq: ${SERVER_URL}   `);
console.log("  USB + LAN (TCP/IP 9100) qo'llab-quvvatlanadi");
console.log("  Diqqat: Ushbu ayna ochiq tursin!       ");
console.log("=========================================");

syncPrinters();
setInterval(syncPrinters, 30000);
pollJobs();
