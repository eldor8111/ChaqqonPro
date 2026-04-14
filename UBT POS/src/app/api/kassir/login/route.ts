export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { authenticateKassir } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";
import { SignJWT } from "jose";

function getJwtSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET environment variable is not set! .env.local faylini tekshiring.");
    return new TextEncoder().encode(secret);
}

// ─── Rate limiting: IP bo'yicha 5 urinish / 60 soniya ───────────────────────
const _rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Har 60 soniyada eskirgan yozuvlarni tozalash (memory leak oldini olish)
setInterval(() => {
    const now = Date.now();
    _rateLimitMap.forEach((v, k) => {
        if (v.resetAt < now) _rateLimitMap.delete(k);
    });
}, 60_000);

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = _rateLimitMap.get(ip);
    if (!entry || entry.resetAt < now) {
        _rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
        return true;
    }
    if (entry.count >= 5) return false;
    entry.count++;
    return true;
}

export async function POST(request: NextRequest) {
    try {
        // Rate limiting: IP bo'yicha 5 urinish / 60 soniya
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
        if (!checkRateLimit(ip)) {
            return NextResponse.json(
                { success: false, error: "Juda ko'p urinish. 1 daqiqadan so'ng qayta urinib ko'ring" },
                { status: 429 }
            );
        }

        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { success: false, error: "Username va Parol kiritilishi shart" },
                { status: 400 }
            );
        }

        // Normalize input: strip all non-digits, take last 9 chars
        const inputDigits = username.replace(/\D/g, "").slice(-9);

        // Find active staff by username OR phone OR name
        const staffByUsername = await prisma.staff.findMany({
            where: { username, status: "active" },
        });

        // Search by phone (last 9 digits match)
        const staffByPhone: typeof staffByUsername = [];
        if (staffByUsername.length === 0 && inputDigits.length >= 7) {
            const allActive = await prisma.staff.findMany({ where: { status: "active" } });
            for (const s of allActive) {
                if (s.phone && s.phone.replace(/\D/g, "").slice(-9) === inputDigits) {
                    staffByPhone.push(s);
                }
            }
        }

        // Also try searching by name
        const staffByName = staffByUsername.length === 0 && staffByPhone.length === 0
            ? await prisma.staff.findMany({
                where: { status: "active", name: { contains: username } },
            }).then(all => all.filter(s => s.name.toLowerCase() === username.toLowerCase()))
            : [];

        const staffList = [...staffByUsername, ...staffByPhone, ...staffByName];

        if (staffList.length === 0) {
            return NextResponse.json({ success: false, error: "Foydalanuvchi topilmadi. Login: @username yoki qurilma nomi bilan kiring" }, { status: 401 });
        }

        // Try to authenticate against matched staff
        let authenticatedStaff = null;
        let authenticatedTenant = null;

        for (const staff of staffList) {
            const result = await authenticateKassir(staff.username, password, staff.tenantId);
            if (result.success && result.staff) {
                const tenant = await prisma.tenant.findUnique({
                    where: { id: staff.tenantId },
                });
                if (tenant && tenant.status === "active") {
                    authenticatedStaff = staff;
                    authenticatedTenant = tenant;
                    break;
                }
            }
        }

        if (!authenticatedStaff || !authenticatedTenant) {
            return NextResponse.json({ success: false, error: "Login yoki parol noto'g'ri" }, { status: 401 });
        }

        // Create JWT token
        const token = await new SignJWT({
            userId: authenticatedStaff.id,
            name: authenticatedStaff.name,
            tenantId: authenticatedTenant.id,
            role: "KASSIR",
            shopCode: authenticatedTenant.shopCode,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("24h")
            .sign(getJwtSecret());

        let tenantSettings: Record<string, unknown> = {};
        try { tenantSettings = authenticatedTenant.settings ? JSON.parse(authenticatedTenant.settings) : {}; } catch { tenantSettings = {}; }
        const tenantShopType = (tenantSettings.shopType as string) || "shop";

        let parsedPermissions: string[] = [];
        try { parsedPermissions = JSON.parse(authenticatedStaff.permissions); } catch { parsedPermissions = []; }

        // Extract printerIp from phone field JSON
        let staffPrinterIp = "";
        try {
            const phoneData = authenticatedStaff.phone ? JSON.parse(authenticatedStaff.phone) : {};
            staffPrinterIp = phoneData.printerIp || "";
        } catch { staffPrinterIp = ""; }

        let serviceFeePct = 10;
        try {
            const meta = authenticatedStaff.staffMeta ? JSON.parse(authenticatedStaff.staffMeta) : {};
            if (meta.serviceFeePct !== undefined) serviceFeePct = meta.serviceFeePct;
        } catch {}

        const sessionData = {
            user: {
                id: authenticatedStaff.id,
                name: authenticatedStaff.name,
                role: authenticatedStaff.role, // actual role (e.g. "Manablog")
                tenantId: authenticatedTenant.id,
                branch: authenticatedStaff.branch,
                permissions: parsedPermissions,
                printerIp: staffPrinterIp,
                serviceFeePct,
            },
            token,
        };

        return NextResponse.json({
            success: true,
            shopType: tenantShopType,
            shopCode: authenticatedTenant.shopCode,
            session: sessionData,
        });

    } catch (error) {
        console.error("Kassir login error:", error);
        return NextResponse.json({ success: false, error: "Server xatoligi" }, { status: 500 });
    }
}
