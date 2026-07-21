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
let found = false;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const regex2 = /prisma\.\$(queryRaw|executeRaw)\`([\s\S]*?)\`/g;
    let match;
    while ((match = regex2.exec(content)) !== null) {
        const query = match[2];
        if (query.match(/\b(tenantId|createdAt|updatedAt|passwordHash|staffMeta|sellingPrice|costPrice|printerIp|isSetMenu|hasBarcode|autoCalculate|isMainMonoblock|printJob|latencyMs|lastSeenAt|nextAttemptAt|hasBarcode|recipes|inStock)\b/)) {
            if (!query.match(/\"(tenantId|createdAt|updatedAt|passwordHash|staffMeta|sellingPrice|costPrice|printerIp|isSetMenu|hasBarcode|autoCalculate|isMainMonoblock|printJob|latencyMs|lastSeenAt|nextAttemptAt|hasBarcode|recipes|inStock)\"/)) {
                console.log('UNQUOTED CAMELCASE IN:', file);
                console.log(query.trim());
                console.log('---');
                found = true;
            }
        }
    }
});
if (!found) console.log('All good!');
