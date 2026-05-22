const { contextBridge, ipcRenderer } = require('electron');

// Kassa interfeysi tomondan brauzer xatoliklarini ushlash
window.addEventListener('error', (event) => {
    ipcRenderer.send('client-error', `[WINDOW ERROR] ${event.message} at ${event.filename}:${event.lineno}`);
});

window.addEventListener('unhandledrejection', (event) => {
    ipcRenderer.send('client-error', `[UNHANDLED REJECTION] ${event.reason}`);
});

contextBridge.exposeInMainWorld('ipcAPI', {
    getConfig: () => ipcRenderer.invoke('get-config'),
    saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
    getPrinters: () => ipcRenderer.invoke('get-printers'),
    getVersion: () => ipcRenderer.invoke('get-version'),
    getAgentStatus: () => ipcRenderer.invoke('get-agent-status'),
    quitApp: () => ipcRenderer.send('quit-app'),
    minimizeApp: () => ipcRenderer.send('minimize-app'),
    toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
    reloadApp: () => ipcRenderer.send('reload-app'),
    
    // Test uchun xatolik yuborish
    sendClientError: (msg) => ipcRenderer.send('client-error', msg)
});
