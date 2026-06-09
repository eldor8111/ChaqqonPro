const { app, BrowserWindow, screen, ipcMain, Menu, nativeImage, Tray, shell, Notification, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, fork } = require('child_process');

// ─── File Logging (diagnostics) ──────────────────────────────────────────────
const LOG_FILE = 'C:\\Temp\\smartpos-main.log';
function logToFile(msg) {
    try { fs.appendFileSync(LOG_FILE, new Date().toISOString() + ' ' + msg + '\n'); } catch (e2) {
        try { fs.appendFileSync('C:\\Users\\E-co\\smartpos-main.log', new Date().toISOString() + ' LOGFAIL:' + e2.message + ' :: ' + msg + '\n'); } catch (_) {}
    }
}
logToFile('main.js: top-level started, cwd=' + process.cwd() + ' execPath=' + process.execPath);

let startPolling, stopPolling, syncPrinters, getWindowsPrinters, initializePrinters, runSync;
try {
    ({ startPolling, stopPolling, syncPrinters } = require('./tray-agent'));
    logToFile('tray-agent loaded OK');
} catch (e) { logToFile('tray-agent FAILED: ' + e.message); startPolling = stopPolling = syncPrinters = () => {}; }
try {
    ({ getWindowsPrinters, initializePrinters } = require('./printer'));
    logToFile('printer loaded OK');
} catch (e) { logToFile('printer FAILED: ' + e.message); getWindowsPrinters = async () => []; initializePrinters = () => {}; }
try {
    ({ runSync } = require('./sync'));
    logToFile('sync loaded OK');
} catch (e) { logToFile('sync FAILED: ' + e.message); runSync = async () => {}; }

// Asosiy xatolarni global darajada ushlash (app crash bo'lmasligi uchun)
process.on('uncaughtException', (error) => {
    logToFile('CRITICAL: uncaughtException: ' + error.message + '\n' + error.stack);
    console.error('CRITICAL ERROR (Uncaught Exception):', error);
});
process.on('unhandledRejection', (reason) => {
    logToFile('CRITICAL: unhandledRejection: ' + reason);
    console.error('CRITICAL ERROR (Unhandled Rejection):', reason);
});

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
    process.exit(0);
}

// ─── Version Check ───
const CURRENT_VERSION = '2.0.0'; // V2 Version
let updateAvailable = false;
let updateUrl = null;

async function checkForUpdates(serverUrl) {
    try {
        const res = await fetch(`${serverUrl}/api/smart/app-version`, {
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return;
        const data = await res.json();
        const latest = data.version;
        if (latest && latest !== CURRENT_VERSION && latest > CURRENT_VERSION) {
            updateAvailable = true;
            updateUrl = data.downloadUrl || `${serverUrl}/settings`;
            console.log(`[UPDATE] Yangi versiya mavjud: ${latest}`);
            if (Notification.isSupported()) {
                new Notification({
                    title: 'SMART POS V2 — Yangilanish mavjud!',
                    body: `v${latest} versiyasi chiqdi. Yuklab olish uchun bosing.`,
                    silent: false,
                }).show();
            }
            rebuildTrayMenu();
        }
    } catch (e) {
        // Network error - jimgina o'tkazib yuborish
    }
}

let mainWindow = null;
let splashWindow = null;
let tray = null;
let serverProcess = null;
let nextProcess = null;

// ─── Configuration ───
const CONFIG_FILE = path.join(app.getPath('userData'), 'config_v2.json'); // Yangi nom
const allowInsecureTls = !app.isPackaged && process.env.SMART_POS_ALLOW_INSECURE_TLS === '1';
const disableWebSecurity = !app.isPackaged && process.env.SMART_POS_DISABLE_WEB_SECURITY === '1';

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (e) {}
    return {
        serverUrl: 'http://127.0.0.1:4000', // Used by tray-agent to poll jobs
        pollInterval: 2500,
        autoStart: true,
        kioskUrl: 'http://localhost:3000/kassa/login' // The frontend UI
    };
}

function saveConfig(cfg) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
    } catch (e) {}
}

if (allowInsecureTls) {
    app.commandLine.appendSwitch('ignore-certificate-errors');
    app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
        event.preventDefault();
        callback(true);
    });
}

// ─── Auto Start ───
function setAutoStart(enable) {
    app.setLoginItemSettings({
        openAtLogin: enable,
        path: process.execPath,
        args: ['--hidden']
    });
}

function getIconPath() {
    const devPath = path.join(__dirname, 'assets', 'icon.ico');
    const prodPath = path.join(process.resourcesPath, 'assets', 'icon.ico');
    if (fs.existsSync(devPath)) return devPath;
    if (fs.existsSync(prodPath)) return prodPath;
    return null;
}

function buildTrayMenuTemplate() {
    const cfg = loadConfig();
    const template = [
        { label: `SMART POS v${CURRENT_VERSION} (Ideal)`, enabled: false },
        { type: 'separator' },
        { 
            label: '🖥️  Kassa oynasini ko\'rsatish', 
            click: () => {
                if (mainWindow) {
                    if (mainWindow.isMinimized()) mainWindow.restore();
                    mainWindow.show();
                    mainWindow.focus();
                } else {
                    createMainWindow();
                }
            } 
        },
        { 
            label: '🔄 Kassani qayta yuklash (Oq ekran bo\'lsa)', 
            click: () => {
                if (mainWindow) {
                    mainWindow.webContents.session.clearCache().then(() => {
                        mainWindow.reload();
                    });
                }
            } 
        },
        { type: 'separator' },
        { label: '🟢 Print Agent: Ishlamoqda', enabled: false },
        {
            label: '🔄 Printerlarni sinxronlash',
            click: async () => {
                await syncPrinters(cfg.serverUrl);
            }
        },
        { type: 'separator' },
    ];

    if (updateAvailable && updateUrl) {
        template.push({
            label: '🎉 Yangi versiya mavjud — Yuklab olish',
            click: () => shell.openExternal(updateUrl)
        });
        template.push({ type: 'separator' });
    }

    template.push({
        label: '⚙️  Sozlamalar',
        click: () => shell.openExternal(`${cfg.serverUrl}/settings`)
    });
    template.push({
        label: '❌ Dasturdan chiqish',
        click: () => {
            stopPolling();
            app.quit();
        }
    });

    return template;
}

function rebuildTrayMenu() {
    if (!tray) return;
    const menu = Menu.buildFromTemplate(buildTrayMenuTemplate());
    tray.setContextMenu(menu);
    tray.setToolTip('SMART POS V2 ✅ Ishlamoqda');
}

function createTray() {
    const iconPath = getIconPath();
    let icon;
    if (iconPath && fs.existsSync(iconPath)) {
        icon = nativeImage.createFromPath(iconPath);
    } else {
        // Fallback icon
        icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAklEQVQ4jWNgYGD4DwABBAEAwGYhiQAAAABJRU5ErkJggg==');
    }
    tray = new Tray(icon);
    rebuildTrayMenu();
    tray.on('double-click', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        } else {
            createMainWindow();
        }
    });
}

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 600,
        height: 400,
        transparent: false,
        frame: false,
        alwaysOnTop: true,
        icon: getIconPath(),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    splashWindow.loadFile('splash.html');
    splashWindow.center();
}

function loadFallbackErrorHtml(url) {
    if (!mainWindow) return;
    mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
        <html>
        <head>
            <title>Aloqa xatosi</title>
            <style>
                body { background-color:#0f172a; color:#fff; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0; }
                h1 { color:#ef4444; }
                button { padding:12px 24px; font-size:16px; background:#3b82f6; color:#fff; border:none; border-radius:8px; cursor:pointer; margin-top:20px; transition: 0.2s; }
                button:hover { background:#2563eb; }
                .retry-auto { margin-top: 15px; font-size: 14px; color: #94a3b8; }
            </style>
        </head>
        <body>
            <h1>Xatolik yuz berdi! (Oq oyna himoyasi)</h1>
            <p>Tarmoqqa ulanib bo'lmadi yoki kassa tizimida xato yuz berdi.</p>
            <p>URL: <span style="color:#3b82f6">${url}</span></p>
            <button onclick="window.ipcAPI.reloadApp()">Qayta yuklash (Tuzatish)</button>
            <p class="retry-auto">Dastur o'zi avtomatik qayta ulanishga harakat qiladi...</p>
            <script>
                setInterval(() => {
                    fetch('${url}', { method: 'HEAD', mode: 'no-cors' })
                        .then(() => window.ipcAPI.reloadApp())
                        .catch(()=>{});
                }, 5000);
            </script>
        </body>
        </html>
    `));
}

function createMainWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const config = loadConfig();

    mainWindow = new BrowserWindow({
        width,
        height,
        kiosk: true,
        show: false,
        icon: getIconPath(),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            devTools: false, // Security
            webSecurity: !disableWebSecurity,
            allowRunningInsecureContent: false
        }
    });

    mainWindow.setMenu(null);
    mainWindow.setMenuBarVisibility(false);

    // Keshni tozalash oq oyna (stale react code) chiqmasligi uchun kafolat
    mainWindow.webContents.session.clearCache().then(() => {
        mainWindow.loadURL(config.kioskUrl).catch(e => {
            console.error("Failed to load kiosk URL:", e);
        });
    });

    // Qotib qolish yoki yuklay olmaslik
    // Kichik uzilishlarda (Wi-Fi o'chib-yonish) darhol xato oyna emas — 6 sek kutib qayta urinadi
    let _failRetryTimer = null;
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        if (!isMainFrame) return;
        // -3 = ABORTED (navigatsiya to'xtatildi) — buni e'tiborsiz qoldur
        if (errorCode === -3) return;
        console.warn(`[DID FAIL LOAD] ${errorDescription} (${errorCode}) — 6 sek kutib qayta urinadi...`);
        if (_failRetryTimer) clearTimeout(_failRetryTimer);
        _failRetryTimer = setTimeout(() => {
            if (!mainWindow) return;
            mainWindow.loadURL(config.kioskUrl).catch(() => loadFallbackErrorHtml(config.kioskUrl));
        }, 6000);
    });

    // Agar render process haqiqatan crash bo'lsa (Out of memory, fatal xato)
    mainWindow.webContents.on('render-process-gone', (event, details) => {
        if (details.reason === 'clean-exit') return; // normal yopilish — e'tiborga olma
        console.error('[CRASH] Renderer process o\'ldi:', details.reason);
        // 2 sek kutib qayta yuklashga urinib ko'ramiz
        setTimeout(() => {
            if (!mainWindow) return;
            mainWindow.webContents.session.clearCache().then(() => {
                mainWindow.loadURL(config.kioskUrl).catch(() => loadFallbackErrorHtml(config.kioskUrl));
            });
        }, 2000);
    });

    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (
            input.key === 'F11' || 
            (input.control && input.shift && input.key.toLowerCase() === 'i') || 
            (input.control && input.key.toLowerCase() === 'r')
        ) {
            event.preventDefault();
        }
    });

    mainWindow.once('ready-to-show', () => {
        if (splashWindow) {
            splashWindow.close();
            splashWindow = null;
        }
        mainWindow.show();
        mainWindow.focus();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ─── IPC Handlers ───
ipcMain.handle('get-config', () => loadConfig());
ipcMain.handle('get-printers', async () => await getWindowsPrinters());
ipcMain.handle('get-version', () => CURRENT_VERSION);
ipcMain.handle('get-agent-status', () => 'running');

ipcMain.handle('save-config', (event, cfg) => {
    saveConfig(cfg);
    setAutoStart(cfg.autoStart);
    stopPolling();
    startPolling(cfg);
    if (mainWindow) {
        mainWindow.loadURL(cfg.kioskUrl).catch(() => loadFallbackErrorHtml(cfg.kioskUrl));
    }
    return true;
});

ipcMain.on('quit-app', () => {
    stopPolling();
    app.quit();
});

ipcMain.on('minimize-app', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.on('toggle-fullscreen', () => {
    if (mainWindow) {
        mainWindow.setKiosk(!mainWindow.isKiosk());
    }
});

ipcMain.on('client-error', (event, errorInfo) => {
    console.error('[CLIENT UI ERROR]:', errorInfo);
    // UI crash bo'lib oq oyna bo'lib qolgan bo'lishi mumkin. 
    // Bu holatda oynani avtomatik reload qilib yuboramiz.
    if (mainWindow && typeof errorInfo === 'string' && errorInfo.includes('Minified React error')) {
        console.log('React crash aniqlandi. Kesh tozalanib qayta yuklanmoqda...');
        mainWindow.webContents.session.clearCache().then(() => {
            mainWindow.reload();
        });
    }
});

ipcMain.on('reload-app', () => {
    if (mainWindow) {
        const config = loadConfig();
        mainWindow.webContents.session.clearCache().then(() => {
            mainWindow.loadURL(config.kioskUrl).catch(() => loadFallbackErrorHtml(config.kioskUrl));
        });
    }
});

function startOfflineServers() {
    logToFile('startOfflineServers() called, isPackaged=' + app.isPackaged + ', resourcesPath=' + process.resourcesPath);
    try {
        // ─── Database path tanlash ───────────────────────────────────────────────
        // Dev rejimda (loyiha papkasida ishlaganda): dev server (3005) bilan
        // bir xil bazadan foydalanish uchun frontend/prisma/dev.db ni to'g'ridan ishlatamiz.
        // Production (o'rnatilgan ilova): AppData/pos_data.db dan foydalaniladi.
        let dbUrl;

        // resourcesPath: .../desktop/dist/win-unpacked/resources
        // 4 darajadan yuqori: .../ChaqqonPro-main
        const projectRoot = path.join(process.resourcesPath, '..', '..', '..', '..');
        const frontendDevDb = path.join(projectRoot, 'frontend', 'prisma', 'dev.db');

        logToFile('frontendDevDb check: ' + frontendDevDb + ' exists=' + fs.existsSync(frontendDevDb));
        if (fs.existsSync(frontendDevDb)) {
            // Dev rejim: frontend/prisma/dev.db ni to'g'ridan ishlatish
            dbUrl = 'file:' + frontendDevDb.replace(/\\/g, '/');
            console.log('[DB] Dev mode: shared dev.db:', frontendDevDb);
        } else {
            // Production rejim: AppData ga nusxalash
            const userDataPath = app.getPath('userData');
            const dbDestPath = path.join(userDataPath, 'pos_data.db');

            if (!fs.existsSync(dbDestPath)) {
                const dbSourcePath = path.join(process.resourcesPath, 'prisma', 'dev.db');
                if (fs.existsSync(dbSourcePath)) {
                    fs.copyFileSync(dbSourcePath, dbDestPath);
                    console.log('[DB] Database userData ga nusxalandi:', dbDestPath);
                } else {
                    console.warn('[DB] Manba database topilmadi:', dbSourcePath);
                }
            }
            dbUrl = 'file:' + dbDestPath.replace(/\\/g, '/');
            console.log('[DB] Production mode: AppData db:', dbDestPath);
        }
        console.log('[DB] DATABASE_URL:', dbUrl);

        logToFile('DB URL: ' + dbUrl);
        console.log('[Offline] Starting local Express + SQLite API...');
        const apiPath = path.join(__dirname, 'server.js');
        logToFile('forking Express: ' + apiPath);
        serverProcess = fork(apiPath, [], {
            env: { ...process.env, ELECTRON_RUN_AS_NODE: 1 }
        });
        serverProcess.on('error', e => logToFile('Express fork error: ' + e.message));
        serverProcess.on('exit', (c, s) => logToFile('Express exited code=' + c + ' signal=' + s));

        console.log('[Offline] Starting local Next.js Standalone UI...');
        const nextPath = app.isPackaged
            ? path.join(process.resourcesPath, 'standalone', 'server.js')
            : path.join(__dirname, '..', 'frontend', '.next', 'standalone', 'server.js');

        const nextEnv = {
            ...process.env,
            ELECTRON_RUN_AS_NODE: 1,
            PORT: 3000,
            LOCAL_API_URL: 'http://127.0.0.1:4000',
            HOSTNAME: '0.0.0.0',
            DATABASE_URL: dbUrl,
        };

        logToFile('nextPath: ' + nextPath + ' exists=' + fs.existsSync(nextPath));
        function spawnNextProcess() {
            logToFile('spawnNextProcess() called');
            nextProcess = fork(nextPath, [], { env: nextEnv });
            nextProcess.on('error', (err) => {
                logToFile('Next.js fork error: ' + err.message);
                console.error('[Next.js] Fork error:', err.message);
            });
            nextProcess.on('exit', (code, signal) => {
                logToFile('Next.js exited code=' + code + ' signal=' + signal);
                if (code !== 0 && signal !== 'SIGTERM') {
                    console.warn(`[Next.js] Exited (code=${code}, signal=${signal}). 3s da qayta ishga tushirilmoqda...`);
                    setTimeout(() => { if (nextProcess) spawnNextProcess(); }, 3000);
                }
            });
        }
        spawnNextProcess();

        // Run initial sync in background
        setTimeout(() => {
            console.log('[Offline] Triggering initial background sync...');
            runSync().catch(console.error);
        }, 5000);
        
        // Sync every 5 minutes
        setInterval(() => {
            runSync().catch(console.error);
        }, 5 * 60 * 1000);

    } catch (e) {
        logToFile('startOfflineServers CATCH: ' + e.message + '\n' + e.stack);
        console.error('[Offline] Error starting local servers:', e);
    }
}

// ─── App Events ───
logToFile('Registering app.whenReady...');
app.whenReady().then(async () => {
    logToFile('app.whenReady fired');
    app.setAppUserModelId('uz.smart.smart-pos-v2');
    
    // START OFFLINE SERVERS BEFORE WINDOW CREATION
    startOfflineServers();

    // Faqat offline Express route'larini 4000-portga yo'naltir.
    // Qolgan /api/smart/* route'lar Next.js (3000) da ishlaydi (Prisma/auth talab qiladi).
    // Faqat offline storage route'lari Express ga ketadi.
    // /api/smart/menu endi Next.js da — Prisma (pos_data.db) Product jadvalidan o'qiydi.
    const EXPRESS_ONLY_PATHS = [
        '/api/smart/orders',
        '/api/smart/agent-printers',
        '/api/smart/poll-jobs',
    ];
    session.defaultSession.webRequest.onBeforeRequest({
        urls: ['http://localhost:3000/api/smart/*']
    }, (details, callback) => {
        const url = new URL(details.url);
        const toExpress = EXPRESS_ONLY_PATHS.some(p => url.pathname === p || url.pathname.startsWith(p + '/'));
        if (toExpress) {
            callback({ redirectURL: 'http://127.0.0.1:4000' + url.pathname + url.search });
        } else {
            callback({});
        }
    });

    const config = loadConfig();
    setAutoStart(config.autoStart);

    createTray();
    
    const args = process.argv;
    const isHidden = args.includes('--hidden');

    // Wait a brief moment for Next.js and Express to bind ports
    setTimeout(() => {
        if (typeof initializePrinters === 'function') initializePrinters();
        startPolling(config);
        
        if (!isHidden) {
            createSplashWindow();
            setTimeout(() => {
                createMainWindow();
            }, 2000);
        }
    }, 4000);

    setTimeout(() => checkForUpdates(config.serverUrl), 30000);
    setInterval(() => {
        const cfg = loadConfig();
        checkForUpdates(cfg.serverUrl);
    }, 6 * 60 * 60 * 1000);
});

app.on('window-all-closed', (e) => {
    if (process.platform !== 'darwin') {
        if (serverProcess) { serverProcess.kill(); serverProcess = null; }
        if (nextProcess) { nextProcess.kill(); nextProcess = null; }
        app.quit();
    }
});

app.on('before-quit', () => {
    if (serverProcess) { serverProcess.kill(); serverProcess = null; }
    if (nextProcess) { nextProcess.kill(); nextProcess = null; }
    stopPolling();
});

app.on('second-instance', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    } else {
        createMainWindow();
    }
});
