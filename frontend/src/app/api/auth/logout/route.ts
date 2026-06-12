export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/backend/auth";

export async function POST(_request: NextRequest) {
    try {
        await deleteSession();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Logout error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
