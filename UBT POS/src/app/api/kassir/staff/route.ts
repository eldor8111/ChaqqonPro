export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";

export async function GET() {
    try {
        let tenantId: string | null = null;
        const session = await getSession();
        if (session?.tenantId) {
            tenantId = session.tenantId;
        } else {
            const firstTenant = await prisma.tenant.findFirst({ where: { status: "active" } });
            tenantId = firstTenant?.id ?? null;
        }

        if (!tenantId) {
            return NextResponse.json({ staff: [] });
        }

        const staff = await prisma.staff.findMany({
            where: {
                tenantId,
                status: "active",
            },
            select: {
                id: true,
                name: true,
                role: true,
                username: true,
                branch: true,
                permissions: true,
            },
            orderBy: { name: "asc" },
        });

        const kassirs = staff
            .map(s => {
                let permissions: string[] = [];
                try { permissions = JSON.parse(s.permissions); } catch {}
                return { ...s, permissions };
            })
            .filter(s => s.permissions.includes("pos"));

        return NextResponse.json({ staff: kassirs });
    } catch (error) {
        console.error("Get kassir staff error:", error);
        return NextResponse.json({ staff: [] });
    }
}
