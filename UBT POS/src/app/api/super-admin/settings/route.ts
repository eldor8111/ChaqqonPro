import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSuperSession } from "@/lib/backend/auth";

const DEFAULT_SETTINGS: Record<string, string> = {
    card_number: "8600 0000 0000 0000",
    card_owner:  "Karta egasi",
    tg_username: "chaqqon_support",
    phone:       "+998 99 000 00 00",
    phone_raw:   "+998990000000",
};

async function getSettings() {
    const rows = await prisma.platformSettings.findMany();
    const result = { ...DEFAULT_SETTINGS };
    for (const r of rows) {
        if (r.value !== null) result[r.key] = r.value;
    }
    return result;
}

// GET /api/super-admin/settings
export async function GET(req: NextRequest) {
    try {
        const session = await getSuperSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const settings = await getSettings();
        return NextResponse.json({ settings });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// POST /api/super-admin/settings — sozlamalarni saqlash
export async function POST(req: NextRequest) {
    try {
        const session = await getSuperSession();
        if (!session || session.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Faqat Super Admin uchun" }, { status: 403 });
        }
        const { settings } = await req.json();
        if (!settings || typeof settings !== "object") {
            return NextResponse.json({ error: "settings object kerak" }, { status: 400 });
        }
        for (const [key, value] of Object.entries(settings)) {
            await prisma.platformSettings.upsert({
                where: { key },
                update: { value: String(value) },
                create: { key, value: String(value) },
            });
        }
        return NextResponse.json({ ok: true, settings: await getSettings() });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
