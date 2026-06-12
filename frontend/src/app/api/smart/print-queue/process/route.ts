/**
 * /api/smart/print-queue/process — server-worker tick
 * Server o'zi pending joblarni claim qilib chop etadi (EXE rejimi —
 * server printer bilan bitta lokal tarmoqda).
 * POS sahifasi yoki tray-agent har 5-10s da chaqiradi.
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getAuthTenantId } from "@/lib/backend/tenantAuth";
import { PrintQueueService } from "@/lib/services/PrintQueueService";

export async function POST(req: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json({ processed: [] });

        const results = await PrintQueueService.processTick(tenantId, 5);
        return NextResponse.json({ processed: results });
    } catch (e) {
        return NextResponse.json({ processed: [], error: String(e) }, { status: 500 });
    }
}
