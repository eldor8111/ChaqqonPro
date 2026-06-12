const { execFile } = require("child_process");
const { promisify } = require("util");
const { writeFile, unlink } = require("fs/promises");
const { join } = require("path");

const execFileAsync = promisify(execFile);

async function printUsb(printerName, data) {
    const tmpFile = join(process.cwd(), `tmp_print_${Date.now()}.bin`);
    await writeFile(tmpFile, data);

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
        
        // Bu safar pDataType ni null qilib jo'natib ko'ramiz (yoki kerak bo'lsa "TEXT")
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Smart Receipt";
        di.pDataType = null; // NULL qilsak printer o'zining default turini ishlatishi kerak
        
        bool ok = false;
        if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    ok = WritePrinter(hPrinter, pBytes, bytes.Length, out dwWritten);
                    if (!ok) Console.WriteLine("WritePrinter failed. Error: " + Marshal.GetLastWin32Error());
                    EndPagePrinter(hPrinter);
                } else {
                    Console.WriteLine("StartPagePrinter failed. Error: " + Marshal.GetLastWin32Error());
                }
                EndDocPrinter(hPrinter);
            } else {
                int err = Marshal.GetLastWin32Error();
                Console.WriteLine("StartDocPrinter with null datatype failed. Error: " + err);
                
                // Fallback: agar baribir ishlamasa, TEXT formatida harakat qilib ko'ramiz
                di.pDataType = "TEXT";
                if (StartDocPrinter(hPrinter, 1, di)) {
                    if (StartPagePrinter(hPrinter)) {
                        ok = WritePrinter(hPrinter, pBytes, bytes.Length, out dwWritten);
                        EndPagePrinter(hPrinter);
                    }
                    EndDocPrinter(hPrinter);
                    Console.WriteLine("Note: StartDocPrinter worked with 'TEXT' datatype instead of RAW/null.");
                } else {
                    Console.WriteLine("StartDocPrinter with 'TEXT' datatype also failed. Error: " + Marshal.GetLastWin32Error());
                }
            }
            ClosePrinter(hPrinter);
        } else {
            Console.WriteLine("OpenPrinter failed for: " + szPrinterName + ". Error: " + Marshal.GetLastWin32Error());
        }
        Marshal.FreeCoTaskMem(pBytes);
        fs.Close();
        return ok;
    }
}
"@
Add-Type -TypeDefinition $code -Language CSharp
$result = [RawPrint]::SendFileToPrinter("${printerName}", "${tmpFile}")
if (-not $result) { 
    exit 1 
}
`;

    try {
        console.log("Running powershell script with datatype fixes...");
        const { stdout, stderr } = await execFileAsync("powershell", [
            "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
            "-Command", psScript
        ], { timeout: 15000 });
        console.log("STDOUT:", stdout);
        console.log("STDERR:", stderr);
    } catch (err) {
        console.error("EXEC ERROR:", err);
    } finally {
        await unlink(tmpFile).catch(() => {});
    }
}

const printerName = "XP-80"; 
const text = Buffer.from([0x1b, 0x40, ...Buffer.from("Test Print 2\n\n\n\n\n"), 0x1d, 0x56, 0x41, 0x03]);

printUsb(printerName, text).then(() => console.log("Done"));
