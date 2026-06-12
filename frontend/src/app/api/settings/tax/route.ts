import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";

/**
 * GET /api/settings/tax
 * Returns tax integration status and safe (non-secret) config for current tenant.
 * Secret Key is NEVER returned to the frontend.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Get tenant settings (taxEnabled flag)
        const tenant = await prisma.tenant.findUnique({
            where: { id: session.tenantId },
            select: { settings: true },
        });

        let taxEnabled = false;
        let taxRohm = "";
        let taxFm = "";
        let taxInn = "";

        if (tenant?.settings) {
            try {
                // Determine if JSON string or object
                const s = typeof tenant.settings === "string" ? JSON.parse(tenant.settings) : tenant.settings as any;
                taxEnabled = !!s.taxEnabled;
                taxRohm = s.taxRohm || "";
                taxFm = s.taxFm || "";
                taxInn = s.taxInn || "";
            } catch (e) {
                console.error("Failed to parse tenant.settings in taxonomy endpoint", e);
            }
        }

        return NextResponse.json({
            isActive: taxEnabled,
            taxEnabled,
            taxRohm: taxEnabled ? taxRohm : "",
            taxFm: taxEnabled ? taxFm : "",
            taxInn: taxEnabled ? taxInn : "",
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
