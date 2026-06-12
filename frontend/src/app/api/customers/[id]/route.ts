export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const tenantId = session.tenantId;
        const body = await request.json();

        const customer = await prisma.customer.findUnique({
            where: { id: params.id },
        });

        if (!customer || customer.tenantId !== tenantId) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        const updated = await prisma.customer.update({
            where: { id: params.id },
            data: {
                name: body.name || customer.name,
                phone: body.phone !== undefined ? body.phone : customer.phone,
                segment: body.segment || customer.segment,
                bonusPoints: body.bonusPoints !== undefined ? body.bonusPoints : customer.bonusPoints,
            },
        });

        return NextResponse.json({ success: true, customer: updated });
    } catch (error) {
        console.error("Update customer error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const tenantId = session.tenantId;

        const customer = await prisma.customer.findUnique({
            where: { id: params.id },
        });

        if (!customer || customer.tenantId !== tenantId) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        await prisma.customer.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true, message: "Customer deleted" });
    } catch (error) {
        console.error("Delete customer error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
