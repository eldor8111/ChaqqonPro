const { app, BrowserWindow, screen, ipcMain, Menu, nativeImage, Tray, shell, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
}

const { startPolling, stopPolling, syncPrinters } = require('./tray-agent');
const { getWindowsPrinters } = require('./printer');

// ─── Version Check ───
const CURRENT_VERSION = app.getVersion();
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
        if (latest && latest !== CURRENT_VERSION) {
            updateAvailable = true;
            updateUrl = data.downloadUrl || `${serverUrl}/settings`;
            console.log(`[UPDATE] Yangi versiya mavjud: ${latest} (joriy: ${CURRENT_VERSION})`);
            // Windows notification
            if (Notification.isSupported()) {
                new Notification({
                    title: 'SMART POS — Yangilanish mavjud! 🎉',
                    body: `v${latest} versiyasi chiqdi. Yuklab olish uchun bosing.`,
                    silent: false,
                }).show();
            }
            rebuildTrayMenu();
        }
    } catch (e) {
        // Network xato — jimgina o'tkazib yuborish
    }
}

let mainWindow = null;
let splashWindow = null;
let tray = null;

// ─── Configuration ───
const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (e) {}
    return {
        serverUrl: 'https://smart.e-code.uz',
        pollInterval: 2500,
        autoStart: true,
        kioskUrl: 'https://smart.e-code.uz/smart-pos'
    };
}

function saveConfig(cfg) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
    } catch (e) {}
}

// ─── Auto Start ───
function setAutoStart(enable) {
    app.setLoginItemSettings({
        openAtLogin: enable,
        path: process.execPath,
        args: ['--hidden']
    });
}

// ─── Helper Functions ───
function getIconPath() {
    const devPath = path.join(__dirname, 'assets', 'icon.ico');
    const prodPath = path.join(process.resourcesPath, 'assets', 'icon.ico');
    if (fs.existsSync(devPath)) return devPath;
    if (fs.existsSync(prodPath)) return prodPath;
    return null;
}

// ─── Tray Icon ───
function buildTrayMenuTemplate() {
    const cfg = loadConfig();
    const template = [
        { label: `SMART POS v${CURRENT_VERSION}`, enabled: false },
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
    tray.setToolTip(updateAvailable
        ? 'SMART POS — Yangi versiya mavjud! 🎉'
        : 'SMART POS ✅ Ishlamoqda'
    );
}

function createTray() {
    const iconPath = getIconPath();
    let icon;

    if (iconPath && fs.existsSync(iconPath)) {
        icon = nativeImage.createFromPath(iconPath);
    } else {
        icon = nativeImage.createFromDataURL(
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAklEQVQ4jWNgYGD4DwABBAEAwGYhiQAAAABJRU5ErkJggg=='
        );
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

// ─── Splash Screen ───
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

// ─── Main Window (Kiosk) ───
function createMainWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const config = loadConfig();

    mainWindow = new BrowserWindow({
        width,
        height,
        kiosk: true, // Fullscreen without borders and menus
        show: false, // Don't show immediately
        icon: getIconPath(),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            devTools: false // Disable devtools for security
        }
    });

    // Oynani yopish xavfsizligi
    mainWindow.setMenu(null);
    mainWindow.setMenuBarVisibility(false);

    // Kassa sahifasini yuklash
    const loadApp = () => {
        mainWindow.loadURL(config.kioskUrl).catch(e => {
            console.error("Failed to load kiosk URL:", e);
            mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
                <html>
                <body style="background-color:#0f172a;color:#fff;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;">
                    <h1 style="color:#38bdf8;">Server bilan aloqa yo'q!</h1>
                    <p>Iltimos, server (npm run dev) ishga tushganligiga ishonch hosil qiling.</p>
                    <p>Manzil: ${config.kioskUrl}</p>
                    <button onclick="window.location.href='${config.kioskUrl}'" style="padding:10px 20px;font-size:16px;background:#38bdf8;color:#fff;border:none;border-radius:8px;cursor:pointer;margin-top:20px;">Qayta urinib ko'rish</button>
                    <script>
                        setInterval(() => {
                            fetch('${config.kioskUrl}', { method: 'HEAD' })
                                .then(() => window.location.href='${config.kioskUrl}')
                                .catch(()=>{});
                        }, 3000);
                    </script>
                </body>
                </html>
            `));
        });
    };
    loadApp();

    // F11 yoki boshqa tugmalarni bloklash
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (
            input.key === 'F11' || 
            (input.control && input.shift && input.key.toLowerCase() === 'i') || // Ctrl+Shift+I
            (input.control && input.key.toLowerCase() === 'r') // Ctrl+R
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
ipcMain.handle('get-version', () => app.getVersion());
ipcMain.handle('get-agent-status', () => 'running');

ipcMain.handle('save-config', (event, cfg) => {
    saveConfig(cfg);
    setAutoStart(cfg.autoStart);
    stopPolling();
    startPolling(cfg);
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
        const isKiosk = mainWindow.isKiosk();
        mainWindow.setKiosk(!isKiosk);
    }
});


// ─── App Events ───
app.whenReady().then(() => {
    app.setAppUserModelId('uz.smart.smart-pos');

    const config = loadConfig();
    setAutoStart(config.autoStart);

    createTray();
    
    // Asosiy oyna va splash ni yaratish
    const args = process.argv;
    const isHidden = args.includes('--hidden');

    if (!isHidden) {
        createSplashWindow();
        
        // Splash ko'rsatish va orqa fonda yuklash
        setTimeout(() => {
            createMainWindow();
        }, 2000); // Splash ni kamida 2 sekund ushlab turamiz animatsiya uchun
    } else {
        // Agar kompyuter yonganda avto-start qilsa, faqat trayda ochiladi.
        // Kassir kassa qilishni xohlasa oynani o'zi ochadi yoki 
        // to'g'ridan to'g'ri ekranga chiqarish uchun quyidagini ochib qo'yish mumkin:
        // createMainWindow();
    }

    // Print agentni fonda ishga tushirish
    startPolling(config);

    // Versiya tekshiruvi: dastlab 30 sekundan so'ng, keyin har 6 soatda
    setTimeout(() => checkForUpdates(config.serverUrl), 30_000);
    setInterval(() => {
        const cfg = loadConfig();
        checkForUpdates(cfg.serverUrl);
    }, 6 * 60 * 60 * 1000); // har 6 soatda
});

app.on('window-all-closed', (e) => {
    // Kiosk yopilsa ham dastur trayda ishlab turishi kerak (print agent uchun)
    e.preventDefault();
});

app.on('before-quit', () => {
    stopPolling();
});

app.on('second-instance', () => {
    // Agar dastur allaqachon ishlab turgan bo'lsa va yana ochilsa oynani ko'rsatish
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    } else {
        createMainWindow();
    }
});
