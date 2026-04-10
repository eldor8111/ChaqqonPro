export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { getSession } from "@/lib/backend/auth";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/backend/jwt";

const execAsync = promisify(exec);

// GET — Windows dagi o'rnatilgan printer ro'yxatini qaytaradi
export async function GET(request: NextRequest) {
    // Auth tekshiruvi — faqat autentifikatsiya qilingan foydalanuvchilar
    let authorized = false;
    try {
        const session = await getSession();
        if (session?.tenantId || session?.role === "SUPER_ADMIN") authorized = true;
    } catch {}
    if (!authorized) {
        const authHeader = request.headers.get("Authorization");
        if (authHeader?.startsWith("Bearer ")) {
            try {
                const { payload } = await jwtVerify(authHeader.slice(7), JWT_SECRET);
                if (payload.tenantId) authorized = true;
            } catch {}
        }
    }
    if (!authorized) return NextResponse.json({ printers: [] }, { status: 401 });

    try {
        // PowerShell: Windows printer list
        const { stdout } = await execAsync(
            `powershell -Command "Get-Printer | Select-Object -ExpandProperty Name | ConvertTo-Json"`,
            { timeout: 8000 }
        );

        let printers: string[] = [];
        try {
            const parsed = JSON.parse(stdout.trim());
            printers = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            // Single printer returns string, not array
            printers = stdout.trim().split("\n").map((s: string) => s.trim()).filter(Boolean);
        }

        return NextResponse.json({ printers });
    } catch {
        // PowerShell command failed — try wmic fallback
        try {
            const { stdout: wmicOut } = await execAsync(
                `wmic printer get name /format:list`,
                { timeout: 8000 }
            );
            const printers = wmicOut
                .split("\n")
                .map((l: string) => l.trim())
                .filter((l: string) => l.startsWith("Name="))
                .map((l: string) => l.slice(5).trim())
                .filter(Boolean);
            return NextResponse.json({ printers });
        } catch {
            return NextResponse.json({ printers: [], error: "Printer ro'yxatini olishda xatolik" });
        }
    }
}
