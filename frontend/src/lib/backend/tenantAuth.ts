/**
 * Tenant auth helper — cookie session yoki Bearer token orqali tenantId aniqlash.
 * Printer queue API lari uchun umumiy.
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/backend/jwt";

export async function getAuthTenantId(request: NextRequest): Promise<string | null> {
    // Eski DB larda print jadvallarini yaratish (idempotent, bir marta)
    const { ensurePrintSchema } = await import("@/lib/backend/printSchemaBootstrap");
    await ensurePrintSchema();
    try {
        const cookieSession = await getSession();
        if (cookieSession?.tenantId) return cookieSession.tenantId;
    } catch {}
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        try {
            const { payload } = await jwtVerify(authHeader.slice(7), JWT_SECRET);
            if (payload.tenantId) return payload.tenantId as string;
        } catch {}
    }
    // EXE offline rejimi — yagona lokal tenant
    const firstTenant = await prisma.tenant.findFirst({ where: { status: "active" } });
    return firstTenant?.id ?? null;
}
