const { printRaw, discoverAllPrinters } = require('./printer');
const net = require('net');

let pollTimer = null;
let syncTimer = null;
let isPolling = false;

// ─── Per-printer qulf ───────────────────────────────────────────
// Arzon LAN printerlar faqat BITTA ulanishni qabul qiladi. Shu sabab
// bir printerga chek chiqarish va heartbeat probe bir vaqtda bo'lmasligi
// kerak — aks holda biri rad etiladi. Har printer uchun navbat (mutex).
const ipLocks = new Map();
function withIpLock(key, task) {
    const prev = ipLocks.get(key) || Promise.resolve();
    const run = prev.catch(() => {}).then(task);
    ipLocks.set(key, run.catch(() => {}));
    return run;
}

// ─── TCP probe (heartbeat uchun) ────────────────────────────────
function probeTcp(ip, port, timeout = 1500) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let settled = false;
        const finish = (val) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            socket.destroy();
            resolve(val);
        };
        const timer = setTimeout(() => finish(false), timeout);
        socket.on('error', () => finish(false));
        socket.connect(port, ip, () => finish(true));
    });
}

// ─── Print queue worker tick ────────────────────────────────────
// Server pending joblarni o'zi chop etadi (EXE: to'g'ridan-to'g'ri TCP;
// VPS: .print_queue faylga yozadi → pollJobs uni olib lokal chop etadi)
async function processQueue(serverUrl) {
    try {
        const res = await fetch(`${serverUrl}/api/smart/print-queue/process`, {
            method: 'POST',
            signal: AbortSignal.timeout(30000),
        });
        if (res.ok) {
            const data = await res.json();
            if (data.processed && data.processed.length > 0) {
                for (const r of data.processed) {
                    console.log(`[QUEUE ${r.ok ? '✅' : '❌'}] Job ${r.id}${r.error ? ' — ' + r.error : ''}`);
                }
            }
        }
    } catch (e) {
        const silent = ['TimeoutError', 'AbortError', 'TypeError'];
        if (!silent.includes(e.name) && e.code !== 'ECONNREFUSED' && e.code !== 'ENOTFOUND') {
            console.error('[QUEUE ❌]', e.message || String(e));
        }
    }
}

// ─── Heartbeat: saqlangan printerlarni lokal probe qilib serverga yuborish ───
async function heartbeat(serverUrl) {
    try {
        const res = await fetch(`${serverUrl}/api/smart/printer-heartbeat`, {
            signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return;
        const data = await res.json();
        const printers = data.printers || [];
        if (printers.length === 0) return;

        const results = [];
        for (const p of printers) {
            if (!p.ipAddress || p.ipAddress.startsWith('usb://')) continue;
            const started = Date.now();
            // Qulf orqali — print bilan to'qnashmasin
            const ok = await withIpLock(`${p.ipAddress}:${p.port || 9100}`, () => probeTcp(p.ipAddress, p.port || 9100));
            results.push({
                id: p.id,
                status: ok ? 'online' : 'offline',
                latencyMs: ok ? Date.now() - started : null,
            });
        }
        if (results.length === 0) return;

        await fetch(`${serverUrl}/api/smart/printer-heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId: 'tray-agent', printers: results }),
            signal: AbortSignal.timeout(10000),
        });
        const online = results.filter(r => r.status === 'online').length;
        console.log(`[HEARTBEAT] ${online}/${results.length} printer online`);
    } catch (e) {
        const silent = ['TimeoutError', 'AbortError', 'TypeError'];
        if (!silent.includes(e.name) && e.code !== 'ECONNREFUSED' && e.code !== 'ENOTFOUND') {
            console.error('[HEARTBEAT ❌]', e.message || String(e));
        }
    }
}

// Oxirgi discovery natijasini kesh — har sinxronlashda scan qilmasin
let _lastDiscovered = null;
let _lastDiscoveryAt = 0;
// 30 daqiqa — to'liq subnet skan og'ir (1000+ IP), kuchsiz POS kompyuterni sekinlashtiradi.
// Foydalanuvchi "Printer qidirish" bosganda baribir majburiy yangi skan ishlaydi.
const DISCOVERY_CACHE_MS = 30 * 60_000;

async function syncPrinters(serverUrl, forceDiscover = false) {
    try {
        let discovered;
        const now = Date.now();

        // Discovery: kesh muddati o'tgan bo'lsa yoki majburiy bo'lsa
        if (forceDiscover || !_lastDiscovered || (now - _lastDiscoveryAt) > DISCOVERY_CACHE_MS) {
            console.log('[SYNC] Printer qidirish boshlandi (LAN + USB)...');
            _lastDiscovered = await discoverAllPrinters();
            _lastDiscoveryAt = now;
        }
        discovered = _lastDiscovered;

        if (discovered.length === 0) {
            console.log('[SYNC] Hech qanday printer topilmadi.');
            return;
        }

        // Serverga: {printers: string[], discovered: [{ip,port,method,name}]}
        // Eski API bilan mos kelish uchun printers (nom ro'yxati) ham yuboriladi
        const printerNames = discovered
            .filter(p => p.method === 'usb' && p.name)
            .map(p => p.name);

        const res = await fetch(`${serverUrl}/api/smart/agent-printers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                printers:   printerNames,   // Eski format (USB nomlar)
                discovered,                  // Yangi format (LAN + USB + COM)
                _t: now,
            }),
            signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
            const lan = discovered.filter(p => p.method === 'tcp_scan').length;
            const usb = discovered.filter(p => p.method === 'usb').length;
            const com = discovered.filter(p => p.method === 'com').length;
            console.log(`[SYNC ✅] Serverga uzatildi: ${lan} LAN + ${usb} USB + ${com} COM`);
        } else {
            console.warn(`[SYNC ⚠️] Server ${res.status} javob qaytardi.`);
        }
    } catch (e) {
        if (e.name !== 'TimeoutError' && e.name !== 'AbortError') {
            console.error('[SYNC ❌] Serverga ulanib bo\'lmadi:', e.message || String(e));
        }
    }
}

async function pollJobs(serverUrl) {
    if (isPolling) return;
    isPolling = true;
    const ackIds = []; // chop etilgan job id'lari — serverga tasdiqlash uchun

    try {
        // 20s long-poll: server fayl paydo bo'lishi bilanoq qaytaradi → 30s timeout
        const res = await fetch(`${serverUrl}/api/smart/poll-jobs?v=2`, {
            signal: AbortSignal.timeout(30000),
        });

        if (res.ok) {
            const responseData = await res.json();
            const jobs = responseData.jobs || [];

            if (jobs.length > 0) {
                console.log(`[POLL] ${jobs.length} ta yangi print job topildi.`);

                // Joblarni printer bo'yicha guruhlash — har printer mustaqil (tez)
                const byPrinter = {};
                for (const job of jobs) {
                    const printerName = job.printerName || job.printer || job.name || '';
                    const base64data  = job.data || job.payload || job.escpos || '';
                    const printerIp   = job.printerIp   || job.ip   || null;
                    const printerPort = job.printerPort || job.port || 9100;
                    if (!base64data || (!printerName && !printerIp)) {
                        // Tarkibi to'liq emas — baribir ACK qilamiz (qayta yuborilmasin)
                        if (job.id) ackIds.push(job.id);
                        console.warn(`[POLL] Job tarkibi to'liq emas: ${JSON.stringify(Object.keys(job))}`);
                        continue;
                    }
                    const key = printerIp ? `${printerIp}:${printerPort}` : `usb:${printerName}`;
                    (byPrinter[key] = byPrinter[key] || []).push({ id: job.id, printerName, base64data, printerIp, printerPort });
                }

                // TURLI printerlar PARALLEL chiqadi; bitta printer ichida ketma-ket
                // (bitta-ulanishli printerlar to'qnashmasligi uchun). Shu sabab nechta
                // printer bo'lsa ham har biri tez ishlaydi — biri ikkinchisini kutmaydi.
                await Promise.all(Object.values(byPrinter).map(async (group) => {
                    for (const j of group) {
                        try {
                            const lockKey = j.printerIp ? `${j.printerIp}:${j.printerPort}` : `usb:${j.printerName}`;
                            const result = await withIpLock(lockKey, () => printRaw(j.printerName, j.base64data, {
                                printerIp: j.printerIp,
                                printerPort: j.printerPort,
                            }));
                            if (result.success) {
                                // Faqat MUVAFFAQIYATLI chiqqan job ACK qilinadi → server o'chiradi.
                                // Xato bo'lsa ACK qilmaymiz → 30s dan keyin qayta yuboriladi.
                                if (j.id) ackIds.push(j.id);
                                const method = result.method === 'lan'
                                    ? `LAN (${j.printerIp}:${j.printerPort})`
                                    : `USB/Spooler ("${j.printerName}")`;
                                console.log(`[POLL ✅] Chop etildi → ${method}`);
                            } else {
                                console.error(`[POLL ❌] Chop etib bo'lmadi (qayta yuboriladi):`, result.error);
                            }
                        } catch (printErr) {
                            console.error('[POLL PRINT ERROR]', printErr);
                        }
                    }
                }));
            }

            // Chop etilgan joblarni serverga tasdiqlaymiz (ACK) — server ularni o'chiradi
            if (ackIds.length > 0) {
                try {
                    await fetch(`${serverUrl}/api/smart/poll-jobs`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ack: ackIds }),
                        signal: AbortSignal.timeout(10000),
                    });
                } catch { /* ACK yetib bormasa, job 30s dan keyin qayta yuboriladi (dublikat xavfi kam) */ }
            }
        }
    } catch (e) {
        const silent = ['TimeoutError','AbortError','TypeError'];
        if (!silent.includes(e.name) && e.code !== 'ECONNREFUSED' && e.code !== 'ENOTFOUND') {
            console.error('[POLL ❌]', e.message || String(e));
        }
    } finally {
        isPolling = false;
    }
}

// Uzluksiz long-poll tsikli — pollJobs qaytishi bilanoq darhol qayta so'raydi.
// Shu tariqa doim bitta ochiq long-poll bo'ladi → chek deyarli darhol chiqadi.
let jobLoopActive = false;
async function jobLoop(serverUrl) {
    if (jobLoopActive) return;
    jobLoopActive = true;
    while (jobLoopActive) {
        try {
            await pollJobs(serverUrl);
        } catch { /* xatoni jim yutamiz */ }
        // Tight-loop oldini olish uchun juda qisqa pauza (tezroq navbat)
        await new Promise(r => setTimeout(r, 50));
    }
}

function startPolling(config) {
    if (pollTimer || jobLoopActive) stopPolling();

    const { serverUrl } = config;
    console.log(`[AGENT V2] Long-poll boshlandi → ${serverUrl}`);

    jobLoop(serverUrl);          // uzluksiz long-poll (fayl navbati)
    syncPrinters(serverUrl);
    processQueue(serverUrl);
    heartbeat(serverUrl);

    // DB-navbat (print-queue) va heartbeat — alohida intervalda
    pollTimer = setInterval(() => {
        processQueue(serverUrl);
    }, 3000);

    syncTimer = setInterval(() => {
        syncPrinters(serverUrl);
        heartbeat(serverUrl);
    }, 30_000);
}

function stopPolling() {
    jobLoopActive = false; // long-poll tsiklini to'xtatish
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
    if (syncTimer) {
        clearInterval(syncTimer);
        syncTimer = null;
    }
    console.log('[AGENT V2] Polling to\'xtatildi.');
}

module.exports = { startPolling, stopPolling, syncPrinters };
