import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
    return pollJobsLogic([]);
}

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    return pollJobsLogic(body.printers || []);
}

/** Navbat papkasidan joblarni o'qib, ularni "claim" qiladi (boshqa agent olmasligi uchun) */
function collectJobs(queueDir: string, agentPrinters: string[]): any[] {
    const files = fs.readdirSync(queueDir).filter(f => f.endsWith(".json"));
    const jobs: any[] = [];
    const isFiltering = agentPrinters.length > 0;

    for (const file of files) {
        const filepath = path.join(queueDir, file);
        try {
            if (isFiltering) {
                const content = fs.readFileSync(filepath, "utf8");
                const job = JSON.parse(content);
                const isLAN = !!job.printerIp;
                const isUSB = !isLAN && agentPrinters.includes(job.printerName);
                if (!isLAN && !isUSB) continue; // bu agent uchun emas
            }
            const processingPath = filepath + ".processing";
            fs.renameSync(filepath, processingPath); // qulflash
            const content = fs.readFileSync(processingPath, "utf8");
            jobs.push({ id: file, ...JSON.parse(content) });
            fs.unlinkSync(processingPath);
        } catch { /* boshqa agent olgan yoki o'chgan */ }
    }
    return jobs;
}

async function pollJobsLogic(agentPrinters: string[]) {
    const queueDir = path.join(process.cwd(), ".print_queue");
    if (!fs.existsSync(queueDir)) fs.mkdirSync(queueDir, { recursive: true });

    try {
        // UZLUKSIZ LONG-POLL: fayl paydo bo'lishi bilanoq (250ms ichida) qaytaramiz.
        // Bu chekni deyarli darhol chiqaradi (oldingi 2s+ kutish o'rniga).
        const deadline = Date.now() + 20_000; // 20s long-poll oynasi
        while (true) {
            const jobs = collectJobs(queueDir, agentPrinters);
            if (jobs.length > 0) return NextResponse.json({ jobs });
            if (Date.now() >= deadline) return NextResponse.json({ jobs: [] });
            await new Promise(r => setTimeout(r, 250));
        }
    } catch {
        return NextResponse.json({ jobs: [] });
    }
}
