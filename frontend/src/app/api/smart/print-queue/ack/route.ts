/**
 * /api/smart/print-queue/ack — agent natijani qaytaradi
 * POST { jobId, ok, error?, agentId?, durationMs? }
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getAuthTenantId } from "@/lib/backend/tenantAuth";
import { PrintQueueService } from "@/lib/services/PrintQueueService";

export async function POST(req: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { jobId, ok, error, agentId, durationMs } = await req.json();
        if (!jobId) return NextResponse.json({ error: "jobId kiritilmagan" }, { status: 400 });

        const job = await PrintQueueService.ackJob(tenantId, jobId, !!ok, error, agentId, durationMs);
        if (!job) return NextResponse.json({ error: "Job topilmadi" }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
