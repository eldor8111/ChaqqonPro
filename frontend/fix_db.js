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
            if(file.endsWith('.ts') || file.endsWith('.js')) results.push(file);
        }
    });
    return results;
}

const files = walk('src');
const tables = ['Tenant', 'Staff', 'PlatformUser', 'Product', 'Customer', 'Transaction', 'UbtCategory', 'UbtIngredient', 'PrintJob', 'PrintLog'];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    tables.forEach(t => {
        // We catch optional existing quotes to prevent double quoting
        const fromRegex = new RegExp(`FROM\\s+"?${t}"?\\b`, 'g');
        const updateRegex = new RegExp(`UPDATE\\s+"?${t}"?\\b`, 'g');
        const intoRegex = new RegExp(`INTO\\s+"?${t}"?\\b`, 'g');
        
        if (fromRegex.test(content) || updateRegex.test(content) || intoRegex.test(content)) {
            content = content.replace(fromRegex, `FROM \\"${t}\\"`);
            content = content.replace(updateRegex, `UPDATE \\"${t}\\"`);
            content = content.replace(intoRegex, `INTO \\"${t}\\"`);
            changed = true;
        }
    });
    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed:', file);
    }
});
