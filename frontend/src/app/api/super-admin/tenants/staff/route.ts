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

    const staffList = await prisma.$queryRawUnsafe(
        "SELECT id, name, username, role, status, branch FROM Staff WHERE tenantId = ? ORDER BY createdAt DESC",
        tenantId
    ) as any[];

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

    const existing = await prisma.$queryRawUnsafe(
        "SELECT id, name, username FROM Staff WHERE id = ?",
        staffId
    ) as any[];

    if (!existing.length) {
        return NextResponse.json({ error: "Staff topilmadi" }, { status: 404 });
    }

    const hash = await hashPassword(newPassword);
    const sets: string[] = ["passwordHash = ?"];
    const values: any[] = [hash];

    if (newUsername) {
        sets.push("username = ?");
        values.push(newUsername.replace(/^\+/, ""));
    }

    values.push(staffId);
    await prisma.$executeRawUnsafe(
        `UPDATE Staff SET ${sets.join(", ")} WHERE id = ?`,
        ...values
    );

    return NextResponse.json({
        success: true,
        message: `${existing[0].name} uchun parol yangilandi`,
    });
}
