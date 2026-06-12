import { NextRequest, NextResponse } from "next/server";
import net from "net";
import os from "os";

export const dynamic = "force-dynamic";

function getLocalSubnets(): string[] {
    const subnets: string[] = [];
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
        for (const iface of (ifaces[name] || [])) {
            if (iface.family === "IPv4" && !iface.internal) {
                const parts = iface.address.split(".");
                const subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
                if (!subnets.includes(subnet)) subnets.push(subnet);
            }
        }
    }
    return subnets;
}

function probeTCP(ip: string, port: number, timeout = 600): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let done = false;
        const finish = (val: boolean) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            socket.destroy();
            resolve(val);
        };
        const timer = setTimeout(() => finish(false), timeout);
        socket.connect(port, ip, () => finish(true));
        socket.on("error", () => finish(false));
    });
}

async function scanSubnet(subnet: string, port: number): Promise<string[]> {
    const found: string[] = [];
    const BATCH = 40;
    for (let start = 1; start <= 254; start += BATCH) {
        const end = Math.min(start + BATCH - 1, 254);
        const batch = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        const results = await Promise.allSettled(
            batch.map(i => probeTCP(`${subnet}.${i}`, port))
        );
        results.forEach((r, idx) => {
            if (r.status === "fulfilled" && r.value) {
                found.push(`${subnet}.${batch[idx]}`);
            }
        });
    }
    return found;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const port: number = body.port || 9100;
        const subnets = getLocalSubnets();

        // Mashhur printer zavod subnetlari (Xprinter default: 192.168.123.100)
        if (subnets.length > 0) {
            for (const c of ["192.168.123", "192.168.0", "192.168.1"]) {
                if (!subnets.includes(c)) subnets.push(c);
            }
        }

        if (subnets.length === 0) {
            return NextResponse.json({ printers: [], subnets: [], note: "Tarmoq interfeysi topilmadi" });
        }

        const allFound: string[] = [];
        for (const subnet of subnets) {
            const found = await scanSubnet(subnet, port);
            allFound.push(...found);
        }

        return NextResponse.json({
            printers: allFound.map(ip => ({ ip, port, method: "tcp_scan" })),
            subnets,
        });
    } catch (err) {
        return NextResponse.json({ printers: [], error: String(err) }, { status: 500 });
    }
}
