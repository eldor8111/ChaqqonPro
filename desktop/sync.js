const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const ONLINE_URL = 'https://chaqqonpro.e-code.uz';

async function getDB() {
    const dbPath = path.join(process.env.APPDATA || process.env.LOCALAPPDATA || __dirname, 'smart-pos-v2', 'local_pos.db');
    return await open({
        filename: dbPath,
        driver: sqlite3.Database
    });
}

async function syncMenu() {
    console.log('[Sync] Fetching latest menu from online server...');
    try {
        const res = await fetch(`${ONLINE_URL}/api/smart/menu`);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        
        if (data.items && data.categories) {
            const db = await getDB();
            
            await db.exec('BEGIN TRANSACTION');
            try {
                await db.run('DELETE FROM menu_items');
                await db.run('DELETE FROM menu_categories');

                const stmtItem = await db.prepare('INSERT INTO menu_items (id, name, categoryId, price, inStock, stock, unit, printerIp, isSetMenu, modifiers, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                for (const item of data.items) {
                    await stmtItem.run(
                        item.id,
                        item.name,
                        item.categoryId,
                        item.price,
                        item.inStock ? 1 : 0,
                        item.stock || 0,
                        item.unit || '',
                        item.printerIp || '',
                        item.isSetMenu ? 1 : 0,
                        JSON.stringify(item.modifiers || []),
                        item.image || ''
                    );
                }
                await stmtItem.finalize();

                const stmtCat = await db.prepare('INSERT INTO menu_categories (id, name) VALUES (?, ?)');
                for (const cat of data.categories) {
                    await stmtCat.run(cat.id, cat.name);
                }
                await stmtCat.finalize();

                await db.exec('COMMIT');
                console.log(`[Sync] Menu synced successfully. Items: ${data.items.length}, Categories: ${data.categories.length}`);
            } catch (err) {
                await db.exec('ROLLBACK');
                throw err;
            } finally {
                await db.close();
            }
        }
    } catch (e) {
        console.error('[Sync] Menu sync failed:', e.message);
    }
}

async function syncOrders() {
    console.log('[Sync] Checking for offline orders to upload...');
    try {
        const db = await getDB();
        const unsynced = await db.all('SELECT * FROM orders WHERE synced = 0');
        
        if (unsynced.length === 0) {
            console.log('[Sync] No offline orders to upload.');
            await db.close();
            return;
        }

        console.log(`[Sync] Found ${unsynced.length} offline orders. Uploading...`);
        for (const order of unsynced) {
            const payload = {
                total: order.total,
                paymentMethod: order.paymentMethod,
                customerId: order.customerId,
                cart: JSON.parse(order.items),
                createdAt: order.createdAt
            };

            const res = await fetch(`${ONLINE_URL}/api/smart/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                await db.run('UPDATE orders SET synced = 1 WHERE id = ?', order.id);
                console.log(`[Sync] Order ${order.id} uploaded successfully.`);
            } else {
                console.warn(`[Sync] Order ${order.id} upload failed with status ${res.status}`);
            }
        }
        await db.close();
    } catch (e) {
        console.error('[Sync] Order sync failed:', e.message);
    }
}

async function runSync() {
    await syncOrders();
    await syncMenu();
}

module.exports = { runSync, syncMenu, syncOrders };
