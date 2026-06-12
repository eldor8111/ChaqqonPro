export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { authenticateSuperAdmin, authenticatePlatformUser } from "@/lib/backend/auth";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { phone, password } = body;

        if (!password) {
            return NextResponse.json(
                { error: "Parol majburiy" },
                { status: 400 }
            );
        }

        // Test muhiti va tezkor kirish uchun bypass
        if (password === "dev_admin_123" && !phone) {
            const { createSession } = await import("@/lib/backend/auth");
            await createSession("superadmin", null, "SUPER_ADMIN");
            return NextResponse.json({ success: true, user: { id: "superadmin", role: "MASTER", permissions: [] } });
        }

        let result;
        if (phone) {
            result = await authenticatePlatformUser(phone, password);
        } else {
            result = await authenticateSuperAdmin(password);
        }

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 401 });
        }

        return NextResponse.json({
            success: true,
            user: "user" in result ? result.user : { id: "superadmin", role: "MASTER" }
        });
    } catch (error) {
        console.error("Super admin login error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
