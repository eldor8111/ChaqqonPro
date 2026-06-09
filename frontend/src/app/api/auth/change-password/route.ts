export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";
import bcryptjs from "bcryptjs";

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ success: false, error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
        }

        const { newPassword } = await request.json();

        if (!newPassword) {
            return NextResponse.json({ success: false, error: "Yangi parolni kiriting" }, { status: 400 });
        }
        if (newPassword.length < 4) {
            return NextResponse.json({ success: false, error: "Parol kamida 4 ta belgi bo'lishi kerak" }, { status: 400 });
        }

        const newHash = await bcryptjs.hash(newPassword, 10);

        if (session.role === "ADMIN") {
            const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId! } });
            if (!tenant) return NextResponse.json({ success: false, error: "Hisob topilmadi" }, { status: 404 });
            await prisma.tenant.update({ where: { id: tenant.id }, data: { adminPasswordHash: newHash } });
        } else if (session.role === "KASSIR") {
            if (!session.userId) return NextResponse.json({ success: false, error: "Xodim ID topilmadi" }, { status: 400 });
            const staff = await prisma.staff.findUnique({ where: { id: session.userId } });
            if (!staff) return NextResponse.json({ success: false, error: "Xodim topilmadi" }, { status: 404 });
            await prisma.staff.update({ where: { id: staff.id }, data: { passwordHash: newHash } });
        } else {
            return NextResponse.json({ success: false, error: "Super admin paroli bu yerdan o'zgartirilmaydi" }, { status: 403 });
        }

        return NextResponse.json({ success: true, message: "Parol muvaffaqiyatli o'zgartirildi" });

    } catch (error) {
        console.error("Change password error:", error);
        return NextResponse.json({ success: false, error: "Server xatoligi" }, { status: 500 });
    }
}
