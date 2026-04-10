/**
 * /api/ubt/print — Thin Controller
 * Barcha logika PrinterService va PrintJobSchema da
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { PrinterService } from "@/lib/services/PrinterService";
import { PrintJobSchema } from "@/lib/validators/print.schema";
import { getSession } from "@/lib/backend/auth";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/backend/jwt";

export async function POST(req: NextRequest) {
    // Auth tekshiruvi — faqat autentifikatsiya qilingan foydalanuvchilar
    let authorized = false;
    try {
        const session = await getSession();
        if (session?.tenantId || session?.role === "SUPER_ADMIN") authorized = true;
    } catch {}
    if (!authorized) {
        const authHeader = req.headers.get("Authorization");
        if (authHeader?.startsWith("Bearer ")) {
            try {
                const { payload } = await jwtVerify(authHeader.slice(7), JWT_SECRET);
                if (payload.tenantId) authorized = true;
            } catch {}
        }
    }
    if (!authorized) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    try {
        const raw = await req.json();

        // DTO Validation
        const parsed = PrintJobSchema.safeParse(raw);
        if (!parsed.success) {
            const message = parsed.error.issues
                .map((e) => `${e.path.map(String).join(".")}: ${e.message}`)
                .join("; ");
            return NextResponse.json({ success: false, error: message }, { status: 400 });
        }

        const result = await PrinterService.print(parsed.data);

        if (!result.success) {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error("[print/route]", message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
