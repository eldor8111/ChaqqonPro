import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
    const filePath = path.join(process.cwd(), ".print_queue", "agent_printers.json");
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
        const dir = path.join(process.cwd(), ".print_queue");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        // Atomik yozish — yarim o'qish bo'lmasligi uchun
        const tmp = path.join(dir, "agent_printers.json.tmp");
        fs.writeFileSync(tmp, JSON.stringify(data));
        fs.renameSync(tmp, path.join(dir, "agent_printers.json"));
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false });
    }
}
