/**
 * preload.js — Xavfsiz ko'prik (Renderer ↔ Main)
 * contextBridge orqali faqat kerakli API'larni ochadi
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('smartPOS', {
    // Sozlamalarni olish
    getConfig: () => ipcRenderer.invoke('get-config'),

    // Sozlamalarni saqlash
    saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),

    // Printer ro'yxatini olish
    getPrinters: () => ipcRenderer.invoke('get-printers'),

    // Ilovadan chiqish
    quit: () => ipcRenderer.send('quit-app'),

    // Oynani kichraytirish
    minimize: () => ipcRenderer.send('minimize-app'),

    // Fullscreen toggle
    toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),

    // Versiya ma'lumoti
    getVersion: () => ipcRenderer.invoke('get-version'),

    // Agent holati
    getAgentStatus: () => ipcRenderer.invoke('get-agent-status'),

    // Dastur platformasi
    platform: process.platform,
});
