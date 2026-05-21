const { execFile } = require("child_process");
const { promisify } = require("util");
const { writeFile, unlink } = require("fs/promises");
const { join } = require("path");

const execFileAsync = promisify(execFile);

// E-Code UZ orqali bulutli server bilan sinxronizatsiya
const SERVER_URL = "https://chaqqonpro.e-code.uz";

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

async function printRaw(printerName, base64data) {
    const tmpFile = join(process.cwd(), `tmp_print_${Date.now()}.bin`);
    await writeFile(tmpFile, Buffer.from(base64data, 'base64'));

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
        di.pDocName = "ChaqqonPro USB Invoice";
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
$result = [RawPrint]::SendFileToPrinter("${printerName}", "${tmpFile}")
if (-not $result) { exit 1 }
`;

    try {
        await execFileAsync("powershell", [
            "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
            "-Command", psScript
        ], { timeout: 15000 });
        console.log(`[PECHAT] ${printerName} ga chop etildi.`);
    } catch(err) {
        console.log(`[XATO] ${printerName} ga chop etib bo'lmadi:`, String(err));
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
                    await printRaw(job.printerName, job.data);
                }
            }
        }
    } catch (e) {
        // Tizimga kirish biroz kechiksa ogohlantirmay turaveradi.
    }
    setTimeout(pollJobs, 2500); // Har 2.5 soniyada serverdan chop etish uchun job kutadi
}

console.log("=========================================");
console.log("  CHAQQON PRO - LOKAL PRINTER AGENTI     ");
console.log(`  Tarmoq: ${SERVER_URL}   `);
console.log("  Diqqat: Ushbu ayna ochiq tursin!       ");
console.log("=========================================");

syncPrinters();
setInterval(syncPrinters, 30000); // printerlar o'zgarsa har 30 sekunda sinxron qiladi
pollJobs();
