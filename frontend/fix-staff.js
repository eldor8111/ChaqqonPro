/**
 * fix-staff.js — Serverda to'g'ridan ishlatish uchun
 *
 * Ishlatish (server terminal yoki Docker exec):
 *   node fix-staff.js
 *
 * Docker:
 *   docker exec -it smart_app node fix-staff.js
 */

const path = require('path');
const bcrypt = require('bcryptjs');

// DATABASE_URL dan yoki to'g'ridan fayl yo'lini aniqlash
const dbPath = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.replace('file:', '')
    : path.join(__dirname, 'prisma', 'dev.db');

let db;
try {
    const Database = require('better-sqlite3');
    db = new Database(dbPath);
    console.log('✅ SQLite (better-sqlite3) bilan ulandi:', dbPath);
} catch (e1) {
    console.log('better-sqlite3 topilmadi, sqlite3 sinab ko\'rilmoqda...');
    try {
        // Prisma orqali
        fixViaPrisma();
        return;
    } catch (e2) {
        console.error('SQLite ulanishi muvaffaqiyatsiz:', e2.message);
        process.exit(1);
    }
}

async function fixViaSqlite() {
    try {
        // 1. Tenant topish (+998882858171)
        const tenant = db.prepare("SELECT id, shopName FROM Tenant WHERE phone = ?").get('+998882858171');
        if (!tenant) {
            console.error('❌ Tenant topilmadi: +998882858171');
            process.exit(1);
        }
        console.log(`✅ Tenant: ${tenant.shopName} (${tenant.id})`);

        // 2. Staff topish (username +1212 yoki 1212)
        const staff = db.prepare("SELECT id, name, username, role FROM Staff WHERE tenantId = ? AND (username = ? OR username = ?)").get(tenant.id, '+1212', '1212');
        if (!staff) {
            console.error('❌ Staff topilmadi (username: +1212 yoki 1212)');
            process.exit(1);
        }
        console.log(`✅ Staff: ${staff.name} | username: ${staff.username} | role: ${staff.role}`);

        // 3. Hash yaratish
        const hash = await bcrypt.hash('1212', 10);

        // 4. Yangilash
        db.prepare("UPDATE Staff SET username = ?, passwordHash = ? WHERE id = ?").run('1212', hash, staff.id);
        console.log(`✅ Yangilandi: username='1212', passwordHash set`);
        console.log('');
        console.log('Endi /kassa/login sahifasida 1212 / 1212 bilan kirish mumkin!');
        db.close();
    } catch (err) {
        console.error('❌ Xato:', err);
        db.close();
        process.exit(1);
    }
}

async function fixViaPrisma() {
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const p = new PrismaClient();

    try {
        const tenants = await p.$queryRawUnsafe("SELECT id, shopName FROM Tenant WHERE phone = ?", '+998882858171');
        if (!tenants.length) { console.error('❌ Tenant topilmadi'); process.exit(1); }
        const tenant = tenants[0];
        console.log(`✅ Tenant: ${tenant.shopName} (${tenant.id})`);

        const staffList = await p.$queryRawUnsafe(
            "SELECT id, name, username FROM Staff WHERE tenantId = ? AND (username = ? OR username = ?)",
            tenant.id, '+1212', '1212'
        );
        if (!staffList.length) { console.error('❌ Staff topilmadi'); process.exit(1); }
        const staff = staffList[0];
        console.log(`✅ Staff: ${staff.name} | username: ${staff.username}`);

        const hash = await bcrypt.hash('1212', 10);
        await p.$executeRawUnsafe("UPDATE Staff SET username = ?, passwordHash = ? WHERE id = ?", '1212', hash, staff.id);
        console.log('✅ Yangilandi!');
        console.log('Endi /kassa/login da 1212 / 1212 bilan kirish mumkin!');
        await p.$disconnect();
    } catch (err) {
        console.error('❌ Xato:', err);
        await p.$disconnect();
        process.exit(1);
    }
}

fixViaSqlite();
