const {
    app, BrowserWindow, screen, ipcMain, Menu, nativeImage,
    Tray, shell, Notification, utilityProcess
} = require('electron');
const path = require('path');
const fs   = require('fs');
const crypto = require('crypto');

// Global xatolarni ushlash
process.on('uncaughtException',    e => console.error('CRITICAL (uncaughtException):', e));
process.on('unhandledRejection',   e => console.error('CRITICAL (unhandledRejection):', e));

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) { app.quit(); process.exit(0); }

const { startPolling, stopPolling, syncPrinters } = require('./tray-agent');
const { getWindowsPrinters, discoverAllPrinters }  = require('./printer');

// ─── Version ───────────────────────────────────────────────────────
const CURRENT_VERSION = '2.0.0';
let updateAvailable = false;
let updateUrl       = null;

// ─── Local Server ──────────────────────────────────────────────────
const LOCAL_PORT       = 3005;
const LOCAL_SERVER_URL = `http://127.0.0.1:${LOCAL_PORT}`;
let   nextProcess      = null;   // UtilityProcess instance
let   isOfflineMode    = false;
let   activeKioskUrl   = null;   // hozir yuklangan URL

// ─── Windows & Tray ────────────────────────────────────────────────
let mainWindow   = null;
let splashWindow = null;
let tray         = null;

// ─── Config ────────────────────────────────────────────────────────
const CONFIG_FILE = path.join(app.getPath('userData'), 'config_v2.json');

const DEFAULT_CONFIG = {
    serverUrl:    'https://chaqqonpro.e-code.uz',
    pollInterval: 2500,
    autoStart:    true,
    kioskUrl:     'https://chaqqonpro.e-code.uz/smart-pos',
};

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            // Eski IP yoki HTTP bo'lsa yangi domenga o'tkazish
            if (saved.serverUrl && (saved.serverUrl.includes('89.39.94.195') || saved.serverUrl === 'http://chaqqonpro.e-code.uz')) {
                saved.serverUrl = DEFAULT_CONFIG.serverUrl;
                saved.kioskUrl  = DEFAULT_CONFIG.kioskUrl;
                saveConfig(saved);
            }
            return { ...DEFAULT_CONFIG, ...saved };
        }
    } catch (e) {}
    return { ...DEFAULT_CONFIG };
}

function saveConfig(cfg) {
    try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2)); } catch (e) {}
}

// ─── SSL ────────────────────────────────────────────────────────────
app.commandLine.appendSwitch('ignore-certificate-errors');
app.on('certificate-error', (_event, _wc, _url, _err, _cert, cb) => {
    _event.preventDefault(); cb(true);
});

// ─── Auto Start ─────────────────────────────────────────────────────
function setAutoStart(enable) {
    app.setLoginItemSettings({ openAtLogin: enable, path: process.execPath, args: ['--hidden'] });
}

// ─── Icon ───────────────────────────────────────────────────────────
function getIconPath() {
    const devPath  = path.join(__dirname, 'assets', 'icon.ico');
    const prodPath = path.join(process.resourcesPath, 'assets', 'icon.ico');
    if (fs.existsSync(devPath))  return devPath;
    if (fs.existsSync(prodPath)) return prodPath;
    return null;
}

// ─── Version Check ──────────────────────────────────────────────────
async function checkForUpdates(serverUrl) {
    try {
        const res = await fetch(`${serverUrl}/api/smart/app-version`, {
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return;
        const data   = await res.json();
        const latest = data.version;
        if (latest && latest !== CURRENT_VERSION && latest > CURRENT_VERSION) {
            updateAvailable = true;
            updateUrl = data.downloadUrl || `${serverUrl}/settings`;
            console.log(`[UPDATE] Yangi versiya: ${latest}`);
            if (Notification.isSupported()) {
                new Notification({
                    title: 'EVIKO POS — Yangilanish mavjud!',
                    body:  `v${latest} versiyasi chiqdi. Yuklab olish uchun bosing.`,
                }).show();
            }
            rebuildTrayMenu();
        }
    } catch (e) { /* network error — jim */ }
}

// ─── Online/Offline Detection ────────────────────────────────────────
async function checkRemoteServer(serverUrl, kioskUrl) {
    const urls = [kioskUrl, serverUrl].filter(Boolean);
    for (const url of urls) {
        try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(url, { method: 'HEAD', signal: controller.signal, cache: 'no-store' });
            clearTimeout(tid);
            // 2xx yoki redirect/auth (401/302/200) = server ishlayapti
            if (res.status < 500) return true;
        } catch {
            continue;
        }
    }
    return false;
}

// ─── Local Next.js Server ────────────────────────────────────────────
async function startLocalNextServer() {
    const nextjsDir = app.isPackaged
        ? path.join(process.resourcesPath, 'nextjs')
        : path.join(__dirname, '..', 'frontend', '.next', 'standalone');

    const serverPath = path.join(nextjsDir, 'server.js');

    if (!fs.existsSync(serverPath)) {
        console.error('[LOCAL] server.js topilmadi:', serverPath);
        throw new Error(`Next.js standalone server topilmadi: ${serverPath}`);
    }

    // ── Database ──
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'pos.db');

    if (!fs.existsSync(dbPath)) {
        const candidates = app.isPackaged
            ? [path.join(process.resourcesPath, 'database', 'pos.db')]
            : [
                path.join(__dirname, '..', 'frontend', 'prisma', 'dev.db'),
                path.join(__dirname, '..', 'frontend', 'prisma', 'pos.db'),
              ];
        for (const src of candidates) {
            if (fs.existsSync(src)) {
                fs.copyFileSync(src, dbPath);
                console.log('[LOCAL] DB ko\'chirildi:', src);
                break;
            }
        }
    }

    // ── JWT Secret ──
    const jwtSecretPath = path.join(userDataPath, 'jwt_secret.txt');
    let jwtSecret;
    if (fs.existsSync(jwtSecretPath)) {
        jwtSecret = fs.readFileSync(jwtSecretPath, 'utf8').trim();
    } else {
        jwtSecret = crypto.randomBytes(32).toString('hex');
        fs.writeFileSync(jwtSecretPath, jwtSecret);
    }

    const serverEnv = {
        ...process.env,
        PORT:                    String(LOCAL_PORT),
        HOSTNAME:                '127.0.0.1',
        DATABASE_URL:            `file:${dbPath}`,
        NODE_ENV:                'production',
        JWT_SECRET:              jwtSecret,
        NEXT_TELEMETRY_DISABLED: '1',
        // Lokal server (127.0.0.1, faqat shu mashinada) print so'rovini auth'siz qabul qiladi.
        // Chek Electron IPC bridge orqali keladi → VPS round-trip yo'q (tez chek). VPS bu env'ni
        // o'rnatmaydi, shuning uchun bulutda auth o'zgarishsiz qoladi.
        LOCAL_PRINT_TRUST:       '1',
    };

    return new Promise((resolve) => {
        console.log('[LOCAL] Next.js server ishga tushirilmoqda...');

        nextProcess = utilityProcess.fork(serverPath, [], {
            env:         serverEnv,
            cwd:         nextjsDir,
            stdio:       'pipe',
            serviceName: 'eviko-pos-nextjs',
        });

        const onReady = () => resolve(LOCAL_SERVER_URL);

        nextProcess.stdout.on('data', (chunk) => {
            const msg = chunk.toString();
            console.log('[Next.js]', msg.trimEnd());
            if (/Ready|started server|listening|localhost/i.test(msg)) onReady();
        });

        nextProcess.stderr.on('data', (chunk) => {
            console.error('[Next.js ERR]', chunk.toString().trimEnd());
        });

        nextProcess.on('exit', (code) => {
            console.log('[Next.js] Chiqdi, kod:', code);
            nextProcess = null;
        });

        // 20s dan keyin server tayyor deb hisoblash (xavfsizlik uchun)
        setTimeout(onReady, 20_000);
    });
}

function stopLocalNextServer() {
    if (nextProcess) {
        try { nextProcess.kill(); } catch (_) {}
        nextProcess = null;
    }
}

// ─── Offline tayyorlik: VPS → lokal pos.db sinxronizatsiyasi ─────────
// Online paytda ishlaydi: VPS dan menyu/stol/xodim/printerni olib,
// lokal serverning sync-import ga yozadi. Offline'ga o'tganda tayyor turadi.
let _syncing = false;
async function syncReferenceData(remoteUrl) {
    if (_syncing || !remoteUrl) return;
    _syncing = true;
    try {
        const res = await fetch(`${remoteUrl}/api/smart/sync-export`, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) { console.warn('[SYNC] export HTTP', res.status); return; }
        const data = await res.json();
        if (!data || !data.ok || !data.tenantId) { console.warn('[SYNC] export bo\'sh'); return; }

        const imp = await fetch(`${LOCAL_SERVER_URL}/api/smart/sync-import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(25000),
        });
        if (imp.ok) {
            const r = await imp.json().catch(() => ({}));
            console.log('[SYNC ✅] Lokal bazaga yozildi:', JSON.stringify(r.counts || {}));
        } else {
            console.warn('[SYNC] import HTTP', imp.status);
        }
    } catch (e) {
        if (e.name !== 'TimeoutError' && e.name !== 'AbortError') console.warn('[SYNC ❌]', e.message || String(e));
    } finally {
        _syncing = false;
    }
}

// ─── Splash ──────────────────────────────────────────────────────────
function updateSplash(statusText, badgeText) {
    if (!splashWindow || splashWindow.isDestroyed()) return;
    splashWindow.webContents.executeJavaScript(`
        (function() {
            var s = document.getElementById('status-text');
            var b = document.getElementById('mode-badge');
            if (s) s.textContent = ${JSON.stringify(statusText)};
            if (b) b.textContent = ${JSON.stringify(badgeText)};
        })();
    `).catch(() => {});
}

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width:  600,
        height: 400,
        transparent: false,
        frame:  false,
        alwaysOnTop: true,
        icon:   getIconPath(),
        webPreferences: { nodeIntegration: false, contextIsolation: true },
    });
    splashWindow.loadFile('splash.html');
    splashWindow.center();
}

// ─── Fallback Error Page ──────────────────────────────────────────────
function loadFallbackErrorHtml(url) {
    if (!mainWindow) return;
    mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
        <html>
        <head><title>Aloqa xatosi</title>
        <style>
            body { background:#0f172a; color:#fff; font-family:sans-serif;
                   display:flex; flex-direction:column; align-items:center;
                   justify-content:center; height:100vh; margin:0; }
            h1   { color:#ef4444; }
            button { padding:12px 24px; font-size:16px; background:#3b82f6;
                     color:#fff; border:none; border-radius:8px; cursor:pointer;
                     margin-top:20px; }
            button:hover { background:#2563eb; }
        </style></head>
        <body>
            <h1>Xatolik yuz berdi!</h1>
            <p>Tizimga ulanib bo'lmadi.</p>
            <p>URL: <span style="color:#3b82f6">${url}</span></p>
            <button onclick="window.ipcAPI.reloadApp()">Qayta yuklash</button>
            <script>
                setInterval(() => {
                    fetch('${url}', { method:'HEAD', mode:'no-cors' })
                        .then(() => window.ipcAPI.reloadApp())
                        .catch(() => {});
                }, 5000);
            </script>
        </body></html>
    `));
}

// ─── Main Window ──────────────────────────────────────────────────────
function createMainWindow(kioskUrl) {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    activeKioskUrl = kioskUrl;

    mainWindow = new BrowserWindow({
        width, height,
        kiosk: true,
        show:  false,
        icon:  getIconPath(),
        webPreferences: {
            preload:         path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            devTools:        false,
            webSecurity:     false,
        },
    });

    mainWindow.setMenu(null);
    mainWindow.setMenuBarVisibility(false);

    // Keshni VA service worker keshini tozalaymiz — yangilanish/rebrending darhol ko'rinsin
    (async () => {
        try {
            await mainWindow.webContents.session.clearCache();
            await mainWindow.webContents.session.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] });
        } catch (e) { console.warn('[CACHE CLEAR]', e?.message || e); }
        mainWindow.loadURL(kioskUrl).catch(e => console.error('[MAIN] loadURL xato:', e));
    })();

    let _failRetryTimer = null;
    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, _validatedURL, isMainFrame) => {
        if (!isMainFrame || errorCode === -3) return;
        console.warn(`[FAIL LOAD] ${errorDescription} (${errorCode})`);
        if (_failRetryTimer) clearTimeout(_failRetryTimer);
        _failRetryTimer = setTimeout(() => {
            if (!mainWindow) return;
            mainWindow.loadURL(activeKioskUrl)
                .catch(() => loadFallbackErrorHtml(activeKioskUrl));
        }, 6000);
    });

    mainWindow.webContents.on('render-process-gone', (_event, details) => {
        if (details.reason === 'clean-exit') return;
        console.error('[CRASH] Renderer o\'ldi:', details.reason);
        setTimeout(() => {
            if (!mainWindow) return;
            mainWindow.webContents.session.clearCache().then(() => {
                mainWindow.loadURL(activeKioskUrl)
                    .catch(() => loadFallbackErrorHtml(activeKioskUrl));
            });
        }, 2000);
    });

    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (
            input.key === 'F11' ||
            (input.control && input.shift && input.key.toLowerCase() === 'i') ||
            (input.control && input.key.toLowerCase() === 'r')
        ) { event.preventDefault(); }
    });

    mainWindow.once('ready-to-show', () => {
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
            splashWindow = null;
        }
        mainWindow.show();
        mainWindow.focus();
    });

    mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── Tray ────────────────────────────────────────────────────────────
function buildTrayMenuTemplate() {
    const cfg = loadConfig();
    const modeLabel = isOfflineMode
        ? `EVIKO POS v${CURRENT_VERSION} • OFFLINE`
        : `EVIKO POS v${CURRENT_VERSION} • Online`;

    const template = [
        { label: modeLabel, enabled: false },
        { type: 'separator' },
        {
            label: 'Kassa oynasini ko\'rsatish',
            click: () => {
                if (mainWindow) {
                    if (mainWindow.isMinimized()) mainWindow.restore();
                    mainWindow.show(); mainWindow.focus();
                } else {
                    createMainWindow(activeKioskUrl || cfg.kioskUrl);
                }
            },
        },
        {
            label: 'Kassani qayta yuklash',
            click: () => {
                if (mainWindow) {
                    mainWindow.webContents.session.clearCache().then(() => mainWindow.reload());
                }
            },
        },
        { type: 'separator' },
        { label: 'Print Agent: Ishlamoqda', enabled: false },
        {
            label: 'Printerlarni sinxronlash',
            click: async () => {
                const url = isOfflineMode ? LOCAL_SERVER_URL : cfg.serverUrl;
                await syncPrinters(url);
            },
        },
        { type: 'separator' },
    ];

    if (isOfflineMode) {
        template.push({
            label: 'Online rejimga o\'tish (restart)',
            click: () => {
                stopLocalNextServer();
                app.relaunch();
                app.exit(0);
            },
        });
        template.push({ type: 'separator' });
    }

    if (updateAvailable && updateUrl) {
        template.push({
            label: 'Yangi versiya mavjud — Yuklab olish',
            click: () => shell.openExternal(updateUrl),
        });
        template.push({ type: 'separator' });
    }

    template.push({
        label: 'Sozlamalar',
        click: () => shell.openExternal(`${cfg.serverUrl}/settings`),
    });
    template.push({
        label: 'Dasturdan chiqish',
        click: () => { stopPolling(); stopLocalNextServer(); app.quit(); },
    });

    return template;
}

function rebuildTrayMenu() {
    if (!tray) return;
    tray.setContextMenu(Menu.buildFromTemplate(buildTrayMenuTemplate()));
    tray.setToolTip(isOfflineMode ? 'EVIKO POS — OFFLINE' : 'EVIKO POS Online');
}

function createTray() {
    const iconPath = getIconPath();
    const icon = iconPath && fs.existsSync(iconPath)
        ? nativeImage.createFromPath(iconPath)
        : nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAklEQVQ4jWNgYGD4DwABBAEAwGYhiQAAAABJRU5ErkJggg==');
    tray = new Tray(icon);
    rebuildTrayMenu();
    tray.on('double-click', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show(); mainWindow.focus();
        } else {
            createMainWindow(activeKioskUrl || loadConfig().kioskUrl);
        }
    });
}

// ─── IPC Handlers ────────────────────────────────────────────────────
ipcMain.handle('get-config',       ()        => loadConfig());
ipcMain.handle('get-printers',     async ()  => await getWindowsPrinters());
ipcMain.handle('printer:discover', async ()  => await discoverAllPrinters());
ipcMain.handle('get-version',      ()        => CURRENT_VERSION);
ipcMain.handle('get-agent-status', ()        => 'running');
ipcMain.handle('get-mode',         ()        => isOfflineMode ? 'offline' : 'online');

// ─── Lokal print bridge ──────────────────────────────────────────────
// Renderer (POS UI) chekni shu yerga yuboradi. Biz uni EXE ichidagi lokal Next.js
// serverга (127.0.0.1) POST qilamiz → u Windows'da to'g'ridan-to'g'ri TCP bilan
// LAN printerga chiqaradi. Bu bulutga (VPS) chiqmaydi → chek deyarli darhol chiqadi.
// Lokal server tayyor bo'lmasa { fallback:true } qaytaramiz → renderer VPS'ga o'tadi.
ipcMain.handle('local-print', async (_event, job) => {
    if (!nextProcess) return { success: false, fallback: true, error: 'local server ishlamayapti' };
    try {
        const res = await fetch(`${LOCAL_SERVER_URL}/api/smart/print`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(job),
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) {
            // 503 → server hali ko'tarilyapti, VPS'ga fallback. Boshqa xatolarда (printer
            // o'chiq va h.k.) fallback QILMAYMIZ — VPS ham xuddi shu printerga ura olmaydi,
            // ortiqcha urinish dublikat chek xavfini tug'diradi.
            if (res.status === 503) return { success: false, fallback: true, error: 'local server tayyor emas' };
            const d = await res.json().catch(() => ({}));
            return { success: false, error: d.error || `HTTP ${res.status}` };
        }
        const d = await res.json().catch(() => ({}));
        return { success: !!d.success, error: d.error };
    } catch (e) {
        // Ulanib bo'lmadi (server hali ko'tarilmagan) → VPS'ga fallback
        return { success: false, fallback: true, error: e?.message || String(e) };
    }
});

ipcMain.handle('save-config', (event, cfg) => {
    saveConfig(cfg);
    setAutoStart(cfg.autoStart);
    stopPolling();
    startPolling(isOfflineMode ? { ...cfg, serverUrl: LOCAL_SERVER_URL } : cfg);
    if (mainWindow) {
        const url = isOfflineMode ? activeKioskUrl : cfg.kioskUrl;
        mainWindow.loadURL(url).catch(() => loadFallbackErrorHtml(url));
    }
    return true;
});

ipcMain.on('quit-app',        ()      => { stopPolling(); stopLocalNextServer(); app.quit(); });
ipcMain.on('minimize-app',    ()      => mainWindow?.minimize());
ipcMain.on('toggle-fullscreen',()     => mainWindow?.setKiosk(!mainWindow.isKiosk()));

ipcMain.on('client-error', (event, errorInfo) => {
    console.error('[CLIENT ERROR]:', errorInfo);
    if (mainWindow && typeof errorInfo === 'string' && errorInfo.includes('Minified React error')) {
        mainWindow.webContents.session.clearCache().then(() => mainWindow.reload());
    }
});

ipcMain.on('reload-app', () => {
    if (!mainWindow) return;
    const url = activeKioskUrl || loadConfig().kioskUrl;
    mainWindow.webContents.session.clearCache().then(() => {
        mainWindow.loadURL(url).catch(() => loadFallbackErrorHtml(url));
    });
});

// ─── App Ready ───────────────────────────────────────────────────────
app.whenReady().then(async () => {
    app.setAppUserModelId('uz.eviko.pos');
    const config = loadConfig();
    setAutoStart(config.autoStart);
    createTray();

    const isHidden = process.argv.includes('--hidden');

    if (!isHidden) {
        createSplashWindow();
        await new Promise(r => setTimeout(r, 700)); // splash render bo'lsin

        updateSplash('Serverga ulanilmoqda...', 'Tarmoq tekshirilmoqda...');

        const remoteOnline = await checkRemoteServer(config.serverUrl, config.kioskUrl);

        let kioskUrl;
        let pollingCfg = { ...config };

        if (remoteOnline) {
            isOfflineMode = false;
            kioskUrl      = config.kioskUrl;
            updateSplash('Online rejim faollashtirildi', `Online • v${CURRENT_VERSION}`);
            console.log('[STARTUP] Online rejim:', kioskUrl);

            // Lokal serverni FONDA ishga tushiramiz (offline tayyorlik) + VPS→lokal sync.
            // Kiosk'ni kutdirmaymiz — fonda bo'ladi.
            startLocalNextServer()
                .then(() => new Promise(r => setTimeout(r, 3000)))
                .then(() => syncReferenceData(config.serverUrl))
                .catch(e => console.error('[STARTUP] fon lokal server/sync xato:', e?.message || e));
            // Har 5 daqiqada qayta sinxronlash (faqat online bo'lganda)
            setInterval(() => { if (!isOfflineMode) syncReferenceData(loadConfig().serverUrl); }, 5 * 60 * 1000);
        } else {
            isOfflineMode = true;
            updateSplash('Offline rejim — lokal server yuklanmoqda...', `Offline • v${CURRENT_VERSION}`);
            console.log('[STARTUP] Server topilmadi, offline rejim boshlanmoqda...');

            let localUrl = LOCAL_SERVER_URL;
            try {
                localUrl = await startLocalNextServer();
                // Server to'liq tayyor bo'lishi uchun biroz kutish
                await new Promise(r => setTimeout(r, 2500));
            } catch (err) {
                console.error('[STARTUP] Lokal server xatosi:', err);
            }

            kioskUrl  = `${localUrl}/smart-pos`;
            pollingCfg = { ...config, serverUrl: localUrl };
            updateSplash('Offline rejim tayyor!', `Offline • v${CURRENT_VERSION}`);
        }

        activeKioskUrl = kioskUrl;
        rebuildTrayMenu();
        await new Promise(r => setTimeout(r, 600));
        createMainWindow(kioskUrl);
        startPolling(pollingCfg);
    } else {
        // --hidden rejimda faqat polling
        const remoteOnline = await checkRemoteServer(config.serverUrl, config.kioskUrl);
        if (!remoteOnline) {
            try { await startLocalNextServer(); } catch (_) {}
            isOfflineMode  = true;
            activeKioskUrl = `${LOCAL_SERVER_URL}/smart-pos`;
        } else {
            activeKioskUrl = config.kioskUrl;
        }
        startPolling(isOfflineMode ? { ...config, serverUrl: LOCAL_SERVER_URL } : config);
    }

    // Yangilanish tekshirish (faqat online rejimda ma'noli)
    setTimeout(() => checkForUpdates(config.serverUrl), 30_000);
    setInterval(() => checkForUpdates(loadConfig().serverUrl), 6 * 60 * 60 * 1000);

    // Offline rejimda har 60s da remote server qaytib kelganini tekshirish
    if (isOfflineMode) {
        const reconnectChecker = setInterval(async () => {
            const cfg      = loadConfig();
            const isBack   = await checkRemoteServer(cfg.serverUrl, cfg.kioskUrl);
            if (isBack) {
                clearInterval(reconnectChecker);
                if (Notification.isSupported()) {
                    new Notification({
                        title: 'EVIKO POS — Internet qaytdi!',
                        body:  'Online rejimga o\'tish uchun dasturni qayta ishga tushiring.',
                    }).show();
                }
                rebuildTrayMenu();
            }
        }, 60_000);
    }
});

app.on('window-all-closed', _e => _e.preventDefault()); // tray orqali ishlashda davom etish

app.on('before-quit', () => {
    stopPolling();
    stopLocalNextServer();
});

app.on('second-instance', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show(); mainWindow.focus();
    } else {
        createMainWindow(activeKioskUrl || loadConfig().kioskUrl);
    }
});
