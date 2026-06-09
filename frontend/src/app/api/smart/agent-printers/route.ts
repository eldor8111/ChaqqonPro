import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

function getPrintersFilePath(): string {
    // Express server (port 4000) ham shu yo'lga yozadi
    const appData = process.env.APPDATA || process.env.LOCALAPPDATA || os.homedir();
    return path.join(appData, "smart-pos-v2", "agent_printers.json");
}

export async function GET() {
    const filePath = getPrintersFilePath();
    if (!fs.existsSync(filePath)) return NextResponse.json({ printers: [] });

    try {
        const content = fs.readFileSync(filePath, "utf8");
        return NextResponse.json(JSON.parse(content));
    } catch {
        return NextResponse.json({ printers: [] });
    }
}

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        const filePath = getPrintersFilePath();
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(data));
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false });
    }
}
