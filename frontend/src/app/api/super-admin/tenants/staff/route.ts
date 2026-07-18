export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getSuperSession, hashPassword } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";

async function isSuperAdmin(): Promise<boolean> {
    const session = await getSuperSession();
    return session?.role === "SUPER_ADMIN";
}

// GET /api/super-admin/tenants/staff?tenantId=xxx
export async function GET(request: NextRequest) {
    if (!await isSuperAdmin()) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = request.nextUrl.searchParams.get("tenantId");
    if (!tenantId) {
        return NextResponse.json({ error: "tenantId kerak" }, { status: 400 });
    }

    const staffList = await prisma.staff.findMany({
        where: { tenantId },
        select: { id: true, name: true, username: true, role: true, status: true, branch: true },
        orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, staff: staffList });
}

// POST /api/super-admin/tenants/staff — staff parolini yangilash
// Body: { staffId, newPassword, newUsername? }
export async function POST(request: NextRequest) {
    if (!await isSuperAdmin()) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { staffId, newPassword, newUsername } = await request.json();

    if (!staffId || !newPassword) {
        return NextResponse.json({ error: "staffId va newPassword kerak" }, { status: 400 });
    }

    const existing = await prisma.staff.findUnique({
        where: { id: staffId },
        select: { id: true, name: true, username: true }
    });

    if (!existing) {
        return NextResponse.json({ error: "Staff topilmadi" }, { status: 404 });
    }

    const hash = await hashPassword(newPassword);
    const data: any = { passwordHash: hash };

    if (newUsername) {
        data.username = newUsername.replace(/^\+/, "");
    }

    await prisma.staff.update({
        where: { id: staffId },
        data
    });

    return NextResponse.json({
        success: true,
        message: `${existing.name} uchun parol yangilandi`,
    });
}
