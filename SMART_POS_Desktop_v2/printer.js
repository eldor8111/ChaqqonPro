const { execFile } = require('child_process');
const { promisify } = require('util');
const { writeFile, unlink } = require('fs/promises');
const { join } = require('path');
const os = require('os');

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
    } catch (err) {
        console.error('[PRINTER API ERROR]', err);
        return [];
    }
}

/**
 * Base64 ESC/POS ma'lumotini printer'ga Raw yuborish
 * @param {string} printerName - Printer nomi
 * @param {string} base64data  - Base64 formatidagi ESC/POS bytelar
 */
async function printRaw(printerName, base64data) {
    if (!printerName || !base64data) {
        console.error('[PRINT ERROR] Printer nomi yoki ma\'lumot kiritilmadi.');
        return { success: false, error: 'Printer nomi yoki ma\'lumot kiritilmadi.' };
    }

    const tmpFile = join(os.tmpdir(), `cq_print_v2_${Date.now()}_${Math.floor(Math.random() * 1000)}.bin`);

    try {
        await writeFile(tmpFile, Buffer.from(base64data, 'base64'));

        // PowerShell orqali Windows Raw Print API ishlatish
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

        console.log(`[PRINT ✅] "${printerName}" ga muvaffaqiyatli chop etildi.`);
        return { success: true };
    } catch (err) {
        console.error(`[PRINT ❌] "${printerName}" ga chop etib bo'lmadi:`, String(err));
        return { success: false, error: String(err) };
    } finally {
        await unlink(tmpFile).catch(() => {});
    }
}

module.exports = { getWindowsPrinters, printRaw };
