import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
    return pollJobsLogic([]);
}

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    // ACK: agent chop etgan joblarni tasdiqlaydi → server ularni o'chiradi.
    // Tasdiqlanmagan joblar .processing da qoladi va 30s dan keyin qayta yuboriladi.
    if (Array.isArray(body.ack) && body.ack.length > 0) {
        const queueDir = path.join(process.cwd(), ".print_queue");
        for (const id of body.ack) {
            if (typeof id !== "string") continue;
            const safe = id.replace(/[/\\]/g, ""); // path traversal himoyasi
            try { fs.unlinkSync(path.join(queueDir, safe + ".processing")); } catch { /* allaqachon o'chgan */ }
        }
        return NextResponse.json({ ok: true });
    }
    return pollJobsLogic(body.printers || []);
}

/** Osilib qolgan .processing fayllarni tiklash — server/agent print payti qayta ishga
 * tushgan bo'lsa, chek yo'qolmasin. 30s dan eski bo'lsa qayta .json ga qaytaramiz. */
async function recoverStaleProcessing(queueDir: string): Promise<void> {
    try {
        const now = Date.now();
        const files = await fs.promises.readdir(queueDir);
        for (const f of files) {
            if (!f.endsWith(".processing")) continue;
            const p = path.join(queueDir, f);
            try {
                const stat = await fs.promises.stat(p);
                const age = now - stat.mtimeMs;
                if (age > 30_000) await fs.promises.rename(p, p.replace(/\.processing$/, ""));
            } catch { /* boshqa jarayon olgan */ }
        }
    } catch { /* papka yo'q */ }
}

/** Navbat papkasidan joblarni o'qib, ularni "claim" qiladi (boshqa agent olmasligi uchun) */
async function collectJobs(queueDir: string, agentPrinters: string[]): Promise<any[]> {
    await recoverStaleProcessing(queueDir);
    // Faqat print job fayllari — agent_printers.json (printerlar keshi) print job emas.
    // NAVBAT BILAN (FIFO): fayl nomi vaqt belgisi bilan boshlanadi, shuning uchun
    // nom bo'yicha saralash = yaratilish tartibi = chek navbati.
    let files: string[] = [];
    try {
        const allFiles = await fs.promises.readdir(queueDir);
        files = allFiles.filter(f => f.endsWith(".json") && f !== "agent_printers.json").sort();
    } catch { return []; }
    
    const jobs: any[] = [];
    const isFiltering = agentPrinters.length > 0;

    for (const file of files) {
        const filepath = path.join(queueDir, file);
        try {
            if (isFiltering) {
                const content = await fs.promises.readFile(filepath, "utf8");
                const job = JSON.parse(content);
                const isLAN = !!job.printerIp;
                const isUSB = !isLAN && agentPrinters.includes(job.printerName);
                if (!isLAN && !isUSB) continue; // bu agent uchun emas
            }
            const processingPath = filepath + ".processing";
            await fs.promises.rename(filepath, processingPath); // qulflash (atomik)
            const content = await fs.promises.readFile(processingPath, "utf8");
            // O'CHIRMAYMIZ — agent chop etib ACK yuborgandan keyin o'chiriladi.
            // Agar ACK kelmasa (javob yo'qoldi yoki print xato), 30s dan keyin
            // recoverStaleProcessing qayta .json ga qaytaradi → chek yo'qolmaydi.
            jobs.push({ id: file, ...JSON.parse(content) });
        } catch { /* boshqa poll olgan yoki o'chgan */ }
    }
    return jobs;
}

async function pollJobsLogic(agentPrinters: string[]) {
    const queueDir = path.join(process.cwd(), ".print_queue");
    if (!fs.existsSync(queueDir)) fs.mkdirSync(queueDir, { recursive: true });

    try {
        // UZLUKSIZ LONG-POLL: fayl paydo bo'lishi bilanoq qaytaramiz.
        // Asinxron file tizimidan foydalaniladi, shunda event loop qotmaydi.
        const deadline = Date.now() + 25_000; // 25s long-poll oynasi (uzunroq = kamroq qayta ulanish)
        while (true) {
            const jobs = await collectJobs(queueDir, agentPrinters);
            if (jobs.length > 0) return NextResponse.json({ jobs });
            if (Date.now() >= deadline) return NextResponse.json({ jobs: [] });
            await new Promise(r => setTimeout(r, 300)); // tezlashtirildi: 300ms (oldin 50ms edi va sync bo'lgani uchun qotardi)
        }
    } catch {
        return NextResponse.json({ jobs: [] });
    }
}
