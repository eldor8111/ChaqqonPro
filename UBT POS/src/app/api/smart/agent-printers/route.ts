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
        const filePath = path.join(process.cwd(), ".print_queue", "agent_printers.json");
        fs.writeFileSync(filePath, JSON.stringify(data));
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false });
    }
}
