export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const tenantId = session.tenantId;

        // Use raw query to avoid needing a prisma client regeneration which locks on windows
        const logs = await prisma.$queryRaw`
            SELECT id, user, action, detail, time(createdAt, 'localtime') as time, strftime('%Y-%m-%d', createdAt) as date, type 
            FROM AuditLog 
            WHERE tenantId = ${tenantId} 
            ORDER BY createdAt DESC 
            LIMIT 100
        ` as any[];

        return NextResponse.json({
            auditLog: logs.map(l => ({
                id: l.id,
                user: l.user,
                action: l.action,
                detail: l.detail,
                time: l.time,
                date: l.date,
                type: l.type
            }))
        });
    } catch (error) {
        console.error("Get audit log error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
