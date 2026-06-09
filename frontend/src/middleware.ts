/**
 * Next.js Edge Middleware — Global Rate Limiting
 * /api/auth/* va /api/kassir/* yo'llari uchun
 *
 * Edge runtime da import cheklovlari bor — faqat Web API ishlatiladi.
 */
import { NextRequest, NextResponse } from "next/server";

// In-memory store (Edge runtime da module-level state)
const _ipMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
    "/api/auth":   { max: 10, windowMs: 60_000 },  // 10 req/min
    "/api/kassir": { max: 10, windowMs: 60_000 },  // 10 req/min
};

function getLimit(pathname: string) {
    for (const [prefix, limit] of Object.entries(RATE_LIMITS)) {
        if (pathname.startsWith(prefix)) return limit;
    }
    return null;
}

function checkLimit(ip: string, limit: { max: number; windowMs: number }): boolean {
    const now = Date.now();
    const key = `${ip}`;
    const entry = _ipMap.get(key);

    if (!entry || entry.resetAt < now) {
        // Expired yozuvlarni tozalash — Map 1000 dan oshganda (memory leak oldini olish)
        if (_ipMap.size > 1000) {
            _ipMap.forEach((v, k) => {
                if (v.resetAt < now) _ipMap.delete(k);
            });
        }
        _ipMap.set(key, { count: 1, resetAt: now + limit.windowMs });
        return true;
    }
    if (entry.count >= limit.max) return false;
    entry.count++;
    return true;
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const limit = getLimit(pathname);
    if (!limit) return NextResponse.next();

    const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        "unknown";

    if (!checkLimit(ip, limit)) {
        return NextResponse.json(
            { success: false, error: "Juda ko'p urinish. 1 daqiqadan so'ng qayta urinib ko'ring" },
            { status: 429, headers: { "Retry-After": "60" } }
        );
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/api/auth/:path*", "/api/kassir/:path*"],
};
