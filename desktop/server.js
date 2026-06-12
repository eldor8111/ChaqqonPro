const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

const app = express();
const allowedOrigins = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3005',
    'http://127.0.0.1:3005',
]);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        return callback(new Error('CORS origin not allowed'), false);
    },
}));
app.use(express.json());

let db;

async function initDB() {
    const dbPath = path.join(process.env.APPDATA || process.env.LOCALAPPDATA || __dirname, 'smart-pos-v2', 'local_pos.db');
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    await db.exec('PRAGMA journal_mode = WAL');

    await db.exec(`
        CREATE TABLE IF NOT EXISTS menu_items (
            id TEXT PRIMARY KEY,
            name TEXT,
            categoryId TEXT,
            price REAL,
            inStock INTEGER,
            stock REAL,
            unit TEXT,
            printerIp TEXT,
            isSetMenu INTEGER,
            modifiers TEXT,
            image TEXT
        );
        
        CREATE TABLE IF NOT EXISTS menu_categories (
            id TEXT PRIMARY KEY,
            name TEXT
        );

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            total REAL,
            paymentMethod TEXT,
            customerId TEXT,
            items TEXT,
            synced INTEGER DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    `);
}

// ─── Agent Printers ───────────────────────────────────────────────────────────
// Tray-agent Windows printerlarini bu yerga yuboradi; frontend ham bu yerdan oladi
const APPDATA_DIR = process.env.APPDATA || process.env.LOCALAPPDATA || __dirname;
const PRINTERS_FILE = path.join(APPDATA_DIR, 'smart-pos-v2', 'agent_printers.json');
let agentPrinters = [];

// Saqlangan printerlarni yuklash
try {
    if (fs.existsSync(PRINTERS_FILE)) {
        const saved = JSON.parse(fs.readFileSync(PRINTERS_FILE, 'utf8'));
        if (Array.isArray(saved.printers)) agentPrinters = saved.printers;
    }
} catch {}

app.get('/api/smart/agent-printers', (_req, res) => {
    res.json({ printers: agentPrinters });
});

app.post('/api/smart/agent-printers', (req, res) => {
    try {
        const { printers } = req.body || {};
        if (Array.isArray(printers)) {
            agentPrinters = printers;
            try {
                fs.writeFileSync(PRINTERS_FILE, JSON.stringify({ printers }));
            } catch {}
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── Poll Jobs (print queue — hozircha bo'sh) ─────────────────────────────────
const printJobs = [];

app.get('/api/smart/poll-jobs', (_req, res) => {
    const jobs = printJobs.splice(0, printJobs.length);
    res.json({ jobs });
});

// API: Get Menu
app.get('/api/smart/menu', async (req, res) => {
    try {
        const rawItems = await db.all('SELECT * FROM menu_items');
        const items = rawItems.map(item => ({
            ...item,
            inStock: item.inStock === 1,
            isSetMenu: item.isSetMenu === 1,
            modifiers: item.modifiers ? JSON.parse(item.modifiers) : []
        }));
        
        const categories = await db.all('SELECT * FROM menu_categories');
        
        res.json({
            items,
            categories,
            cancelCode: '1234',
            paymentMethods: [],
            blockSell: false
        });
    } catch (e) {
        console.error("Menu DB error", e);
        res.status(500).json({ error: e.message });
    }
});

// API: Submit Order
app.post('/api/smart/orders', async (req, res) => {
    const { total, paymentMethod, customerId, cart } = req.body;
    try {
        const result = await db.run(
            'INSERT INTO orders (total, paymentMethod, customerId, items) VALUES (?, ?, ?, ?)',
            total, paymentMethod, customerId || null, JSON.stringify(cart)
        );
        res.json({ success: true, orderId: result.lastID });
    } catch (e) {
        console.error("Order DB error", e);
        res.status(500).json({ error: e.message });
    }
});

const PORT = 4000;
const HOST = '127.0.0.1';
initDB().then(() => {
    app.listen(PORT, HOST, () => {
        console.log(`[Offline POS Backend] running on http://${HOST}:${PORT}`);
    });
}).catch(console.error);
