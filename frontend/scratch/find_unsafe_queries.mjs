import fs from 'fs';
import path from 'path';

const searchDir = 'c:/Users/E-co/Downloads/ChaqqonPro-main/Smart pos/frontend/src';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
        } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
            results.push(filePath);
        }
    });
    return results;
}

const files = walk(searchDir);

console.log("Searching for $queryRawUnsafe...");
let total = 0;
files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes('$queryRawUnsafe')) {
        const lines = content.split('\n');
        let inBlock = false;
        let blockLines = [];
        let startLine = 0;

        lines.forEach((line, idx) => {
            if (line.includes('$queryRawUnsafe')) {
                console.log(`\n--- ${f}:${idx + 1} ---`);
                console.log(line.trim());
                total++;
            }
        });
    }
});
console.log(`\nTotal $queryRawUnsafe: ${total}`);
