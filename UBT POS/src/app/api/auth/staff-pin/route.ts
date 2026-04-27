export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { verifyPassword, getSession } from "@/lib/backend/auth";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/backend/jwt";

async function getCallerTenantId(request: NextRequest): Promise<string | null> {
    try {
        const session = await getSession();
        if (session?.tenantId) return session.tenantId;
    } catch {}
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        try {
            const { payload } = await jwtVerify(authHeader.slice(7), JWT_SECRET);
            if (payload.tenantId) return payload.tenantId as string;
        } catch {}
    }
    return null;
}

export async function POST(request: NextRequest) {
    try {
        // Faqat autentifikatsiya qilingan so'rovlar (JWT yoki cookie session)
        const callerTenantId = await getCallerTenantId(request);
        if (!callerTenantId) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { staffId, password } = await request.json();

        if (!staffId || !password) {
            return NextResponse.json(
                { success: false, error: "Xodim va parol kiritilishi shart" },
                { status: 400 }
            );
        }

        const staff = await prisma.staff.findUnique({
            where: { id: staffId },
        });

        // Xodim chaqiruvchi tenant ga tegishligini tekshirish
        if (staff && staff.tenantId !== callerTenantId) {
            return NextResponse.json({ success: false, error: "Xodim topilmadi" }, { status: 404 });
        }

        if (!staff) {
            return NextResponse.json({ success: false, error: "Xodim topilmadi" }, { status: 404 });
        }

        if (staff.status !== "active") {
            return NextResponse.json({ success: false, error: "Xodim nofaol" }, { status: 403 });
        }

        const passwordValid = await verifyPassword(password, staff.passwordHash);

        if (!passwordValid) {
            return NextResponse.json({ success: false, error: "Parol noto'g'ri" }, { status: 401 });
        }

        // Extract printerIp stored in phone field JSON (used by all roles)
        let printerIp = "";
        try { const p = staff.phone ? JSON.parse(staff.phone) : {}; printerIp = p.printerIp || ""; } catch {}

        // Fallback: agar xodimda printerIp yo'q bo'lsa, UbtPrinter jadvalidan birinchi printerni olish
        if (!printerIp) {
            try {
                const printers: any[] = await (prisma.$queryRawUnsafe(
                    `SELECT ipAddress, port FROM UbtPrinter WHERE tenantId=? ORDER BY createdAt ASC LIMIT 1`,
                    staff.tenantId
                ) as Promise<any[]>);
                if (printers.length > 0) {
                    printerIp = printers[0].ipAddress || "";
                }
            } catch { /* printer yo'q — muammo emas */ }
        }

        let serviceFeePct = 10;
        try { const meta = staff.staffMeta ? JSON.parse(staff.staffMeta) : {}; if (meta.serviceFeePct !== undefined) serviceFeePct = meta.serviceFeePct; } catch {}

        const safeStaff = {
            id: staff.id,
            name: staff.name,
            role: staff.role,
            branch: staff.branch,
            username: staff.username,
            permissions: staff.permissions ? JSON.parse(staff.permissions) : [],
            printerIp,
            serviceFeePct,
        };

        return NextResponse.json({
            success: true,
            staff: safeStaff,
        });

    } catch (error) {
        console.error("Staff PIN login error:", error);
        return NextResponse.json({ success: false, error: "Server xatoligi" }, { status: 500 });
    }
}
