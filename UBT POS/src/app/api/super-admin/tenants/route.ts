export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getSuperSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";
import { hashPassword } from "@/lib/backend/auth";
import { isPhoneGloballyUnique } from "@/lib/backend/validators";

export async function GET(_request: NextRequest) {
    try {
        const session = await getSuperSession();
        if (session?.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tenants = await prisma.$queryRaw`
            SELECT id, shopCode, billingId, shopName, ownerName, phone, email, address, plan, status, adminUsername, settings, agentCode, createdAt
            FROM Tenant
            ORDER BY createdAt DESC
        ` as any[];

        return NextResponse.json({
            tenants: tenants.map(t => ({
                ...t,
                settings: t.settings ? JSON.parse(t.settings) : {},
            })),
        });
    } catch (error) {
        console.error("Get tenants error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSuperSession();
        if (session?.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            shopName, ownerName, phone, email, address,
            plan, status, adminUsername, adminPassword, settings, agentCode
        } = body;

        if (!shopName || !ownerName || !adminUsername || !adminPassword) {
            return NextResponse.json({ error: "Barcha majburiy maydonlar to'ldirilishi shart" }, { status: 400 });
        }

        if (phone) {
            const isUnique = await isPhoneGloballyUnique(phone);
            if (!isUnique) {
                return NextResponse.json({ error: "Bu telefon raqami allaqachon tizimda ro'yxatdan o'tgan" }, { status: 409 });
            }
        }

        // Auto-generate unique shopCode (e.g. SHOP0042)
        let shopCode = "";
        for (let attempt = 0; attempt < 20; attempt++) {
            const num = Math.floor(1000 + Math.random() * 9000);
            const candidate = `SHOP${num}`;
            const taken = await prisma.$queryRaw`
                SELECT id FROM Tenant WHERE shopCode = ${candidate}
            ` as any[];
            if (taken.length === 0) { shopCode = candidate; break; }
        }
        if (!shopCode) {
            return NextResponse.json({ error: "Do'kon kodi generatsiya qilib bo'lmadi" }, { status: 500 });
        }

        const passwordHash = await hashPassword(adminPassword);
        const id = `cm${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
        
        // Obuna muddatini hisoblash (expiresAt)
        const subDays = settings?.subscriptionDays || 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + subDays);
        
        const settingsStr = JSON.stringify(settings || {});

        // Generate a unique 8-digit Billing ID — retry if collision
        let billingId = "";
        for (let attempt = 0; attempt < 10; attempt++) {
            const candidate = Math.floor(10000000 + Math.random() * 90000000).toString();
            const existing = await prisma.$queryRaw`
                SELECT id FROM Tenant WHERE billingId = ${candidate}
            ` as any[];
            if (existing.length === 0) { billingId = candidate; break; }
        }
        if (!billingId) {
            return NextResponse.json({ error: "Billing ID generatsiya qilib bo'lmadi, qayta urinib ko'ring" }, { status: 500 });
        }

        await prisma.$executeRaw`
            INSERT INTO Tenant (id, shopCode, billingId, shopName, ownerName, phone, email, address, plan, status, adminUsername, adminPasswordHash, settings, agentCode, createdAt, expiresAt)
            VALUES (${id}, ${shopCode}, ${billingId}, ${shopName}, ${ownerName}, ${phone || ""}, ${email || ""}, ${address || ""}, ${plan || "basic"}, ${status || "active"}, ${adminUsername}, ${passwordHash}, ${settingsStr}, ${agentCode || null}, datetime('now'), ${expiresAt})
        `;

        return NextResponse.json({
            success: true,
            tenant: { id, shopCode, billingId, shopName },
        }, { status: 201 });
    } catch (error) {
        console.error("Create tenant error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
