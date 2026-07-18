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

        const existing = await prisma.tenant.findUnique({
            where: { id: params.id }
        });

        if (!existing) {
            return NextResponse.json({ error: "Do'kon topilmadi" }, { status: 404 });
        }

        const data: any = {};

        if (body.shopName) data.shopName = body.shopName;
        if (body.ownerName) data.ownerName = body.ownerName;
        if (body.phone !== undefined) data.phone = body.phone;
        if (body.email !== undefined) data.email = body.email;
        if (body.address !== undefined) data.address = body.address;
        if (body.plan) data.plan = body.plan;
        if (body.status) data.status = body.status;
        if (body.adminUsername) data.adminUsername = body.adminUsername;
        if (body.adminPassword) {
            data.adminPasswordHash = await hashPassword(body.adminPassword);
        }
        if (body.settings !== undefined) {
            data.settings = JSON.stringify(body.settings);
            
            // Obuna muddatini yangilash
            const subDays = body.settings.subscriptionDays ?? 7;
            const expiresAt = new Date();
            if (subDays > 0) {
                expiresAt.setDate(expiresAt.getDate() + subDays);
                data.expiresAt = expiresAt;
            }
        }

        if (Object.keys(data).length > 0) {
            await prisma.tenant.update({
                where: { id: params.id },
                data
            });
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

        const existing = await prisma.tenant.findUnique({
            where: { id: params.id }
        });

        if (!existing) {
            return NextResponse.json({ error: "Do'kon topilmadi" }, { status: 404 });
        }

        // Deleting tenant will cascade delete all related models in Postgres because of @relation(onDelete: Cascade)
        await prisma.tenant.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ success: true, message: "Do'kon o'chirildi" });
    } catch (error) {
        console.error("Delete tenant error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
