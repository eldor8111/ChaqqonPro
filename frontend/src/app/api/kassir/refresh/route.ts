/**
 * /api/kassir/refresh — JWT Token Yangilash
 *
 * Eskirayotgan tokenni (< 2h qolgan) yangi 24h token bilan almashtiradi.
 * Kassir qayta login qilinmasdan ishlashni davom ettiradi.
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { JwtRefreshSchema } from "@/lib/validators/auth.schema";

function getJwtSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET env not set!");
    return new TextEncoder().encode(secret);
}

// Rate limit — refresh uchun: 5 req/10 daqiqa per IP
const _refreshMap = new Map<string, { count: number; resetAt: number }>();
function checkRefreshLimit(ip: string): boolean {
    const now = Date.now();
    const entry = _refreshMap.get(ip);
    if (!entry || entry.resetAt < now) {
        if (_refreshMap.size > 1000) {
            _refreshMap.forEach((v, k) => {
                if (v.resetAt < now) _refreshMap.delete(k);
            });
        }
        _refreshMap.set(ip, { count: 1, resetAt: now + 600_000 });
        return true;
    }
    if (entry.count >= 5) return false;
    entry.count++;
    return true;
}

export async function POST(req: NextRequest) {
    try {
        // 1. Rate limit
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
        if (!checkRefreshLimit(ip)) {
            return NextResponse.json(
                { success: false, error: "Juda ko'p refresh urinishi" },
                { status: 429 }
            );
        }

        // 2. Input validation
        const body = await req.json();
        const parsed = JwtRefreshSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, error: "Token kiritilishi shart" }, { status: 400 });
        }

        const { token } = parsed.data;
        const secret = getJwtSecret();

        // 3. Verify existing token (expired bo'lsa ham tekshirish uchun clockTolerance)
        let payload: Record<string, unknown>;
        try {
            const { payload: p } = await jwtVerify(token, secret, {
                clockTolerance: 60 * 60 * 2, // 2h muddati o'tgan token ham qabul qilinadi
            });
            payload = p as Record<string, unknown>;
        } catch {
            return NextResponse.json(
                { success: false, error: "Token yaroqsiz yoki muddati uzoq o'tgan" },
                { status: 401 }
            );
        }

        // 4. Tokenning asl muddati — agar > 2h qolgan bo'lsa refresh shart emas
        const exp = payload.exp as number;
        const remaining = exp * 1000 - Date.now();
        if (remaining > 2 * 60 * 60 * 1000) {
            return NextResponse.json({
                success: true,
                token, // Eski token hali amal qiladi
                refreshed: false,
                expiresIn: Math.floor(remaining / 1000),
            });
        }

        // 5. Yangi 24h token chiqarish (xuddi shu payload)
        const newToken = await new SignJWT({
            userId:   payload.staffId || payload.userId,
            name:     payload.name,
            role:     payload.role,
            shopCode: payload.shopCode,
            tenantId: payload.tenantId,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("24h")
            .setIssuedAt()
            .sign(secret);

        return NextResponse.json({
            success:   true,
            token:     newToken,
            refreshed: true,
        });

    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[kassir/refresh]", msg);
        return NextResponse.json({ success: false, error: "Server xatoligi" }, { status: 500 });
    }
}
