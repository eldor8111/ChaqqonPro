/**
 * /api/smart/print-queue
 *  GET   — joblar ro'yxati (?status=pending,failed&limit=50)
 *  POST  — yangi job yaratish { printerId, type, payload, priority }
 *  PATCH — { id, action: "retry" | "cancel" }
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getAuthTenantId } from "@/lib/backend/tenantAuth";
import { PrintQueueService } from "@/lib/services/PrintQueueService";

export async function GET(req: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json({ jobs: [] });

        await PrintQueueService.recoverStale(tenantId);

        const url = new URL(req.url);
        const statusParam = url.searchParams.get("status");
        const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
        const statuses = statusParam ? statusParam.split(",") : undefined;

        const jobs = await prisma.printJob.findMany({
            where: { tenantId, ...(statuses ? { status: { in: statuses } } : {}) },
            orderBy: { createdAt: "desc" },
            take: limit,
            include: { printer: { select: { name: true, ipAddress: true, port: true, role: true } } },
        });
        return NextResponse.json({ jobs });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        if (!body.printerId) return NextResponse.json({ error: "printerId kiritilmagan" }, { status: 400 });

        const printer = await prisma.smartPrinter.findFirst({ where: { id: body.printerId, tenantId } });
        if (!printer) return NextResponse.json({ error: "Printer topilmadi" }, { status: 404 });

        // Queue to'lib ketgan holat — printer boshiga 200 ta pending limit
        const pendingCount = await prisma.printJob.count({ where: { printerId: printer.id, status: "pending" } });
        if (pendingCount >= 200) {
            return NextResponse.json({ error: "Printer navbati to'la (200). Printer holatini tekshiring." }, { status: 429 });
        }

        const job = await PrintQueueService.createJob({
            tenantId,
            printerId: printer.id,
            type: body.type,
            payload: body.payload || {},
            priority: body.priority,
        });
        return NextResponse.json({ success: true, jobId: job.id });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id, action } = await req.json();
        if (!id || !action) return NextResponse.json({ error: "id va action kiritilishi shart" }, { status: 400 });

        let ok = false;
        if (action === "retry") ok = await PrintQueueService.retryJob(tenantId, id);
        else if (action === "cancel") ok = await PrintQueueService.cancelJob(tenantId, id);
        else return NextResponse.json({ error: "Noto'g'ri action" }, { status: 400 });

        return NextResponse.json({ success: ok });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
