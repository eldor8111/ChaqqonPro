/**
 * /api/smart/printer-heartbeat
 *  POST — barcha aktiv printerlarni server tomondan TCP probe qilib statusni yangilaydi
 *         (EXE rejimi: server lokal mashinada — probe to'g'ridan-to'g'ri ishlaydi).
 *         Agent o'z statuslarini yuborsa: { agentId, printers: [{id, status, latencyMs}] }
 *  GET  — printerlar joriy statusi
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getAuthTenantId } from "@/lib/backend/tenantAuth";
import { PrintQueueService } from "@/lib/services/PrintQueueService";

export async function GET(req: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json({ printers: [] });
        const printers = await prisma.smartPrinter.findMany({
            where: { tenantId },
            select: { id: true, name: true, ipAddress: true, port: true, role: true, status: true, lastSeenAt: true, latencyMs: true, isActive: true, isDefault: true, paperWidth: true, description: true },
            orderBy: { createdAt: "asc" },
        });
        return NextResponse.json({ printers });
    } catch (e) {
        return NextResponse.json({ printers: [], error: String(e) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json({ results: [] });

        const body = await req.json().catch(() => ({}));

        // Agent o'z o'lchovlarini yuborgan bo'lsa (masalan USB printerlar uchun)
        if (Array.isArray(body.printers) && body.printers.length > 0) {
            for (const p of body.printers) {
                if (!p.id) continue;
                await prisma.smartPrinter.updateMany({
                    where: { id: p.id, tenantId },
                    data: {
                        status: p.status === "online" ? "online" : "offline",
                        latencyMs: typeof p.latencyMs === "number" ? p.latencyMs : null,
                        ...(p.status === "online" ? { lastSeenAt: new Date() } : {}),
                    },
                });
            }
            return NextResponse.json({ success: true });
        }

        // Aks holda server o'zi probe qiladi
        const results = await PrintQueueService.probeAll(tenantId);
        return NextResponse.json({ results });
    } catch (e) {
        return NextResponse.json({ results: [], error: String(e) }, { status: 500 });
    }
}
