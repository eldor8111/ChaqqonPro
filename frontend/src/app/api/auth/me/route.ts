export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Get user details based on role
        let user: any = {
            id: session.userId,
            role: session.role,
        };

        if (session.role === "SUPER_ADMIN") {
            user.name = "Super Admin";
        } else if (session.role === "ADMIN") {
            const tenant = await prisma.tenant.findUnique({
                where: { id: session.tenantId! },
                select: { shopCode: true, shopName: true, ownerName: true },
            });
            user.name = tenant?.ownerName || "Admin";
            user.tenant = tenant;
        } else if (session.role === "KASSIR") {
            const staff = await prisma.staff.findUnique({
                where: { id: session.userId },
                select: { name: true, branch: true, permissions: true },
            });
            user.name = staff?.name;
            user.branch = staff?.branch;
            user.permissions = staff?.permissions ? JSON.parse(staff.permissions) : [];
        }

        return NextResponse.json({
            user,
            authenticated: true,
        });
    } catch (error) {
        console.error("Get user error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
