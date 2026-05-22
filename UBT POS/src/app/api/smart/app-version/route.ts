import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Joriy versiya va yuklab olish manzili
const CURRENT_VERSION = "2.0.0";
const DOWNLOAD_BASE = process.env.NEXT_PUBLIC_APP_URL || "https://chaqqonpro.uz";

export async function GET() {
    return NextResponse.json({
        version: CURRENT_VERSION,
        downloadUrl: `${DOWNLOAD_BASE}/downloads/SMART-POS-V2-Setup-${CURRENT_VERSION}.exe`,
        releaseNotes: [
            "Oq ekran (crash) himoyasi qo'shildi",
            "Keshni tozalash funksiyasi qo'shildi",
            "Print Agent xatolariga nisbatan barqarorlik",
            "Yangi yuklanish ekrani (splash screen)",
        ],
        minVersion: "2.0.0",
        forceUpdate: true,
        publishedAt: "2024-05-23T00:00:00Z",
    });
}
