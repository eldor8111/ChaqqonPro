export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { hashPassword, createSession } from "@/lib/backend/auth";

export async function GET(_request: NextRequest) {
    try {
        const count = await prisma.superAdmin.count();
        return NextResponse.json({ setupRequired: count === 0 });
    } catch (error) {
        console.error("Setup check error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const count = await prisma.superAdmin.count();
        if (count > 0) {
            return NextResponse.json({ error: "Super admin allaqachon yaratilgan" }, { status: 403 });
        }

        const body = await request.json();
        const { password, confirmPassword } = body;

        if (!password || password.length < 6) {
            return NextResponse.json({ error: "Parol uzunligi kamida 6 ta belgi bo'lishi shart" }, { status: 400 });
        }

        if (password !== confirmPassword) {
            return NextResponse.json({ error: "Parollar tasdiqlanmadi (bir xil emas)" }, { status: 400 });
        }

        const passwordHash = await hashPassword(password);

        await prisma.superAdmin.create({
            data: {
                passwordHash
            }
        });

        // Darhol tizimga login qildirish
        await createSession("superadmin", null, "SUPER_ADMIN");

        return NextResponse.json({ 
            success: true,
            user: { id: "superadmin", role: "MASTER", permissions: [] }
        });
    } catch (error) {
        console.error("Setup creation error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
