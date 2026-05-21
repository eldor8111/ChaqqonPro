const { app, Tray, Menu, nativeImage, dialog, shell, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// Yagona nusxa tekshirish (Single instance lock)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
}

const printer = require('./printer');
const { startPolling, stopPolling, syncPrinters } = require('./tray');

let tray = null;
let settingsWindow = null;

// ─── Sozlamalar ────────────────────────────────────────────────────────────────
const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (e) {}
    return {
        serverUrl: 'https://chaqqonpro.e-code.uz',
        pollInterval: 2500,
        autoStart: true,
    };
}

function saveConfig(cfg) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
    } catch (e) {}
}

// ─── Windows Auto-Start (Login'da o'zi yoqilishi) ──────────────────────────────
function setAutoStart(enable) {
    app.setLoginItemSettings({
        openAtLogin: enable,
        path: process.execPath,
        args: ['--hidden'],
    });
}

// ─── Sozlamalar oynasi ──────────────────────────────────────────────────────────
function openSettingsWindow() {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.focus();
        return;
    }

    const config = loadConfig();

    settingsWindow = new BrowserWindow({
        width: 460,
        height: 380,
        title: 'SMART Agent — Sozlamalar',
        resizable: false,
        minimizable: false,
        maximizable: false,
        icon: getIconPath(),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    settingsWindow.setMenu(null);

    const html = `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8">
<title>Sozlamalar</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px; }
  h2 { font-size: 18px; font-weight: 700; color: #60a5fa; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
  label { display: block; font-size: 13px; color: #94a3b8; margin-bottom: 6px; margin-top: 16px; }
  input[type=text], input[type=number] {
    width: 100%; padding: 10px 14px; border: 1.5px solid #334155;
    border-radius: 8px; background: #1e293b; color: #e2e8f0; font-size: 14px; outline: none;
  }
  input:focus { border-color: #60a5fa; }
  .checkbox-row { display: flex; align-items: center; gap: 10px; margin-top: 16px; }
  input[type=checkbox] { width: 18px; height: 18px; cursor: pointer; accent-color: #60a5fa; }
  .checkbox-label { font-size: 14px; color: #e2e8f0; }
  .btn-row { display: flex; gap: 10px; margin-top: 24px; }
  button { flex: 1; padding: 11px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
  .btn-save { background: #3b82f6; color: white; }
  .btn-save:hover { background: #2563eb; }
  .btn-cancel { background: #1e293b; color: #94a3b8; border: 1.5px solid #334155; }
  .btn-cancel:hover { background: #334155; }
  .status { margin-top: 14px; font-size: 12px; color: #4ade80; text-align: center; min-height: 18px; }
</style>
</head>
<body>
<h2>⚙️ SMART Agent Sozlamalari</h2>

<label>Server URL manzili</label>
<input type="text" id="serverUrl" value="${config.serverUrl}" placeholder="https://chaqqonpro.e-code.uz">

<label>Tekshirish intervali (ms) — tavsiya: 2500</label>
<input type="number" id="pollInterval" value="${config.pollInterval}" min="1000" max="10000" step="500">

<div class="checkbox-row">
  <input type="checkbox" id="autoStart" ${config.autoStart ? 'checked' : ''}>
  <span class="checkbox-label">Windows yoqilganda Agent ham avtomatik ishga tushsin</span>
</div>

<div class="btn-row">
  <button class="btn-cancel" onclick="window.close()">Bekor qilish</button>
  <button class="btn-save" onclick="save()">💾 Saqlash</button>
</div>
<p class="status" id="statusMsg"></p>

<script>
const { ipcRenderer } = require('electron');
function save() {
  const cfg = {
    serverUrl: document.getElementById('serverUrl').value.trim(),
    pollInterval: parseInt(document.getElementById('pollInterval').value) || 2500,
    autoStart: document.getElementById('autoStart').checked,
  };
  ipcRenderer.send('save-config', cfg);
  document.getElementById('statusMsg').textContent = '✅ Saqlandi! Agent qayta ishga tushishi mumkin.';
  setTimeout(() => window.close(), 1500);
}
</script>
</body>
</html>`;

    settingsWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

    const { ipcMain } = require('electron');
    ipcMain.removeAllListeners('save-config');
    ipcMain.on('save-config', (event, cfg) => {
        saveConfig(cfg);
        setAutoStart(cfg.autoStart);
        // Polling ni yangi interval bilan qayta boshlash
        stopPolling();
        startPolling(cfg);
    });
}

// ─── Tray ikonkasi ──────────────────────────────────────────────────────────────
function getIconPath() {
    // Assetlar papkasidan ikonkani olish
    const devPath = path.join(__dirname, 'assets', 'icon.ico');
    const prodPath = path.join(process.resourcesPath, 'assets', 'icon.ico');
    if (fs.existsSync(devPath)) return devPath;
    if (fs.existsSync(prodPath)) return prodPath;
    return null;
}

function createTray() {
    const iconPath = getIconPath();
    let icon;

    if (iconPath && fs.existsSync(iconPath)) {
        icon = nativeImage.createFromPath(iconPath);
    } else {
        // Ikonka topilmasa 16x16 yashil nuqta yaratamiz
        icon = nativeImage.createFromDataURL(
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA' +
            'AklEQVQ4jWNgYGD4DwABBAEAwGYhiQAAAABJRU5ErkJggg=='
        );
    }

    tray = new Tray(icon);
    tray.setToolTip('SMART Agent — Ishlamoqda ✅');

    updateTrayMenu();

    tray.on('double-click', () => {
        openSettingsWindow();
    });
}

function updateTrayMenu(status = 'Ishlamoqda ✅') {
    const contextMenu = Menu.buildFromTemplate([
        {
            label: `SMART Agent`,
            enabled: false,
            icon: (() => {
                const p = getIconPath();
                if (p && fs.existsSync(p)) {
                    return nativeImage.createFromPath(p).resize({ width: 16, height: 16 });
                }
                return undefined;
            })(),
        },
        { type: 'separator' },
        { label: `📡 Holat: ${status}`, enabled: false },
        { type: 'separator' },
        {
            label: '🔄 Printerlarni sinxronlash',
            click: async () => {
                const cfg = loadConfig();
                try {
                    await syncPrinters(cfg.serverUrl);
                    tray.setToolTip('SMART Agent — Printerlar sinxronlandi ✅');
                } catch (e) {
                    tray.setToolTip('SMART Agent — Sinxronlash xatosi ❌');
                }
            }
        },
        { type: 'separator' },
        {
            label: '⚙️ Sozlamalar',
            click: () => openSettingsWindow(),
        },
        {
            label: '📋 Log papkasini ochish',
            click: () => shell.openPath(app.getPath('userData')),
        },
        { type: 'separator' },
        {
            label: '❌ Chiqish',
            click: () => {
                stopPolling();
                app.quit();
            },
        },
    ]);

    if (tray && !tray.isDestroyed()) {
        tray.setContextMenu(contextMenu);
    }
}

// ─── App Events ────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
    app.setAppUserModelId('uz.e-code.smart-agent');

    // Taskbarda ko'rsatilmasin (faqat tray'da bo'lsin)
    if (app.dock) app.dock.hide(); // macOS
    app.setSkipTaskbar(true);      // Windows

    createTray();

    const config = loadConfig();
    setAutoStart(config.autoStart);

    // Printer polling ni boshlash
    startPolling(config);

    // Printerlarni darhol sinxronlash
    syncPrinters(config.serverUrl).catch(() => {});
});

app.on('window-all-closed', (e) => {
    // Barcha oynalar yopilsa ham app ishlashda davom etsin (tray'da)
    e.preventDefault ? undefined : null;
    // Event'ni to'xtatamiz
});

app.on('before-quit', () => {
    stopPolling();
});

// Windows'dagi ikkinchi nusxani birinchisiga yo'naltirish
app.on('second-instance', () => {
    openSettingsWindow();
});

module.exports = { updateTrayMenu, loadConfig };
