const { printRaw, discoverAllPrinters } = require('./printer');

let pollTimer = null;
let syncTimer = null;
let isPolling = false;

// Oxirgi discovery natijasini kesh — har sinxronlashda scan qilmasin
let _lastDiscovered = null;
let _lastDiscoveryAt = 0;
const DISCOVERY_CACHE_MS = 5 * 60_000; // 5 daqiqa

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

    try {
        const res = await fetch(`${serverUrl}/api/smart/poll-jobs?v=2`, {
            signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
            const responseData = await res.json();
            const jobs = responseData.jobs || [];

            if (jobs.length > 0) {
                console.log(`[POLL] ${jobs.length} ta yangi print job topildi.`);

                for (const job of jobs) {
                    try {
                        // Server tomondan kelgan maydonlar
                        const printerName = job.printerName || job.printer || job.name || '';
                        const base64data  = job.data || job.payload || job.escpos || '';

                        // LAN printer uchun IP va port (server tomondan berilsa)
                        const printerIp   = job.printerIp   || job.ip   || null;
                        const printerPort = job.printerPort || job.port || 9100;

                        if (!base64data) {
                            console.warn(`[POLL] Job tarkibi noto'g'ri: ${JSON.stringify(Object.keys(job))}`);
                            continue;
                        }

                        if (!printerName && !printerIp) {
                            console.warn(`[POLL] printerName yoki printerIp ko'rsatilmagan. Job: ${JSON.stringify(Object.keys(job))}`);
                            continue;
                        }

                        // LAN yoki USB — printRaw o'zi aniqlab yuboradi
                        const result = await printRaw(printerName, base64data, {
                            printerIp,
                            printerPort,
                        });

                        if (result.success) {
                            const method = result.method === 'lan'
                                ? `LAN (${printerIp}:${printerPort})`
                                : `USB/Spooler ("${printerName}")`;
                            console.log(`[POLL ✅] Chop etildi → ${method}`);
                        } else {
                            console.error(`[POLL ❌] Chop etib bo'lmadi:`, result.error);
                        }

                    } catch (printErr) {
                        console.error('[POLL PRINT ERROR]', printErr);
                    }
                }
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

function startPolling(config) {
    if (pollTimer) stopPolling();

    const { serverUrl, pollInterval = 10000 } = config;
    console.log(`[AGENT V2] Polling boshlandi → ${serverUrl} (har ${pollInterval}ms)`);

    pollJobs(serverUrl);
    syncPrinters(serverUrl);

    pollTimer = setInterval(() => {
        pollJobs(serverUrl);
    }, pollInterval);

    syncTimer = setInterval(() => syncPrinters(serverUrl), 30_000);
}

function stopPolling() {
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
