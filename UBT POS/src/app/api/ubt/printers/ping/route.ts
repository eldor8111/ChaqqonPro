export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import net from "net";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/backend/jwt";

async function getAuthTenantId(request: NextRequest): Promise<string | null> {
    try {
        const cookieSession = await getSession();
        if (cookieSession?.tenantId) return cookieSession.tenantId;
    } catch {}
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        try {
            const { payload } = await jwtVerify(authHeader.slice(7), JWT_SECRET);
            if (payload.tenantId) return payload.tenantId as string;
        } catch {}
    }
    const firstTenant = await prisma.tenant.findFirst({ where: { status: "active" } });
    return firstTenant?.id ?? null;
}

function checkPrinter(ip: string, port: number, timeout = 2000): Promise<boolean> {
    return new Promise(resolve => {
        const socket = new net.Socket();
        socket.setTimeout(timeout);
        socket.on("connect", () => { socket.destroy(); resolve(true); });
        socket.on("timeout", () => { socket.destroy(); resolve(false); });
        socket.on("error", () => { socket.destroy(); resolve(false); });
        socket.connect(port, ip);
    });
}

export async function GET(req: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json([]);

        const rows: any[] = await (prisma.$queryRawUnsafe(
            `SELECT id, name, ipAddress, port FROM UbtPrinter WHERE tenantId=? ORDER BY createdAt ASC`,
            tenantId
        ) as Promise<any[]>).catch(() => []);

        // Batch processing — 5 tadan bir vaqtda (socket resource limit)
        const results: { id: string; name: string; ip: string; port: number; online: boolean }[] = [];
        const batchSize = 5;
        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(async (p) => ({
                    id: p.id,
                    name: p.name,
                    ip: p.ipAddress,
                    port: p.port || 9100,
                    online: await checkPrinter(p.ipAddress, p.port || 9100),
                }))
            );
            results.push(...batchResults);
        }

        return NextResponse.json(results);
    } catch (e) {
        return NextResponse.json([]);
    }
}
