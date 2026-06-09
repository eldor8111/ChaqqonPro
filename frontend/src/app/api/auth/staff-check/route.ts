export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";

export async function POST(req: NextRequest) {
    try {
        const { staffId, sessionToken } = await req.json();
        
        if (!staffId || !sessionToken) {
            return NextResponse.json({ valid: false });
        }

        const staff = await prisma.staff.findUnique({
            where: { id: staffId },
            select: { role: true, status: true, staffMeta: true }
        });

        if (!staff || staff.status !== "active") {
            return NextResponse.json({ valid: false });
        }

        if (staff.role === "Manablog") {
            try {
                const meta = staff.staffMeta ? JSON.parse(staff.staffMeta) : {};
                if (meta.sessionToken !== sessionToken) {
                    return NextResponse.json({ valid: false });
                }
            } catch (e) {
                return NextResponse.json({ valid: false });
            }
        }

        return NextResponse.json({ valid: true });
    } catch (e) {
        return NextResponse.json({ valid: false });
    }
}
