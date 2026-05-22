const { getWindowsPrinters, printRaw } = require('./printer');

let pollTimer = null;
let syncTimer = null;
let isPolling = false;

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

async function pollJobs(serverUrl) {
    if (isPolling) return;
    isPolling = true;

    try {
        const res = await fetch(`${serverUrl}/api/smart/poll-jobs?v=2`, {
            signal: AbortSignal.timeout(10000), // timeout biroz ko'paytirildi
        });

        if (res.ok) {
            const responseData = await res.json();
            const jobs = responseData.jobs || [];

            if (jobs.length > 0) {
                console.log(`[POLL] ${jobs.length} ta yangi print job topildi.`);
                for (const job of jobs) {
                    try {
                        // Server printerName yoki printer maydonini yuborishi mumkin
                        const printerName = job.printerName || job.printer || job.name || '';
                        // Server data yoki payload maydonini yuborishi mumkin
                        const base64data = job.data || job.payload || job.escpos || '';
                        
                        if (!printerName || !base64data) {
                            console.warn(`[POLL] Job tarkibi: ${JSON.stringify(Object.keys(job))}`);
                        }
                        
                        await printRaw(printerName, base64data);
                    } catch (printErr) {
                        console.error('[POLL PRINT ERROR]', printErr);
                    }
                }
            }
        }
    } catch (e) {
        if (e.name !== 'TimeoutError' && e.name !== 'AbortError' && e.code !== 'ECONNREFUSED') {
            // qisqa qilib xatoni yozamiz
        }
    } finally {
        isPolling = false;
    }
}

function startPolling(config) {
    if (pollTimer) stopPolling();

    const { serverUrl, pollInterval = 2500 } = config;
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
