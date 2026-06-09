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

async function pollJobsLogic(agentPrinters: string[]) {
    const queueDir = path.join(process.cwd(), ".print_queue");
    if (!fs.existsSync(queueDir)) fs.mkdirSync(queueDir, { recursive: true });
    
    try {
        let files = fs.readdirSync(queueDir).filter(f => f.endsWith(".json"));
        if (files.length === 0) {
            await new Promise(r => setTimeout(r, 2000));
            files = fs.readdirSync(queueDir).filter(f => f.endsWith(".json"));
        }

        const jobs = [];
        const isFiltering = agentPrinters.length > 0;
        
        for (const file of files) {
            const filepath = path.join(queueDir, file);
            
            try {
                // If filtering is enabled, peek inside the job first
                if (isFiltering) {
                    const content = fs.readFileSync(filepath, "utf8");
                    const job = JSON.parse(content);
                    const isLAN = !!job.printerIp;
                    const isUSB = !isLAN && agentPrinters.includes(job.printerName);
                    
                    if (!isLAN && !isUSB) {
                        continue; // Not for this agent
                    }
                }

                const processingPath = filepath + ".processing";
                // Lock the file
                fs.renameSync(filepath, processingPath);
                
                // Read and add to jobs
                const content = fs.readFileSync(processingPath, "utf8");
                jobs.push({ id: file, ...JSON.parse(content) });
                
                // Remove the job completely
                fs.unlinkSync(processingPath);
            } catch (e) {
                // File might be locked or deleted by another agent
            }
        }
        return NextResponse.json({ jobs });
    } catch (e) {
        return NextResponse.json({ jobs: [] });
    }
}
