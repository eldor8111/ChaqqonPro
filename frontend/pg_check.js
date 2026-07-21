const fs = require('fs');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) results.push(file);
        }
    });
    return results;
}

const files = walk('src');

const issues = {
    datetime_fn: [],       // datetime('now') - SQLite
    strftime_fn: [],       // strftime() - SQLite
    time_fn: [],           // time(col, 'localtime') - SQLite
    date_fn_sql: [],       // date(col) - SQLite
    datetime_type: [],     // DATETIME type - SQLite
    placeholder_q: [],     // ? placeholders - SQLite
    insert_or: [],         // INSERT OR REPLACE / INSERT OR IGNORE - SQLite
    on_conflict_update: [], // ON CONFLICT DO UPDATE - need to check format
    pragma: [],            // PRAGMA - SQLite
    autoincrement: [],     // AUTOINCREMENT - SQLite
    glob: [],              // GLOB - SQLite
    unquoted_table: [],    // Unquoted table names in raw queries
    unquoted_camel: [],    // Unquoted camelCase columns
};

const models = ['SuperAdmin','PlatformUser','Session','Tenant','Product','InventoryReceipt',
    'InventoryExpenditure','InventoryTransfer','InventoryCount','InventoryWriteoff','Staff',
    'Customer','Transaction','TransactionItem','PharmacyDrug','SmartPrinter','PrintJob','PrintLog',
    'SmartTable','WaiterCall','KDSOrder','SmartReservation','AuditLog','KassiHarakat','DeliveryOrder',
    'SmartRecommendation','Attendance','PotentialClient','Tariff','BalanceLog','PlatformSettings',
    'UbtCategory','UbtIngredient','UbtSupplier'];

const camelCols = ['tenantId','createdAt','updatedAt','passwordHash','staffMeta','sellingPrice',
    'costPrice','printerIp','isSetMenu','hasBarcode','autoCalculate','isMainMonoblock','latencyMs',
    'lastSeenAt','nextAttemptAt','recipes','inStock','expiresAt','userId','printerId','orderId',
    'agentId','jobId','tenantType','phoneNumber','durationMs','targetId','sourceId','pointsUsed',
    'totalPrice','unitCost','orderDate','totalAmount','paymentMethod','warehouseId','categoryId',
    'transactionId','customerId','inventoryId','staffId','supplierId','drugCode','barcode',
    'isActive','isDefault','paperWidth','maxAttempts','lastError','claimedBy','claimedAt',
    'printedAt','triesToday','firstSeenAt'];

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, idx) => {
        const ln = idx + 1;
        const entry = `${file}:${ln}: ${line.trim()}`;

        // SQLite-specific functions in SQL strings
        if (/datetime\('now'\)/.test(line)) issues.datetime_fn.push(entry);
        if (/strftime\(/.test(line) && /prisma/.test(content.slice(Math.max(0,content.indexOf(line)-200), content.indexOf(line)+200))) issues.strftime_fn.push(entry);
        if (/\btime\(/.test(line) && /localtime/.test(line)) issues.time_fn.push(entry);
        if (/\bdate\(/.test(line) && /localtime/.test(line)) issues.date_fn_sql.push(entry);

        // DATETIME type in CREATE TABLE
        if (/DATETIME\b/.test(line) && /executeRaw|queryRaw|CREATE TABLE/.test(line)) issues.datetime_type.push(entry);
        
        // ? placeholder in Raw queries (not template literals $1, but literal ?)
        if (/executeRawUnsafe|queryRawUnsafe/.test(line) && /\bWHERE\b.* = \?/.test(line)) issues.placeholder_q.push(entry);
        
        // SQLite-specific INSERT OR
        if (/INSERT OR (REPLACE|IGNORE|FAIL|ABORT)/.test(line)) issues.insert_or.push(entry);
        
        // PRAGMA
        if (/PRAGMA /.test(line)) issues.pragma.push(entry);
        
        // AUTOINCREMENT
        if (/AUTOINCREMENT/.test(line)) issues.autoincrement.push(entry);
        
        // GLOB
        if (/\bGLOB\b/.test(line)) issues.glob.push(entry);
    });
});

console.log('\n=== FULL POSTGRES COMPATIBILITY REPORT ===\n');

Object.entries(issues).forEach(([key, arr]) => {
    if (arr.length > 0) {
        console.log(`\n[${key.toUpperCase()}] (${arr.length} issues):`);
        arr.forEach(e => console.log('  ' + e));
    }
});

const total = Object.values(issues).reduce((a,b) => a + b.length, 0);
if (total === 0) {
    console.log('ALL GOOD! No SQLite-specific issues found.');
} else {
    console.log(`\nTotal issues: ${total}`);
}
