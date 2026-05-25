/**
 * printer.js — Raw ESC/POS chek chiqarish moduli
 * USB (Windows Spooler) va LAN (TCP/IP port 9100) ikkalasini qo'llab-quvvatlaydi.
 */

const { execFile } = require('child_process');
const { promisify } = require('util');
const { writeFile, unlink } = require('fs/promises');
const { join } = require('path');
const os = require('os');
const net = require('net');

const execFileAsync = promisify(execFile);

/**
 * Windows'dagi barcha printerlar ro'yxatini olish
 * @returns {Promise<string[]>}
 */
async function getWindowsPrinters() {
    try {
        const { stdout } = await execFileAsync('powershell', [
            '-NoProfile', '-NonInteractive',
            '-Command',
            'Get-Printer | Select-Object -ExpandProperty Name | ConvertTo-Json -Compress'
        ], { timeout: 8000 });

        const trimmed = stdout.trim();
        if (!trimmed) return [];

        try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            return trimmed.split('\n').map(s => s.trim()).filter(Boolean);
        }
    } catch {
        return [];
    }
}

/**
 * LAN printer'ga to'g'ridan-to'g'ri TCP/IP (port 9100) orqali chop etish.
 * Windows spooler'siz ishlaydi — oshxona printeriga eng ishonchli usul.
 * @param {string} ip      - Printer IP manzili (masalan: "192.168.1.100")
 * @param {Buffer} data    - ESC/POS raw bytes
 * @param {number} port    - TCP port (odatda 9100)
 * @param {number} timeout - Timeout ms (default: 8000)
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
                // Printer bufferini to'ldirish uchun kichik kutish
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
 * Windows Spooler orqali USB/lokal printer'ga Raw chop etish
 * @param {string} printerName - Windows'dagi printer nomi
 * @param {string} tmpFile     - Chop etiladigan vaqtinchalik fayl yo'li
 */
async function printViaSpooler(printerName, tmpFile) {
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
        di.pDocName = "SMART Invoice";
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

    await execFileAsync('powershell', [
        '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
        '-Command', psScript
    ], { timeout: 20000 });
}

/**
 * Base64 ESC/POS ma'lumotini printer'ga yuborish.
 *
 * Agar job'da `printerIp` berilgan bo'lsa → LAN (TCP/IP port 9100) orqali chop etadi.
 * Aks holda → Windows Spooler orqali (USB / Windows network printer).
 *
 * @param {string} printerName           - Windows printer nomi (USB/Spooler uchun)
 * @param {string} base64data            - Base64 formatidagi ESC/POS bytelar
 * @param {object} [options]             - Qo'shimcha sozlamalar
 * @param {string} [options.printerIp]   - LAN printer IP (masalan "192.168.1.100")
 * @param {number} [options.printerPort] - LAN printer TCP port (default: 9100)
 */
async function printRaw(printerName, base64data, options = {}) {
    if (!base64data) {
        const msg = `[PRINT ERROR] Ma'lumot (base64data) kiritilmadi.`;
        console.error(msg);
        return { success: false, error: msg };
    }

    const rawBuffer = Buffer.from(base64data, 'base64');
    const { printerIp, printerPort = 9100 } = options;

    // ── LAN (TCP/IP) ulanish ──────────────────────────────────────────────────
    if (printerIp) {
        try {
            console.log(`[PRINT LAN] ${printerIp}:${printerPort} ga ulanilmoqda...`);
            await printOverNetwork(printerIp, rawBuffer, printerPort);
            console.log(`[PRINT ✅ LAN] ${printerIp}:${printerPort} — muvaffaqiyatli chop etildi.`);
            return { success: true, method: 'lan' };
        } catch (err) {
            console.error(`[PRINT ❌ LAN] ${printerIp}:${printerPort} → ${String(err)}`);
            return { success: false, error: String(err), method: 'lan' };
        }
    }

    // ── USB / Windows Spooler ulanish ─────────────────────────────────────────
    if (!printerName) {
        const msg = `[PRINT ERROR] printerName yoki printerIp ko'rsatilmadi.`;
        console.error(msg);
        return { success: false, error: msg };
    }

    const tmpFile = join(os.tmpdir(), `cq_print_${Date.now()}.bin`);
    try {
        await writeFile(tmpFile, rawBuffer);
        await printViaSpooler(printerName, tmpFile);
        console.log(`[PRINT ✅ USB] "${printerName}" — muvaffaqiyatli chop etildi.`);
        return { success: true, method: 'usb' };
    } catch (err) {
        console.error(`[PRINT ❌ USB] "${printerName}" → ${String(err)}`);
        return { success: false, error: String(err), method: 'usb' };
    } finally {
        await unlink(tmpFile).catch(() => {});
    }
}

module.exports = { getWindowsPrinters, printRaw, printOverNetwork };
