const { printRaw, discoverAllPrinters } = require('./printer');
const net = require('net');

let pollTimer = null;
let syncTimer = null;

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
            const key = `${p.ipAddress}:${p.port || 9100}`;
            // PRINT USTUN: navbatda job bor yoki print bo'layotgan printerni PROBE QILMAYMIZ.
            // Arzon printer yagona TCP slotga ega — probe uni band qilsa chek kechikadi.
            // Print bo'layotgani = printer tirik, shuning uchun "online" deb hisoblaymiz.
            if (activeWorkers.has(key) || (printQueues.get(key)?.length > 0)) {
                results.push({ id: p.id, status: 'online', latencyMs: null });
                continue;
            }
            const started = Date.now();
            // Qulf orqali — print bilan to'qnashmasin
            const ok = await withIpLock(key, () => probeTcp(p.ipAddress, p.port || 9100));
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

// ══════════════════════════════════════════════════════════════════
//  PRINT'NI POLLING'DAN AJRATISH — eng katta kechikish sababini bartaraf
//
//  Eski muammo: agent bitta ipda HAM poll qilardi HAM print qilardi.
//  Print tugamaguncha (sekin/band printer + retry → soniyalar) yangi
//  long-poll OCHILMASdi → ikkinchi chek kutib qolardi yoki yo'qolardi.
//
//  Yangi arxitektura:
//   • jobLoop — DOIM ochiq long-poll. Job'ni OLADI, per-printer navbatga
//     soladi va DARHOL qayta poll ochadi. Print'ni KUTMAYDI.
//   • drainPrinter — har printer uchun MUSTAQIL worker. Bittasi sekin
//     bo'lsa boshqasi ta'sirlanmaydi; bir printer ichida ketma-ket
//     (yagona-ulanishli arzon printerlar to'qnashmasin).
//   • Dublikat himoyasi: enqueuedIds (navbatdagi) + printedIds (yaqinda
//     chop etilgan — ACK yo'qolib qayta kelsa qayta chop etmaymiz).
// ══════════════════════════════════════════════════════════════════
const printQueues = new Map();    // key → [job, ...]
const activeWorkers = new Set();  // key → worker hozir ishlayaptimi
const enqueuedIds = new Set();    // navbatdagi/print bo'layotgan job id'lar
const printedIds = new Map();     // yaqinda chop etilgan id → vaqt (dublikat oldini olish)
let pendingAck = [];              // serverga tasdiqlash kutayotgan id'lar
let jobLoopActive = false;

function printerKeyOf(job) {
    return job.printerIp ? `${job.printerIp}:${job.printerPort || 9100}` : `usb:${job.printerName || ''}`;
}

// Eski printed id'larni tozalash — xotira cheksiz o'smasin
function purgePrintedIds() {
    const cutoff = Date.now() - 120_000;
    for (const [id, t] of printedIds) if (t < cutoff) printedIds.delete(id);
}

// Chop etilgan id'larni serverga tasdiqlash (fire-and-forget — poll'ni bloklamaydi)
async function flushAck(serverUrl) {
    if (pendingAck.length === 0) return;
    const ids = pendingAck;
    pendingAck = [];
    try {
        await fetch(`${serverUrl}/api/smart/poll-jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ack: ids }),
            signal: AbortSignal.timeout(10000),
        });
    } catch {
        // ACK yetib bormasa — server 30s dan keyin qayta yuboradi; printedIds dublikatni to'sadi
    }
}

// Bitta printer navbatini ketma-ket bo'shatuvchi worker
async function drainPrinter(serverUrl, key) {
    if (activeWorkers.has(key)) return; // shu printer uchun worker allaqachon ishlayapti
    activeWorkers.add(key);
    try {
        const queue = printQueues.get(key);
        while (queue && queue.length > 0) {
            const j = queue.shift();
            try {
                const result = await withIpLock(key, () => printRaw(j.printerName, j.base64data, {
                    printerIp: j.printerIp,
                    printerPort: j.printerPort,
                }));
                if (result.success) {
                    // Faqat MUVAFFAQIYATLI chiqqan job ACK qilinadi
                    if (j.id) { pendingAck.push(j.id); printedIds.set(j.id, Date.now()); }
                    const method = result.method === 'lan' ? `LAN (${key})` : `USB ("${j.printerName}")`;
                    console.log(`[PRINT ✅] ${method}`);
                } else {
                    // ACK qilmaymiz → server 30s dan keyin qayta yuboradi (printer vaqtincha o'chiq bo'lishi mumkin)
                    console.error(`[PRINT ❌] ${key} (qayta yuboriladi):`, result.error);
                }
            } catch (printErr) {
                console.error('[PRINT ERROR]', printErr);
            } finally {
                if (j.id) enqueuedIds.delete(j.id);
            }
            flushAck(serverUrl); // fonda tasdiqlaymiz — keyingi printni kutdirmaymiz
        }
    } finally {
        activeWorkers.delete(key);
        // Worker tugagan onda navbatga yangi job tushgan bo'lsa — qayta ishga tushiramiz (race himoyasi)
        const q = printQueues.get(key);
        if (q && q.length > 0) drainPrinter(serverUrl, key);
    }
}

// Bitta long-poll: job'larni oladi va navbatga soladi (print'ni KUTMAYDI)
async function pollOnce(serverUrl) {
    const res = await fetch(`${serverUrl}/api/smart/poll-jobs?v=2`, {
        signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return;
    const data = await res.json();
    const jobs = data.jobs || [];
    if (jobs.length === 0) return;

    console.log(`[POLL] ${jobs.length} ta yangi print job → navbatga`);
    for (const job of jobs) {
        const id = job.id;
        // Allaqachon chop etilgan (ACK yo'qolib qayta kelgan) → faqat qayta ACK, qayta print yo'q
        if (id && printedIds.has(id)) { pendingAck.push(id); continue; }
        // Allaqachon navbatda/print bo'layapti → o'tkazib yuborish
        if (id && enqueuedIds.has(id)) continue;

        const printerName = job.printerName || job.printer || job.name || '';
        const base64data  = job.data || job.payload || job.escpos || '';
        const printerIp   = job.printerIp || job.ip || null;
        const printerPort = job.printerPort || job.port || 9100;
        if (!base64data || (!printerName && !printerIp)) {
            // Buzuq job — qayta yuborilmasin uchun ACK qilamiz
            if (id) pendingAck.push(id);
            console.warn(`[POLL] Job tarkibi to'liq emas: ${JSON.stringify(Object.keys(job))}`);
            continue;
        }
        const j = { id, printerName, base64data, printerIp, printerPort };
        const key = printerKeyOf(j);
        if (!printQueues.has(key)) printQueues.set(key, []);
        printQueues.get(key).push(j);
        if (id) enqueuedIds.add(id);
        drainPrinter(serverUrl, key); // MUSTAQIL print — natijani kutmaymiz
    }
    flushAck(serverUrl);
}

// Uzluksiz long-poll tsikli — pollOnce qaytishi bilanoq darhol qayta so'raydi.
// Print alohida worker'larda — shuning uchun doim BITTA ochiq long-poll bo'ladi
// va yangi chek HECH QACHON print tufayli kutib qolmaydi.
async function jobLoop(serverUrl) {
    if (jobLoopActive) return;
    jobLoopActive = true;
    while (jobLoopActive) {
        try {
            await pollOnce(serverUrl);
        } catch (e) {
            const silent = ['TimeoutError', 'AbortError', 'TypeError'];
            if (!silent.includes(e.name) && e.code !== 'ECONNREFUSED' && e.code !== 'ENOTFOUND') {
                console.error('[POLL ❌]', e.message || String(e));
            }
        }
        purgePrintedIds();
        await new Promise(r => setTimeout(r, 0)); // darhol qayta poll (event loop ga imkon)
    }
}

function startPolling(config) {
    if (pollTimer || jobLoopActive) stopPolling();

    const { serverUrl } = config;
    console.log(`[AGENT V3] Long-poll (print'dan ajratilgan) boshlandi → ${serverUrl}`);

    jobLoop(serverUrl);          // uzluksiz long-poll (fayl navbati) — print mustaqil worker'larda
    syncPrinters(serverUrl);
    processQueue(serverUrl);
    heartbeat(serverUrl);

    // DB-navbat (print-queue) va heartbeat — alohida intervalda
    pollTimer = setInterval(() => {
        processQueue(serverUrl);
    }, 1000); // 1s: navbat tezroq ko'riladi

    syncTimer = setInterval(() => {
        syncPrinters(serverUrl);
        heartbeat(serverUrl);
    }, 60_000); // 60s: heartbeat kamroq, resurs tejaydi
}

function stopPolling() {
    jobLoopActive = false; // long-poll tsiklini to'xtatish
    printQueues.clear();
    activeWorkers.clear();
    enqueuedIds.clear();
    pendingAck = [];
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
    if (syncTimer) {
        clearInterval(syncTimer);
        syncTimer = null;
    }
    console.log('[AGENT V3] Polling to\'xtatildi.');
}

module.exports = { startPolling, stopPolling, syncPrinters };
