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
const rawQueryPattern = /\$queryRaw/g;

console.log("Searching for raw query occurrences...");
let total = 0;
files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes('$queryRaw')) {
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
            if (line.includes('$queryRaw')) {
                console.log(`${f}:${idx + 1} - ${line.trim().substring(0, 100)}`);
                total++;
            }
        });
    }
});
console.log(`Total occurrences found: ${total}`);
