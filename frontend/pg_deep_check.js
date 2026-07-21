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

// All known camelCase column names in the schema
const camelCols = [
    'tenantId','createdAt','updatedAt','passwordHash','staffMeta','sellingPrice','costPrice',
    'printerIp','isSetMenu','hasBarcode','autoCalculate','isMainMonoblock','latencyMs','lastSeenAt',
    'nextAttemptAt','expiresAt','userId','printerId','orderId','agentId','jobId','tenantType',
    'phoneNumber','durationMs','targetId','sourceId','pointsUsed','totalPrice','unitCost',
    'orderDate','totalAmount','paymentMethod','warehouseId','categoryId','transactionId',
    'customerId','inventoryId','staffId','supplierId','drugCode','barcode','isActive','isDefault',
    'paperWidth','maxAttempts','lastError','claimedBy','claimedAt','printedAt','triesToday',
    'firstSeenAt','itemCount','setMenu','printerRole','orderType','tableId','callerId',
    'deliveryAddress','drugName','drugUnit','saleType','shiftDate','discountType','cardNumber',
    'cashAmount','cardAmount','debtAmount','returnItems','syncAt','lastSyncAt','buildNumber',
    'appVersion','minStock','isTemplate','parentId','productId','unitPrice','totalCost',
    'receiptNumber','receiptUrl','invoiceNumber','supplierId','receivedBy','approvedBy',
    'sourceWarehouse','targetWarehouse','operationType','isConfirmed','confirmedBy','confirmedAt',
    'countDate','countedBy','writeoffReason','writeoffDate','writtenoffBy','drugId','batchNumber',
    'expiryDate','purchasePrice','insuranceCode','pinCode','lastLogin','loginCount',
    'salesAmount','transactionsCount','staffRole','branchName','loyaltyPoints','visitCount',
    'firstVisit','lastVisit','totalSpent','averageCheck','birthdayDate','contactInfo',
    'taxRate','taxAmount','subtotal','discountAmount','promoCode','tableNumber','seatCount',
    'isOccupied','currentOrderId','reservationId','guestName','guestPhone','guestCount',
    'reservationDate','reservationTime','duration','specialRequests','isConfirmedReservation',
    'cancelledAt','cancelReason','deliveredAt','deliveryFee','estimatedTime','courierName',
    'courierPhone','deliveryStatus','kitchenStatus','printCount','lastPrintAt','agentVersion',
    'agentToken','isOnline','machineId','heartbeatAt','ipAddress','macAddress','portNumber',
    'paperSize','autoCut','cashDrawer','soundEnabled','darkMode','language','timezone',
    'currency','dateFormat','timeFormat','taxEnabled','discountEnabled','loyaltyEnabled',
    'reservationEnabled','deliveryEnabled','kdsenabled','waitercallEnabled','syncEnabled',
    'printerCount','staffCount','productCount','tableCount','maxProducts','maxStaff',
    'maxTables','maxBranches','monthlyPrice','yearlyPrice','trialDays','isDefault',
    'isPopular','features','limitations','sortOrder','parentCategory','imageUrl',
    'description','isAvailable','preparationTime','calories','allergens','ingredients',
    'portionSize','portionUnit','minOrderQty','maxOrderQty','currentStock','alertThreshold'
];

let allIssues = [];

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Extract all raw query blocks (both tagged template literals and RawUnsafe strings)
    // For RawUnsafe: find the SQL string
    const rawUnsafeRegex = /\$executeRawUnsafe\(`([\s\S]*?)`|'\$executeRawUnsafe'\s*,\s*`([\s\S]*?)`/g;
    let m;
    
    // Check for unquoted camelCase in SQL strings
    // Look for SQL keywords followed by content
    const sqlStringRegex = /(?:executeRawUnsafe|queryRawUnsafe)\s*\(\s*`([\s\S]*?)`/g;
    while ((m = sqlStringRegex.exec(content)) !== null) {
        const sql = m[1];
        camelCols.forEach(col => {
            // Check if col appears unquoted in SQL context (not in ${} template var)
            const unquotedPattern = new RegExp(`(?<!["\`])\\b${col}\\b(?!["\`])(?!\\s*=\\s*\\$\\{)`, 'g');
            // Simple check: if col appears without quotes
            const quotedPattern = new RegExp(`"${col}"`, 'g');
            const hasUnquoted = new RegExp(`(?:[\\s,=(]|^)${col}(?:[\\s,=)]|$)`, 'gm').test(sql);
            const hasQuoted = new RegExp(`"${col}"`, 'g').test(sql);
            
            if (hasUnquoted && !hasQuoted) {
                const lineNum = content.substr(0, m.index).split('\n').length;
                allIssues.push({ file, lineNum, col, snippet: sql.trim().split('\n')[0] });
            }
        });
    }
    
    // Tagged template literals
    const taggedRegex = /\$(executeRaw|queryRaw)`([\s\S]*?)`/g;
    while ((m = taggedRegex.exec(content)) !== null) {
        const sql = m[2];
        camelCols.forEach(col => {
            const hasUnquoted = new RegExp(`(?:[\\s,=(]|^)${col}(?:[\\s,=)]|$)`, 'gm').test(sql);
            const hasQuoted = new RegExp(`"${col}"`, 'g').test(sql);
            
            if (hasUnquoted && !hasQuoted) {
                const lineNum = content.substr(0, m.index).split('\n').length;
                allIssues.push({ file, lineNum, col, snippet: sql.trim().split('\n')[0] });
            }
        });
    }
});

if (allIssues.length === 0) {
    console.log('\nALL GOOD! No unquoted camelCase column issues found.');
} else {
    console.log('\n=== UNQUOTED CAMELCASE COLUMN ISSUES ===\n');
    allIssues.forEach(i => {
        console.log(`${i.file}:${i.lineNum} [${i.col}] -- ${i.snippet}`);
    });
    console.log(`\nTotal: ${allIssues.length} issues`);
}
