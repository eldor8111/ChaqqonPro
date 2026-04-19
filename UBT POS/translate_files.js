const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src', 'app', '(dashboard)', 'ubt');

const translationsKeys = {
    // Davomat
    "Davomat Hisoboti": "t('nav.attendance') + ' ' + t('nav.reports')",
    "Xodimlar kelish-ketish hisoboti": "t('reports.subTitle')",
    "Hozir ishda": "t('staff.activeStaff')",

    // Ubt Page
    "Bugungi savdo": "t('dashboard.todaySales')",
    "Sof foyda": "t('reports.netProfit')",
    "Pul kirimi": "t('dashboard.totalRevenue')",
    "Pul chiqimi": "t('reports.totalExpense')",
    "To'lov turlari": "t('finance.paymentTypes') || 'To\\'lov turlari'",
    "Stollar holati": "t('ubt.tablesStatus') || 'Stollar holati'",
    "Eng ko'p sotilganlar": "t('dashboard.topProducts')",
    "Taomlar reytingi": "t('dashboard.topProducts')",
};

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file === 'node_modules' || file === '.next') return;
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(filepath));
        } else if (file.endsWith('.tsx')) {
            results.push(filepath);
        }
    });
    return results;
}

const files = walkDir(targetDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // VERY naive check to inject useLang if not present but needed
    let needsLang = false;

    for (const [key, value] of Object.entries(translationsKeys)) {
        const regexStr1 = `>\\s*${key}\\s*<`; // matches > Bugungi savdo <
        const regex1 = new RegExp(regexStr1, 'g');
        if (regex1.test(content)) {
            content = content.replace(regex1, `>{${value}}<`);
            changed = true;
            needsLang = true;
        }
    }

    if (changed && needsLang) {
        if (!content.includes('useLang')) {
            // Find last import
            const lastImportIndex = content.lastIndexOf('import ');
            const endOfLastImport = content.indexOf('\\n', lastImportIndex);
            if (endOfLastImport !== -1) {
                content = content.substring(0, endOfLastImport + 1) + 'import { useLang } from "@/lib/LangContext";\n' + content.substring(endOfLastImport + 1);
            } else {
                content = 'import { useLang } from "@/lib/LangContext";\n' + content;
            }
        }
        
        if (!content.includes('const { t } = useLang();')) {
            // Try to add inside default function
            const defaultExportMatch = content.match(/export default function ([a-zA-Z0-9_]+)\([^)]*\)\s*\{/);
            if (defaultExportMatch) {
                const insertPos = defaultExportMatch.index + defaultExportMatch[0].length;
                content = content.substring(0, insertPos) + '\n    const { t } = useLang();' + content.substring(insertPos);
            }
        }
        fs.writeFileSync(file, content, 'utf8');
        console.log("Updated:", file);
    }
});
