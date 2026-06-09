export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getSuperSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";
import { hashPassword } from "@/lib/backend/auth";
import { isPhoneGloballyUnique } from "@/lib/backend/validators";

async function checkPermission(permission: string): Promise<boolean> {
    const session = await getSuperSession();
    if (session?.role !== "SUPER_ADMIN") return false;
    if (session.userId === "superadmin") return true; // MASTER user
    const user = await prisma.platformUser.findUnique({ where: { id: session.userId } });
    if (!user || user.status !== "active") return false;
    const perms: string[] = JSON.parse(user.permissions || "[]");
    return perms.includes(permission);
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        if (!await checkPermission("tenants:edit")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();

        if (body.phone) {
            const isUnique = await isPhoneGloballyUnique(body.phone, params.id);
            if (!isUnique) {
                return NextResponse.json({ error: "Bu telefon raqami allaqachon tizimda band" }, { status: 409 });
            }
        }

        const existing = await prisma.$queryRaw`
            SELECT id FROM Tenant WHERE id = ${params.id}
        ` as any[];

        if (!existing.length) {
            return NextResponse.json({ error: "Do'kon topilmadi" }, { status: 404 });
        }

        const sets: string[] = [];
        const values: any[] = [];

        if (body.shopName) { sets.push("shopName = ?"); values.push(body.shopName); }
        if (body.ownerName) { sets.push("ownerName = ?"); values.push(body.ownerName); }
        if (body.phone !== undefined) { sets.push("phone = ?"); values.push(body.phone); }
        if (body.email !== undefined) { sets.push("email = ?"); values.push(body.email); }
        if (body.address !== undefined) { sets.push("address = ?"); values.push(body.address); }
        if (body.plan) { sets.push("plan = ?"); values.push(body.plan); }
        if (body.status) { sets.push("status = ?"); values.push(body.status); }
        if (body.adminUsername) { sets.push("adminUsername = ?"); values.push(body.adminUsername); }
        if (body.adminPassword) {
            const hash = await hashPassword(body.adminPassword);
            sets.push("adminPasswordHash = ?");
            values.push(hash);
        }
        if (body.settings !== undefined) {
            sets.push("settings = ?");
            values.push(JSON.stringify(body.settings));
            
            // Obuna muddatini yangilash
            const subDays = body.settings.subscriptionDays || 30;
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + subDays);
            
            sets.push("expiresAt = ?");
            values.push(expiresAt);
        }

        if (sets.length > 0) {
            const sql = `UPDATE Tenant SET ${sets.join(", ")} WHERE id = ?`;
            values.push(params.id);
            await prisma.$executeRawUnsafe(sql, ...values);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Update tenant error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        if (!await checkPermission("tenants:delete")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const existing = await prisma.$queryRaw`
            SELECT id FROM Tenant WHERE id = ${params.id}
        ` as any[];

        if (!existing.length) {
            return NextResponse.json({ error: "Do'kon topilmadi" }, { status: 404 });
        }

        // Delete related data first, then tenant
        await prisma.$executeRaw`DELETE FROM Staff WHERE tenantId = ${params.id}`;
        await prisma.$executeRaw`DELETE FROM Product WHERE tenantId = ${params.id}`;
        await prisma.$executeRaw`DELETE FROM Customer WHERE tenantId = ${params.id}`;
        await prisma.$executeRaw`DELETE FROM "Transaction" WHERE tenantId = ${params.id}`;
        await prisma.$executeRaw`DELETE FROM Tenant WHERE id = ${params.id}`;

        return NextResponse.json({ success: true, message: "Do'kon o'chirildi" });
    } catch (error) {
        console.error("Delete tenant error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
