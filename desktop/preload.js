const { contextBridge, ipcRenderer } = require('electron');

window.addEventListener('error', (event) => {
    ipcRenderer.send('client-error', `[WINDOW ERROR] ${event.message} at ${event.filename}:${event.lineno}`);
});

window.addEventListener('unhandledrejection', (event) => {
    ipcRenderer.send('client-error', `[UNHANDLED REJECTION] ${event.reason}`);
});

contextBridge.exposeInMainWorld('ipcAPI', {
    getConfig:       ()      => ipcRenderer.invoke('get-config'),
    saveConfig:      (cfg)   => ipcRenderer.invoke('save-config', cfg),
    getPrinters:     ()      => ipcRenderer.invoke('get-printers'),
    discoverPrinters:()      => ipcRenderer.invoke('printer:discover'),
    getVersion:      ()      => ipcRenderer.invoke('get-version'),
    getAgentStatus:  ()      => ipcRenderer.invoke('get-agent-status'),
    getMode:         ()      => ipcRenderer.invoke('get-mode'),   // 'online' | 'offline'
    localPrint:      (job)   => ipcRenderer.invoke('local-print', job),  // chekni lokal serverga (tez, bulutsiz)
    quitApp:         ()      => ipcRenderer.send('quit-app'),
    minimizeApp:     ()      => ipcRenderer.send('minimize-app'),
    toggleFullscreen:()      => ipcRenderer.send('toggle-fullscreen'),
    reloadApp:       ()      => ipcRenderer.send('reload-app'),
    sendClientError: (msg)   => ipcRenderer.send('client-error', msg),
});
