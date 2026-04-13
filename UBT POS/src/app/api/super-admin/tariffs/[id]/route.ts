import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSuperSession } from "@/lib/backend/auth";

// PUT /api/super-admin/tariffs/[id] — tarif tahrirlash
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getSuperSession();
        if (!session || session.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Faqat Super Admin uchun" }, { status: 403 });
        }

        const { id } = params;
        const body = await req.json();
        const { name, description, pricePerMonth, durationDays, maxUsers, maxBranches, sortOrder, isActive } = body;

        const tariff = await prisma.tariff.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(description !== undefined && { description: description?.trim() || null }),
                ...(pricePerMonth !== undefined && { pricePerMonth: Number(pricePerMonth) }),
                ...(durationDays !== undefined && { durationDays: Number(durationDays) }),
                ...(maxUsers !== undefined && { maxUsers: Number(maxUsers) }),
                ...(maxBranches !== undefined && { maxBranches: Number(maxBranches) }),
                ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
                ...(isActive !== undefined && { isActive: Boolean(isActive) }),
            },
        });
        return NextResponse.json({ tariff });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// DELETE /api/super-admin/tariffs/[id] — softdelete (isActive=false)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getSuperSession();
        if (!session || session.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Faqat Super Admin uchun" }, { status: 403 });
        }

        await prisma.tariff.update({
            where: { id: params.id },
            data: { isActive: false },
        });
        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
