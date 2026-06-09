export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getSuperSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";

// POST /api/super-admin/billing/extend
// Body: { tenantId: string, days: number }
export async function POST(request: NextRequest) {
    try {
        const session = await getSuperSession();
        if (!session || (session.role !== "SUPER_ADMIN" && !(session as any).permissions?.includes("billing:manage"))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { tenantId, days } = await request.json();
        if (!tenantId || !days || days <= 0) {
            return NextResponse.json({ error: "tenantId va musbat days talab qilinadi" }, { status: 400 });
        }

        // Fetch current expiry
        const rows = await prisma.$queryRaw`
            SELECT id, expiresAt FROM Tenant WHERE id = ${tenantId}
        ` as any[];

        if (!rows.length) {
            return NextResponse.json({ error: "Tashkilot topilmadi" }, { status: 404 });
        }

        const tenant = rows[0];
        // Start from NOW or from current expiry if it's in the future
        const base = tenant.expiresAt && new Date(tenant.expiresAt) > new Date()
            ? new Date(tenant.expiresAt)
            : new Date();
        
        const newExpiry = new Date(base);
        newExpiry.setDate(newExpiry.getDate() + Number(days));

        await prisma.$executeRaw`
            UPDATE Tenant SET expiresAt = ${newExpiry}, status = 'active' WHERE id = ${tenantId}
        `;

        return NextResponse.json({
            success: true,
            newExpiresAt: newExpiry.toISOString(),
            message: `Obuna ${days} kunga uzaytirildi`,
        });
    } catch (error) {
        console.error("Extend subscription error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
