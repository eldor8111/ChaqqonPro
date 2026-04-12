import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { hashPassword, getSuperSession } from "@/lib/backend/auth";

async function checkPermission(permission: string): Promise<boolean> {
    const session = await getSuperSession();
    if (session?.role !== "SUPER_ADMIN") return false;
    if (session.userId === "superadmin") return true;
    const user = await prisma.platformUser.findUnique({ where: { id: session.userId } });
    if (!user || user.status !== "active") return false;
    const perms: string[] = JSON.parse(user.permissions || "[]");
    return perms.includes(permission);
}

// GET Platform Users
export async function GET(_req: NextRequest) {
    try {
        if (!await checkPermission("users:view")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const users = await prisma.platformUser.findMany({
            orderBy: { createdAt: "desc" },
        });

        const mappedUsers = users.map((u: any) => ({
            id: u.id,
            name: u.name,
            phone: u.phone,
            role: u.role,
            agentCode: u.agentCode || null,
            permissions: (typeof u.permissions === "string" ? JSON.parse(u.permissions || "[]") : u.permissions) || [],
            status: u.status,
            createdAt: u.createdAt,
        }));

        return NextResponse.json({ users: mappedUsers, total: mappedUsers.length });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// POST Create Platform User
export async function POST(req: NextRequest) {
    try {
        if (!await checkPermission("users:create")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await req.json();
        if (!data.name || !data.phone || !data.password || !data.role) {
            return NextResponse.json({ error: "Barcha majburiy maydonlarni to'ldiring" }, { status: 400 });
        }

        const normalizedPhone = data.phone.replace(/\s+/g, "");
        const existing = await prisma.platformUser.findUnique({ where: { phone: normalizedPhone } });
        if (existing) {
            return NextResponse.json({ error: "Bu telefon raqam allaqachon ro'yxatdan o'tgan" }, { status: 400 });
        }

        const pHash = await hashPassword(data.password);
        const newUser = await prisma.platformUser.create({
            data: {
                name: data.name,
                phone: normalizedPhone,
                passwordHash: pHash,
                role: data.role,
                agentCode: data.role === "Agent" ? (data.agentCode || null) : null,
                permissions: JSON.stringify(data.permissions || []),
                status: data.status || "active",
            }
        });

        return NextResponse.json({ success: true, user: { id: newUser.id, name: newUser.name, phone: newUser.phone, role: newUser.role, agentCode: newUser.agentCode, permissions: JSON.parse(newUser.permissions || "[]") } });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// PUT Update Platform User
export async function PUT(req: NextRequest) {
    try {
        if (!await checkPermission("users:create")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await req.json();
        const { id, name, phone, password, role, permissions, status } = data;

        if (!id || !name || !phone || !role) {
            return NextResponse.json({ error: "Barcha majburiy maydonlarni to'ldiring" }, { status: 400 });
        }

        const normalizedPhone = phone.replace(/\s+/g, "");
        const existing = await prisma.platformUser.findUnique({ where: { phone: normalizedPhone } });
        if (existing && existing.id !== id) {
            return NextResponse.json({ error: "Bu telefon raqam allaqachon boshqa foydalanuvchida ro'yxatdan o'tgan" }, { status: 400 });
        }

        const updateData: any = { name, phone: normalizedPhone, role, permissions: JSON.stringify(permissions || []) };
        if (status) updateData.status = status;
        // Agent kodini yangilash
        if (role === "Agent") {
            updateData.agentCode = data.agentCode || null;
        } else {
            updateData.agentCode = null; // Boshqa rollar uchun kod kerak emas
        }

        if (password && password.trim() !== "") {
            updateData.passwordHash = await hashPassword(password);
        }

        const updatedUser = await prisma.platformUser.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json({ success: true, user: { id: updatedUser.id, name: updatedUser.name, phone: updatedUser.phone, role: updatedUser.role, permissions: JSON.parse(updatedUser.permissions || "[]") } });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// DELETE a Platform user
export async function DELETE(req: NextRequest) {
    try {
        if (!await checkPermission("users:delete")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await req.json();
        await prisma.platformUser.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
