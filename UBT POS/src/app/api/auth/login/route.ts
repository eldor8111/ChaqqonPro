export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/backend/auth";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { shopCode, username, password } = body;

        if (!username || !password) {
            return NextResponse.json(
                { error: "Telefon raqam va parol kiritilishi shart" },
                { status: 400 }
            );
        }

        // shopCode ixtiyoriy — bo'lmasa username orqali qidiradi
        const result = await authenticateAdmin(shopCode ? shopCode.toUpperCase() : null, username, password);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 401 });
        }

        return NextResponse.json({
            success: true,
            tenant: result.tenant,
            expiresAt: result.tenant?.expiresAt ?? null,
        });
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
