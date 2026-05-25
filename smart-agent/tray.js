/**
 * tray.js — Serverdan print joblarini polling va printerlarni sinxronlash
 * LAN (TCP/IP) va USB (Windows Spooler) ikkalasini qo'llab-quvvatlaydi.
 */

const { getWindowsPrinters, printRaw } = require('./printer');

let pollTimer = null;
let isPolling = false;

/**
 * Serverga printerlar ro'yxatini yuborish
 * @param {string} serverUrl
 */
async function syncPrinters(serverUrl) {
    try {
        const printers = await getWindowsPrinters();
        if (printers.length === 0) {
            console.log('[SYNC] Hech qanday printer topilmadi.');
            return;
        }

        const res = await fetch(`${serverUrl}/api/smart/agent-printers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ printers, _t: Date.now() }),
            signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
            console.log(`[SYNC ✅] ${printers.length} ta printer serverga uzatildi.`);
        } else {
            console.warn(`[SYNC ⚠️] Server ${res.status} javob qaytardi.`);
        }
    } catch (e) {
        if (e.name !== 'TimeoutError' && e.name !== 'AbortError') {
            console.error('[SYNC ❌] Serverga ulanib bo\'lmadi:', e.message || String(e));
        }
    }
}

/**
 * Serverdan yangi print joblarini olish va chop etish.
 * Job ichida printerIp bo'lsa → LAN, bo'lmasa → USB Spooler.
 * @param {string} serverUrl
 */
async function pollJobs(serverUrl) {
    if (isPolling) return;
    isPolling = true;

    try {
        const res = await fetch(`${serverUrl}/api/smart/poll-jobs`, {
            signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
            const data = await res.json();
            const jobs = data.jobs || [];

            if (jobs.length > 0) {
                console.log(`[POLL] ${jobs.length} ta yangi print job topildi.`);
                for (const job of jobs) {
                    try {
                        const printerName = job.printerName || job.printer || job.name || '';
                        const base64data  = job.data || job.payload || job.escpos || '';

                        // LAN printer uchun IP va port (server tomondan berilsa)
                        const printerIp   = job.printerIp   || job.ip   || null;
                        const printerPort = job.printerPort || job.port || 9100;

                        if (!base64data) {
                            console.warn(`[POLL] Job ma'lumoti bo'sh: ${JSON.stringify(Object.keys(job))}`);
                            continue;
                        }

                        if (!printerName && !printerIp) {
                            console.warn(`[POLL] printerName yoki printerIp ko'rsatilmagan.`);
                            continue;
                        }

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
        if (e.name !== 'TimeoutError' && e.name !== 'AbortError' && e.code !== 'ECONNREFUSED') {
            console.error('[POLL ❌]', e.message || String(e));
        }
    } finally {
        isPolling = false;
    }
}

/**
 * Polling loop'ni boshlash
 * @param {{ serverUrl: string, pollInterval: number }} config
 */
function startPolling(config) {
    if (pollTimer) stopPolling();

    const { serverUrl, pollInterval = 2500 } = config;
    console.log(`[AGENT] Polling boshlandi → ${serverUrl} (har ${pollInterval}ms)`);

    pollJobs(serverUrl);
    syncPrinters(serverUrl);

    pollTimer = setInterval(() => {
        pollJobs(serverUrl);
    }, pollInterval);

    setInterval(() => syncPrinters(serverUrl), 30_000);
}

/**
 * Polling loop'ni to'xtatish
 */
function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
        console.log('[AGENT] Polling to\'xtatildi.');
    }
}

module.exports = { startPolling, stopPolling, syncPrinters };
