export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";
import { hashPassword } from "@/lib/backend/auth";
import { createAuditLog } from "@/lib/backend/audit";
import { isPhoneGloballyUnique } from "@/lib/backend/validators";

export async function GET(_request: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const tenantId = session.tenantId;

        const staff = await prisma.$queryRaw`
            SELECT id, tenantId, name, role, username, permissions, branch, phone, status, sales, transactions, createdAt
            FROM Staff
            WHERE tenantId = ${tenantId}
            ORDER BY name ASC
        ` as any[];

        return NextResponse.json({
            staff: staff.map((s) => ({
                ...s,
                permissions: JSON.parse(s.permissions),
            })),
        });
    } catch (error) {
        console.error("Get staff error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const tenantId = session.tenantId;
        const body = await request.json();

        const { name, role, username, password, permissions, branch, phone, staffMeta } = body;

        if (!name || !username || !password) {
            return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
        }

        if (phone) {
            const isUnique = await isPhoneGloballyUnique(phone);
            if (!isUnique) {
                return NextResponse.json({ error: "Bu telefon raqami tizimda allaqachon band" }, { status: 409 });
            }
        }

        // Check if username already exists globally (across all tenants)
        const existing = await prisma.staff.findFirst({
            where: { username },
        });

        if (existing) {
            return NextResponse.json({ error: "Username already exists system-wide" }, { status: 409 });
        }

        const passwordHash = await hashPassword(password);
        const id = `cm${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
        const permStr = JSON.stringify(permissions || ["pos"]);
        const branchVal = branch || "Filial #1";
        const phoneVal = phone || "";
        const roleVal = role || "Kassir";
        const metaVal = staffMeta ? JSON.stringify(staffMeta) : "{}";

        await prisma.$executeRaw`
            INSERT INTO Staff (id, tenantId, name, role, username, passwordHash, permissions, branch, phone, staffMeta, status, sales, transactions, createdAt)
            VALUES (${id}, ${tenantId}, ${name}, ${roleVal}, ${username}, ${passwordHash}, ${permStr}, ${branchVal}, ${phoneVal}, ${metaVal}, 'active', 0, 0, datetime('now'))
        `;

        await createAuditLog(tenantId, session.userId ? "Admin" : "System", "Yangi xodim qo'shildi", `${name} (${roleVal})`, "create");

        return NextResponse.json(
            {
                success: true,
                staff: { id, name, role: roleVal },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Create staff error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
