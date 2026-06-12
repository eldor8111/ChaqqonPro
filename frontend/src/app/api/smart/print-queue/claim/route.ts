/**
 * /api/smart/print-queue/claim — agent pending joblarni oladi
 * POST { agentId, limit? } → { jobs: [{ id, type, payload, printer: {ipAddress, port, name} }] }
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getAuthTenantId } from "@/lib/backend/tenantAuth";
import { PrintQueueService } from "@/lib/services/PrintQueueService";

export async function POST(req: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json({ jobs: [] });

        const body = await req.json().catch(() => ({}));
        const agentId = body.agentId || "agent";
        const limit = Math.min(Number(body.limit) || 10, 20);

        const jobs = await PrintQueueService.claimJobs(tenantId, agentId, limit);
        return NextResponse.json({
            jobs: jobs.map(j => ({
                id: j.id,
                type: j.type,
                payload: j.payload,
                attempts: j.attempts,
                printer: { id: j.printer.id, name: j.printer.name, ipAddress: j.printer.ipAddress, port: j.printer.port },
            })),
        });
    } catch (e) {
        return NextResponse.json({ jobs: [], error: String(e) }, { status: 500 });
    }
}
