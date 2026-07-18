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
            if(file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.tsx')) results.push(file);
        }
    });
    return results;
}

const files = walk('src');
const models = ['SuperAdmin', 'PlatformUser', 'Session', 'Tenant', 'Product', 'InventoryReceipt', 'InventoryExpenditure', 'InventoryTransfer', 'InventoryCount', 'InventoryWriteoff', 'Staff', 'Customer', 'Transaction', 'TransactionItem', 'PharmacyDrug', 'SmartPrinter', 'PrintJob', 'PrintLog', 'SmartTable', 'WaiterCall', 'KDSOrder', 'SmartReservation', 'AuditLog', 'KassiHarakat', 'DeliveryOrder', 'SmartRecommendation', 'Attendance', 'PotentialClient', 'Tariff', 'BalanceLog', 'PlatformSettings', 'UbtCategory', 'UbtIngredient', 'UbtSupplier'];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    content = content.replace(/(FROM|UPDATE|INTO|JOIN|TABLE)\s+([\\'\\"]*)([A-Z][a-zA-Z0-9_]+)([\\'\\"]*)/g, (match, keyword, pre, table, post) => {
        if (models.includes(table)) {
            return keyword + ' \\"' + table + '\\"';
        }
        return match;
    });

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed:', file);
    }
});
