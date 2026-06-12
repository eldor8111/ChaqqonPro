const { execFile, execSync } = require('child_process');
const { promisify } = require('util');
const { writeFile, unlink } = require('fs/promises');
const { join } = require('path');
const os = require('os');
const net = require('net');

const execFileAsync = promisify(execFile);

// ══════════════════════════════════════════════════════════════════
//  PRINTER DISCOVERY — LAN scan + USB (wmic) + COM portlar
//  ChaqqonPro PrinterDiscovery.ts dan port qilingan (JavaScript)
// ══════════════════════════════════════════════════════════════════

/**
 * Bitta IP:port ga TCP urinib ko'rish (timeout ms ichida)
 * @returns {Promise<boolean>}
 */
function probeTCP(ip, port, timeout = 800) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let resolved = false;

        const done = (val) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timer);
            socket.destroy();
            resolve(val);
        };

        const timer = setTimeout(() => done(false), timeout);

        // TCP ulanish muvaffaqiyatli bo'lsa — printer mavjud (javob kutish shart emas)
        socket.connect(port, ip, () => done(true));

        socket.on('error', () => done(false));
    });
}

/**
 * Barcha lokal tarmoq subnetlarini aniqlash (WiFi + Ethernet + ...)
 * @returns {string[]} masalan: ["192.168.1", "192.168.123"]
 */
function getLocalSubnets() {
    const subnets = new Set();
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
        for (const iface of (ifaces[name] || [])) {
            if (iface.family === 'IPv4' && !iface.internal) {
                const parts = iface.address.split('.');
                subnets.add(`${parts[0]}.${parts[1]}.${parts[2]}`);
            }
        }
    }
    return [...subnets];
}

/**
 * ARP jadvalidan ma'lum IP larni olish — OS allaqachon ko'rgan qurilmalar.
 * Printer boshqa subnetda bo'lsa ham kabel orqali ulangan bo'lsa shu yerda chiqadi.
 * @returns {Promise<string[]>}
 */
async function getArpCandidates() {
    if (process.platform !== 'win32') return [];
    try {
        const raw = execSync('arp -a', { encoding: 'utf8', timeout: 5000, windowsHide: true });
        const ips = new Set();
        for (const line of raw.split('\n')) {
            const m = line.match(/^\s*(\d{1,3}(?:\.\d{1,3}){3})\s+([0-9a-f]{2}(?:-[0-9a-f]{2}){5})/i);
            if (!m) continue;
            const ip = m[1];
            // Broadcast/multicast manzillarni o'tkazib yuborish
            if (ip.endsWith('.255') || ip.startsWith('224.') || ip.startsWith('239.') || ip === '255.255.255.255') continue;
            ips.add(ip);
        }
        return [...ips];
    } catch {
        return [];
    }
}

/**
 * Tarmoqdagi barcha IP-larni port 9100 uchun skanerlash
 * Har 30 ta IP ni parallel tekshiradi (tez + xavfsiz)
 * @param {string} subnet - "192.168.1" formatida
 * @param {number} port   - Printer TCP port (odatda 9100)
 * @param {number} timeout - Har bir IP uchun timeout ms
 * @returns {Promise<Array<{ip, port, method, name}>>}
 */
async function tcpScanSubnet(subnet, port = 9100, timeout = 800) {
    const found = [];
    const BATCH = 30;

    for (let start = 1; start <= 254; start += BATCH) {
        const end = Math.min(start + BATCH - 1, 254);
        const batch = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        const results = await Promise.allSettled(
            batch.map(i => probeTCP(`${subnet}.${i}`, port, timeout))
        );
        results.forEach((r, idx) => {
            if (r.status === 'fulfilled' && r.value) {
                found.push({ ip: `${subnet}.${batch[idx]}`, port, method: 'tcp_scan', name: null });
            }
        });
    }
    return found;
}

/**
 * Windows'dagi USB/lokal printerlarni wmic orqali topish.
 * PowerShell Get-Printer dan ko'ra to'liqroq ma'lumot beradi
 * (port nomi, virtual portlarni filtrlaydi).
 * @returns {Promise<Array<{ip, port, method, name}>>}
 */
async function discoverUSBPrinters() {
    if (process.platform !== 'win32') return [];
    try {
        const raw = execSync(
            'wmic printer get Name,PortName /format:list',
            { encoding: 'utf8', timeout: 8000, windowsHide: true }
        );

        // wmic \r\r\n quirk normalizatsiya
        const out = raw.replace(/\r+\n/g, '\n').replace(/\r/g, '\n');

        const found = [];
        const seen = new Set();
        const VIRTUAL_PORTS = new Set([
            'PORTPROMPT:', 'SHRFAX:', 'NUL:', 'FILE:'
        ]);

        const blocks = out.split(/\n\n+/).filter(b => b.trim());
        for (const block of blocks) {
            const nameLine = block.match(/^Name=(.+)$/m);
            const portLine = block.match(/^PortName=(.+)$/m);
            if (!nameLine || !portLine) continue;

            const name = nameLine[1].trim();
            const portName = portLine[1].trim().toUpperCase();

            // Virtual, WSD, Microsoft, uzun nomli portlarni o'tkazib yuborish
            if (VIRTUAL_PORTS.has(portName)) continue;
            if (portName.startsWith('WSD-')) continue;
            if (portName.startsWith('MICROSOFT')) continue;
            if (portName.startsWith('NULPORT')) continue;
            if (portName.length > 60) continue;
            // Tarmoq IP manzili — LAN printer, USB emas
            if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(portName)) continue;
            if (portName.startsWith('IP_')) continue;

            if (seen.has(portName)) continue;
            seen.add(portName);

            found.push({ ip: portName, port: 0, method: 'usb', name });
        }
        return found;
    } catch (err) {
        console.warn('[DISCOVERY USB] wmic xatoligi, Get-Printer orqali urinamiz:', err.message);
        // Fallback: PowerShell Get-Printer
        return getWindowsPrinters().then(names =>
            names.map(n => ({ ip: n, port: 0, method: 'usb', name: n }))
        );
    }
}

/**
 * COM port orqali ulangan printerlarni topish (USB→Serial adapter).
 * serialport paketi bo'lmasa — bo'sh massiv qaytaradi.
 * @returns {Promise<Array<{ip, port, method, name}>>}
 */
async function discoverCOMPrinters() {
    try {
        const { SerialPort } = require('serialport');
        const ports = await SerialPort.list();
        return ports
            .filter(p => p.path.startsWith('COM') || p.path.startsWith('/dev/tty'))
            .map(p => ({
                ip: p.path,
                port: 0,
                method: 'com',
                name: p.manufacturer ? `${p.manufacturer} (${p.path})` : p.path,
            }));
    } catch {
        return []; // serialport o'rnatilmagan bo'lsa — jimgina o'tkazib yuborish
    }
}

/**
 * Barcha usullar bilan printer qidirish: LAN + USB + COM
 * @returns {Promise<Array<{ip, port, method, name}>>}
 */
async function discoverAllPrinters() {
    // 1) Barcha lokal subnetlar + mashhur printer zavod subnetlari
    const subnets = getLocalSubnets();
    const COMMON_PRINTER_SUBNETS = ['192.168.123', '192.168.0', '192.168.1'];
    for (const c of COMMON_PRINTER_SUBNETS) {
        if (!subnets.includes(c)) subnets.push(c);
    }
    console.log(`[DISCOVERY] Qidiruv boshlandi... Subnetlar: ${subnets.join(', ') || 'aniqlanmadi'}`);

    // 2) ARP jadvalidagi ma'lum qurilmalarni to'g'ridan-to'g'ri probe qilish (tez)
    const arpScan = (async () => {
        const ips = await getArpCandidates();
        const results = await Promise.allSettled(ips.map(ip => probeTCP(ip, 9100, 800)));
        const found = [];
        results.forEach((r, idx) => {
            if (r.status === 'fulfilled' && r.value) {
                found.push({ ip: ips[idx], port: 9100, method: 'tcp_scan', name: null });
            }
        });
        return found;
    })();

    const [subnetResults, arpFound, usbFound, comFound] = await Promise.all([
        Promise.all(subnets.map(s => tcpScanSubnet(s, 9100, 800))),
        arpScan,
        discoverUSBPrinters(),
        discoverCOMPrinters(),
    ]);
    const tcpFound = [...subnetResults.flat(), ...arpFound];

    const all = [...tcpFound, ...usbFound, ...comFound];

    // Dublikatlarni olib tashlash
    const seen = new Set();
    const unique = all.filter(p => {
        const key = `${p.method}:${p.ip}:${p.port}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    console.log(`[DISCOVERY ✅] Topildi: ${tcpFound.length} LAN + ${usbFound.length} USB + ${comFound.length} COM = ${unique.length} jami`);
    return unique;
}

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
    } catch (err) {
        console.error('[PRINTER API ERROR]', err);
        return [];
    }
}

/**
 * LAN printer'ga to'g'ridan-to'g'ri TCP/IP (port 9100) orqali chop etish
 * Bu usul Windows spooler'siz ishlaydi — oshxona printeriga ideal
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
                // Ma'lumot yozib bo'lingach, printer tomondan javob kutmaymiz
                // Kichik kutish — printer bufferini to'ldirish uchun
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
        di.pDocName = "SMART POS Invoice V2";
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
    ], { timeout: 25000 });
}

/**
 * Base64 ESC/POS ma'lumotini printer'ga yuborish.
 *
 * Agar job'da `printerIp` berilgan bo'lsa → LAN (TCP/IP port 9100) orqali chop etadi.
 * Aks holda → Windows Spooler orqali (USB / Windows network printer).
 *
 * @param {string} printerName - Windows printer nomi (USB/Spooler uchun)
 * @param {string} base64data  - Base64 formatidagi ESC/POS bytelar
 * @param {object} [options]   - Qo'shimcha sozlamalar
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
            console.log(`[PRINT ✅ LAN] ${printerIp}:${printerPort} ga muvaffaqiyatli chop etildi.`);
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

    const tmpFile = join(os.tmpdir(), `cq_print_v2_${Date.now()}_${Math.floor(Math.random() * 1000)}.bin`);
    try {
        await writeFile(tmpFile, rawBuffer);
        await printViaSpooler(printerName, tmpFile);
        console.log(`[PRINT ✅ USB] "${printerName}" ga muvaffaqiyatli chop etildi.`);
        return { success: true, method: 'usb' };
    } catch (err) {
        console.error(`[PRINT ❌ USB] "${printerName}" → ${String(err)}`);
        return { success: false, error: String(err), method: 'usb' };
    } finally {
        await unlink(tmpFile).catch(() => {});
    }
}

module.exports = {
    getWindowsPrinters,
    printRaw,
    printOverNetwork,
    discoverAllPrinters,
    discoverUSBPrinters,
    tcpScanSubnet,
};
