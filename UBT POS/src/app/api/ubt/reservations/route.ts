export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/backend/jwt";

async function getAuthTenantId(request: NextRequest): Promise<string | null> {
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

export async function GET(request: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(request);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const all = searchParams.get("all") === "true";

        // Fetch upcoming confirmed reservations (from 2 hours ago to future)
        const dateLimit = new Date();
        dateLimit.setHours(dateLimit.getHours() - 2);

        const reservations = await prisma.ubtReservation.findMany({
            where: {
                tenantId,
                status: "confirmed",
                ...(all ? {} : { reservationTime: { gte: dateLimit } })
            },
            orderBy: { reservationTime: 'asc' }
        });

        // Deserialize notes if it's JSON to extract advance and text
        const mapped = reservations.map(r => {
            let advance = 0;
            let actualNotes = r.notes || "";
            if (r.notes && r.notes.startsWith("{")) {
                try {
                    const parsed = JSON.parse(r.notes);
                    advance = parsed.advance || 0;
                    actualNotes = parsed.notes || "";
                } catch {}
            }
            return {
                ...r,
                advance,
                notes: actualNotes
            };
        });

        return NextResponse.json({ reservations: mapped });
    } catch (error) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(request);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { tableId, guestName, customerPhone, reservationTime, advance, notes } = await request.json();

        // Package advance and notes together to fit in the single string column without migrations
        const notesObj = JSON.stringify({ advance: advance ? parseFloat(advance) : 0, notes: notes || "" });

        const reservation = await prisma.ubtReservation.create({
            data: {
                tenantId,
                tableId,
                customerName: guestName,
                customerPhone: customerPhone || "",
                guestCount: 0,
                reservationTime: new Date(reservationTime),
                notes: notesObj,
                status: "confirmed"
            }
        });

        return NextResponse.json({ success: true, reservation }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(request);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id, status } = await request.json();

        const reservation = await prisma.ubtReservation.update({
            where: { id, tenantId },
            data: { status }
        });

        return NextResponse.json({ success: true, reservation });
    } catch (error) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
