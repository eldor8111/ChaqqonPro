/**
 * tray.js — Serverdan print joblarini polling va printerlarni sinxronlash
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
 * Serverdan yangi print joblarini olish va chop etish
 * @param {string} serverUrl
 */
async function pollJobs(serverUrl) {
    if (isPolling) return; // Bir vaqtda ikki poll bo'lmasin
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
                    await printRaw(job.printerName, job.data);
                }
            }
        }
    } catch (e) {
        // Tarmoq xatolari — jimgina o'tamiz
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

    // Darhol bir marta tekshirish
    pollJobs(serverUrl);

    pollTimer = setInterval(() => {
        pollJobs(serverUrl);
    }, pollInterval);

    // Har 30 sekundda printerlarni sinxronlash
    syncPrinters(serverUrl);
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
