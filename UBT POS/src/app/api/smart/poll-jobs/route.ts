import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
    const queueDir = path.join(process.cwd(), ".print_queue");
    if (!fs.existsSync(queueDir)) fs.mkdirSync(queueDir, { recursive: true });
    
    try {
        const files = fs.readdirSync(queueDir);
        const jobs = [];
        
        for (const file of files) {
            if (file.endsWith(".json")) {
                const filepath = path.join(queueDir, file);
                try {
                    const content = fs.readFileSync(filepath, "utf8");
                    jobs.push({ id: file, ...JSON.parse(content) });
                    // Faylni uzoqroq qolishiga yo'l qo'ymaslik uchun darhol o'chirib yuboramiz
                    fs.unlinkSync(filepath);
                } catch (e) {
                    console.error("Print job read error:", e);
                }
            }
        }
        
        return NextResponse.json({ jobs });
    } catch (e) {
        return NextResponse.json({ jobs: [] });
    }
}
