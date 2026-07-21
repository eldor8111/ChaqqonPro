export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";
import { hashPassword } from "@/lib/backend/auth";
import { createAuditLog } from "@/lib/backend/audit";
import { isPhoneGloballyUnique } from "@/lib/backend/validators";

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

        if (body.phone && !body.phone.trim().startsWith("{")) {
            const isUnique = await isPhoneGloballyUnique(body.phone, params.id);
            if (!isUnique) {
                return NextResponse.json({ error: "Bu telefon raqami allaqachon tizimda band" }, { status: 409 });
            }
        }

        // Check staff exists and belongs to tenant
        const existing = await prisma.$queryRaw`
            SELECT id, "tenantId" FROM "Staff" WHERE id = ${params.id}
        ` as any[];

        if (!existing.length || existing[0].tenantId !== tenantId) {
            return NextResponse.json({ error: "Staff not found" }, { status: 404 });
        }

        // Build SET clauses dynamically
        const sets: string[] = [];
        const values: any[] = [];

        if (body.name) { sets.push(`name = $${values.length + 1}`); values.push(body.name); }
        if (body.role) { sets.push(`role = $${values.length + 1}`); values.push(body.role); }
        if (body.branch) { sets.push(`branch = $${values.length + 1}`); values.push(body.branch); }
        if (body.phone !== undefined) { sets.push(`phone = $${values.length + 1}`); values.push(body.phone); }
        if (body.staffMeta !== undefined) { sets.push(`"staffMeta" = $${values.length + 1}`); values.push(typeof body.staffMeta === "string" ? body.staffMeta : JSON.stringify(body.staffMeta)); }
        if (body.status) { sets.push(`status = $${values.length + 1}`); values.push(body.status); }
        if (body.permissions) { sets.push(`permissions = $${values.length + 1}`); values.push(JSON.stringify(body.permissions)); }
        if (body.password) {
            const hash = await hashPassword(body.password);
            sets.push(`"passwordHash" = $${values.length + 1}`);
            values.push(hash);
        }

        if (sets.length > 0) {
            const sql = `UPDATE "Staff" SET ${sets.join(", ")} WHERE id = $${values.length + 1}`;
            values.push(params.id);
            await prisma.$executeRawUnsafe(sql, ...values);

            // Ensure only one main monoblock exists if this update sets isMainMonoblock to true
            if (body.phone) {
                try {
                    const phoneData = JSON.parse(body.phone);
                    if (phoneData.isMainMonoblock) {
                        const otherManablogs = await prisma.$queryRaw`SELECT id, phone FROM "Staff" WHERE "tenantId" = ${tenantId} AND role = 'Manablog' AND id != ${params.id}` as any[];
                        for (const m of otherManablogs) {
                            try {
                                const p2 = JSON.parse(m.phone || '{}');
                                if (p2.isMainMonoblock) {
                                    p2.isMainMonoblock = false;
                                    await prisma.$executeRaw`UPDATE "Staff" SET phone = ${JSON.stringify(p2)} WHERE id = ${m.id}`;
                                }
                            } catch (e) {}
                        }
                    }
                } catch (e) {}
            }

            await createAuditLog(tenantId, session.userId ? "Admin" : "System", "Xodim ma'lumotlari yangilandi", `ID: ${params.id}`, "update");
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Update staff error:", error);
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

        const existing = await prisma.$queryRaw`
            SELECT id, "tenantId" FROM "Staff" WHERE id = ${params.id}
        ` as any[];

        if (!existing.length || existing[0].tenantId !== tenantId) {
            return NextResponse.json({ error: "Staff not found" }, { status: 404 });
        }

        await prisma.$executeRaw`DELETE FROM "Staff" WHERE id = ${params.id}`;

        await createAuditLog(tenantId, session.userId ? "Admin" : "System", "Xodim tizimdan o'chirildi", `ID: ${params.id}`, "delete");

        return NextResponse.json({ success: true, message: "Staff deleted" });
    } catch (error) {
        console.error("Delete staff error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
