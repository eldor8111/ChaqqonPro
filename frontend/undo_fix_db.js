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
        const fromRegex = new RegExp(`FROM \\\\"${t}\\\\"`, 'g');
        const updateRegex = new RegExp(`UPDATE \\\\"${t}\\\\"`, 'g');
        const intoRegex = new RegExp(`INTO \\\\"${t}\\\\"`, 'g');
        const tableRegex = new RegExp(`\\\\"${t}\\\\"`, 'g'); // Catch-all for other instances like TABLE IF NOT EXISTS
        
        if (tableRegex.test(content)) {
            content = content.replace(tableRegex, `"${t}"`);
            changed = true;
        }
    });
    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed:', file);
    }
});
