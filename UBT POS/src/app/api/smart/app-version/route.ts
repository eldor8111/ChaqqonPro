import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Joriy versiya va yuklab olish manzili
const CURRENT_VERSION = "1.0.0";
const DOWNLOAD_BASE = process.env.NEXT_PUBLIC_APP_URL || "https://chaqqonpro.uz";

export async function GET() {
    return NextResponse.json({
        version: CURRENT_VERSION,
        downloadUrl: `${DOWNLOAD_BASE}/downloads/SMART-POS-Setup-${CURRENT_VERSION}.exe`,
        releaseNotes: [
            "Print Agent integratsiya qilindi — alohida dastur shart emas",
            "Kiosk to'liq ekran rejimi",
            "Avto-ishga tushish (Windows Startup)",
            "Printerlarni avtomatik sinxronlash",
        ],
        minVersion: "1.0.0",
        forceUpdate: false,
        publishedAt: "2024-01-01T00:00:00Z",
    });
}
