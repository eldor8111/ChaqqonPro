const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = ['node_modules', '.next', '.git', '.gemini'];

function walkAndRename(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        if (IGNORE_DIRS.includes(item)) continue;
        
        const oldPath = path.join(dir, item);
        const stat = fs.statSync(oldPath);
        
        // Agar nomida 'horeca' bo'lsa
        let newName = item;
        if (newName.toLowerCase().includes('horeca')) {
            newName = newName.replace(/horeca/g, 'ubt')
                             .replace(/Horeca/g, 'Ubt')
                             .replace(/HoReCa/g, 'UBT')
                             .replace(/HORECA/g, 'UBT');
        }
        
        const newPath = path.join(dir, newName);
        
        if (oldPath !== newPath) {
            fs.renameSync(oldPath, newPath);
            console.log(`Renamed: ${oldPath} -> ${newPath}`);
        }
        
        if (stat.isDirectory()) {
            walkAndRename(newPath); // Rekursiv yangi nomdagi papka ichida yuriladi
        } else {
            // Read and replace content
            replaceInFile(newPath);
        }
    }
}

function replaceInFile(filePath) {
    const ext = path.extname(filePath);
    if (!['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.html', '.css'].includes(ext)) {
        return; // Faqat kod fayllari
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    content = content.replace(/horeca/g, 'ubt');
    content = content.replace(/Horeca/g, 'Ubt');
    content = content.replace(/HoReCa/g, 'UBT');
    content = content.replace(/HORECA/g, 'UBT');
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated content: ${filePath}`);
    }
}

const targetDir = path.resolve(__dirname, '../src');
console.log(`Starting refactor in: ${targetDir}`);
walkAndRename(targetDir);

// Check other important directories/files manually or via array
const otherPaths = ['../prisma', '../public', '../components'];
for (const p of otherPaths) {
    const fullPath = path.resolve(__dirname, p);
    if (fs.existsSync(fullPath)) {
        walkAndRename(fullPath);
    }
}

console.log("Global refactor complete!");
