const { app, BrowserWindow, screen, ipcMain, Menu, nativeImage, Tray, shell, Notification, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Asosiy xatolarni global darajada ushlash (app crash bo'lmasligi uchun)
process.on('uncaughtException', (error) => {
    console.error('CRITICAL ERROR (Uncaught Exception):', error);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL ERROR (Unhandled Rejection):', reason);
});

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
    process.exit(0);
}

const { startPolling, stopPolling, syncPrinters } = require('./tray-agent');
const { getWindowsPrinters } = require('./printer');

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

// ─── Configuration ───
const CONFIG_FILE = path.join(app.getPath('userData'), 'config_v2.json'); // Yangi nom

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (e) {}
    return {
        serverUrl: 'http://89.39.94.195',
        pollInterval: 2500,
        autoStart: true,
        kioskUrl: 'http://89.39.94.195/smart-pos'
    };
}

function saveConfig(cfg) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
    } catch (e) {}
}

// SSL Xatolarini o'tkazib yuborish (Oq oyna oldini olish uchun muhim qadam)
app.commandLine.appendSwitch('ignore-certificate-errors');

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true); // SSL xatosini inkor qilish
});

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
            webSecurity: false // CORS and mixed content oq oyna sababchilarini bloklash uchun
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

// ─── App Events ───
app.whenReady().then(() => {
    app.setAppUserModelId('uz.smart.smart-pos-v2');
    const config = loadConfig();
    setAutoStart(config.autoStart);

    createTray();
    
    const args = process.argv;
    const isHidden = args.includes('--hidden');

    if (!isHidden) {
        createSplashWindow();
        setTimeout(() => {
            createMainWindow();
        }, 2000);
    }

    startPolling(config);
    setTimeout(() => checkForUpdates(config.serverUrl), 30000);
    setInterval(() => {
        const cfg = loadConfig();
        checkForUpdates(cfg.serverUrl);
    }, 6 * 60 * 60 * 1000);
});

app.on('window-all-closed', (e) => {
    e.preventDefault();
});

app.on('before-quit', () => {
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
