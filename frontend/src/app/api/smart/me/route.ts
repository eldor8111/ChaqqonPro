export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/backend/jwt";

// Returns current session's tenantId + restaurant name — used by QR modal
export async function GET(request: NextRequest) {
    try {
        // Cookie session
        let tenantId: string | null = null;
        try {
            const session = await getSession();
            if (session?.tenantId) tenantId = session.tenantId;
        } catch { }

        // Bearer token fallback
        if (!tenantId) {
            const auth = request.headers.get("Authorization");
            if (auth?.startsWith("Bearer ")) {
                try {
                    const { payload } = await jwtVerify(auth.slice(7), JWT_SECRET);
                    if (payload.tenantId) tenantId = payload.tenantId as string;
                } catch { }
            }
        }

        if (!tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { id: true, name: true, settings: true }
        });

        if (!tenant) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        // Parse restaurant info from settings
        let restaurantInfo: Record<string, string> = {};
        try {
            const parsed = JSON.parse(tenant.settings as string || "{}");
            restaurantInfo = parsed.restaurantInfo || {};
        } catch { }

        return NextResponse.json({
            tenantId: tenant.id,
            name: tenant.name,
            restaurantInfo,
        });
    } catch (error) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
