export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";
import { createAuditLog } from "@/lib/backend/audit";

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const tenantId = session.tenantId;
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

        if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

        let settings = { branches: [{ id: "B-1", name: "Asosiy Filial", city: "Toshkent", manager: tenant.ownerName }] };
        if ((tenant as any).settings) {
            try {
                settings = JSON.parse((tenant as any).settings);
            } catch (e) { }
        }

        return NextResponse.json({
            tenant: {
                id: tenant.id,
                shopName: tenant.shopName,
                ownerName: tenant.ownerName,
                plan: tenant.plan,
                status: tenant.status,
                billingId: (tenant as any).billingId || null,
                expiresAt: (tenant as any).expiresAt || null,
                agentCode: (tenant as any).agentCode || null,
                settings,
            }
        });
    } catch (error) {
        console.error("Settings GET Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const tenantId = session.tenantId;
        const body = await request.json();

        if (body.settings) {
            await prisma.tenant.update({
                where: { id: tenantId },
                data: { settings: JSON.stringify(body.settings) } as any,
            });

            await createAuditLog(tenantId, session.userId ? "Admin" : "System", "Sozlamalar yangilandi", typeof body.settings?.branches !== "undefined" ? "Filiallar o'zgardi" : "Tizim sozlamalari", "update");
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Settings PUT Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
