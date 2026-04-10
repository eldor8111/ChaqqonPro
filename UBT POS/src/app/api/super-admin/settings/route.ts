import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";

// Boot up sequence for SystemSettings if missing
const _ensureSettingsDB = prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS SystemSettings (
        id TEXT PRIMARY KEY,
        settingKey TEXT UNIQUE NOT NULL,
        settingValue TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).catch(() => {});

// Barcha settinglarni olish
export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (session?.userId !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const rawSettings: any[] = await prisma.$queryRawUnsafe(`SELECT settingKey, settingValue FROM SystemSettings`);
        const settingsMap: Record<string, string> = {};
        rawSettings.forEach(r => {
            settingsMap[r.settingKey] = r.settingValue;
        });

        return NextResponse.json({ settings: settingsMap });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// Bitta yoki birnechta settinglarni saqlash
export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (session?.userId !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const settingsToUpdate = body.settings; // = { supportBotToken: "123", supportChatId: "-100" }

        for (const [key, value] of Object.entries(settingsToUpdate)) {
            const uuid = crypto.randomUUID();
            await prisma.$executeRawUnsafe(
                `INSERT INTO SystemSettings (id, settingKey, settingValue) 
                 VALUES (?, ?, ?) 
                 ON CONFLICT(settingKey) DO UPDATE SET settingValue=excluded.settingValue, updatedAt=CURRENT_TIMESTAMP`,
                uuid, key, String(value)
            );
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
