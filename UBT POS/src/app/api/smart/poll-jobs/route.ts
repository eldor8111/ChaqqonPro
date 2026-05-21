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
                const processingPath = filepath + ".processing";
                
                try {
                    // 1. Dastlab fayl nomini o'zgartiramiz. Agar u band bo'lsa (File Lock), xatolik beradi va o'tkazib yuboriladi.
                    fs.renameSync(filepath, processingPath);
                    
                    // 2. O'qiymiz
                    const content = fs.readFileSync(processingPath, "utf8");
                    jobs.push({ id: file, ...JSON.parse(content) });
                    
                    // 3. To'liq o'chirib yuboramiz
                    fs.unlinkSync(processingPath);
                } catch (e) {
                    // Agar xatolik bo'lsa (Windows ruxsat bermasa), uni jobs'ga qo'shmaymiz
                    console.error("Print job process error:", e);
                }
            }
        }
        
        return NextResponse.json({ jobs });
    } catch (e) {
        return NextResponse.json({ jobs: [] });
    }
}
