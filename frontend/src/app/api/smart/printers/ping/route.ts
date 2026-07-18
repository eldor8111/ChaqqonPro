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
            `SELECT id, name, "ipAddress", port FROM \"SmartPrinter\" WHERE "tenantId"=$1 ORDER BY "createdAt" ASC`,
            tenantId
        ) as Promise<any[]>).catch(() => []);

        const os = require("os");
        const isCloud = os.platform() !== "win32";

        const results: { id: string; name: string; ip: string; port: number; online: boolean }[] = [];
        const batchSize = 5;
        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(async (p) => {
                    let isOnline = false;
                    const ip = p.ipAddress;
                    const port = p.port || 9100;
                    
                    const isLocalNetwork = /^(192\.168|10\.|172\.(1[6-9]|2[0-9]|3[0-1]))\./.test(ip) || ip === "127.0.0.1" || ip === "localhost";
                    
                    if (isCloud && isLocalNetwork) {
                        // Bulutli serverdan lokal printerni ping qilib bo'lmaydi. Uni doim "online" deb olamiz (Agent hal qiladi).
                        isOnline = true;
                    } else {
                        isOnline = await checkPrinter(ip, port);
                    }

                    return {
                        id: p.id,
                        name: p.name,
                        ip: ip,
                        port: port,
                        online: isOnline,
                    };
                })
            );
            results.push(...batchResults);
        }

        return NextResponse.json(results);
    } catch (e) {
        return NextResponse.json([]);
    }
}
