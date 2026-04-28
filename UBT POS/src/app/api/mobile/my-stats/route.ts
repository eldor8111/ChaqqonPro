export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { jwtVerify } from "jose";

function getJwtSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET not set");
    return new TextEncoder().encode(secret);
}

export async function GET(req: NextRequest) {
    try {
        // JWT token orqali autentifikatsiya
        const authHeader = req.headers.get("authorization") || "";
        const token = authHeader.replace("Bearer ", "").trim();
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        let payload: any;
        try {
            const result = await jwtVerify(token, getJwtSecret());
            payload = result.payload;
        } catch {
            return NextResponse.json({ error: "Token yaroqsiz" }, { status: 401 });
        }

        const { tenantId, name, userId } = payload;
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Vaqt oralig'ini hisoblash: bugun (00:00 - hozir)
        const now = new Date();
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

        const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
        const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

        // Xodim nomi bo'yicha tranzaksiyalarni olish
        const [todayTx, weekTx, monthTx] = await Promise.all([
            prisma.transaction.findMany({
                where: { tenantId, kassirName: name, status: "completed", createdAt: { gte: todayStart, lte: todayEnd } },
                select: { amount: true, method: true, createdAt: true, tableLabel: true },
            }),
            prisma.transaction.findMany({
                where: { tenantId, kassirName: name, status: "completed", createdAt: { gte: weekStart, lte: todayEnd } },
                select: { amount: true, method: true, createdAt: true },
            }),
            prisma.transaction.findMany({
                where: { tenantId, kassirName: name, status: "completed", createdAt: { gte: monthStart, lte: todayEnd } },
                select: { amount: true, method: true, createdAt: true },
            }),
        ]);

        const sumTx = (txs: { amount: any }[]) => txs.reduce((s, t) => s + (Number(t.amount) || 0), 0);

        const todayTotal = sumTx(todayTx);
        const todayCash = todayTx.filter(t => t.method?.toLowerCase().includes("naqd") || t.method?.toLowerCase() === "cash").reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const todayCard = todayTx.filter(t => t.method?.toLowerCase().includes("karta") || t.method?.toLowerCase().includes("card")).reduce((s, t) => s + (Number(t.amount) || 0), 0);

        // Bugungi soat bo'yicha savdolar (timeline)
        const hourlyMap: Record<string, number> = {};
        for (const tx of todayTx) {
            const h = `${String(new Date(tx.createdAt).getHours()).padStart(2, "0")}:00`;
            hourlyMap[h] = (hourlyMap[h] || 0) + (Number(tx.amount) || 0);
        }
        const hourlyTimeline = Object.entries(hourlyMap)
            .map(([hour, total]) => ({ hour, total }))
            .sort((a, b) => a.hour.localeCompare(b.hour));

        // Oxirgi 5 ta tranzaksiya
        const recentOrders = todayTx.slice(-5).reverse().map(t => ({
            amount: Number(t.amount),
            method: t.method,
            table: (t as any).tableLabel || "—",
            time: new Date(t.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
        }));

        return NextResponse.json({
            name,
            today: {
                total: todayTotal,
                count: todayTx.length,
                cash: todayCash,
                card: todayCard,
            },
            week: { total: sumTx(weekTx), count: weekTx.length },
            month: { total: sumTx(monthTx), count: monthTx.length },
            hourlyTimeline,
            recentOrders,
        });

    } catch (e: any) {
        return NextResponse.json({ error: "Server xatoligi", details: e.message }, { status: 500 });
    }
}
