export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";

export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { name, phone, info } = await req.json();
        if (!name) return NextResponse.json({ error: "Nom majburiy" }, { status: 400 });

        const existing: any[] = await prisma.$queryRawUnsafe(
            `SELECT id FROM UbtSupplier WHERE id = ? AND tenantId = ?`,
            params.id, session.tenantId
        );
        if (!existing.length) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

        await prisma.$executeRawUnsafe(
            `UPDATE UbtSupplier SET name = ?, phone = ?, info = ? WHERE id = ? AND tenantId = ?`,
            name, phone || null, info || null, params.id, session.tenantId
        );

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const existing: any[] = await prisma.$queryRawUnsafe(
            `SELECT id FROM UbtSupplier WHERE id = ? AND tenantId = ?`,
            params.id, session.tenantId
        );
        if (!existing.length) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

        await prisma.$executeRawUnsafe(
            `DELETE FROM UbtSupplier WHERE id = ? AND tenantId = ?`,
            params.id, session.tenantId
        );

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
