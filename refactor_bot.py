import os
import re
import shutil

root_dirs = [r'd:\ChaqqonPro\telegram_bot', r'd:\ChaqqonPro\billing_service']

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        return

    # Replace specific strings case-sensitively to avoid breaking CSS or unrelated stuff
    replaces = {
        '/ubt-pos': '/smart-pos',
        '/ubt': '/smart',
        'ubtTables': 'smartTables',
        'fetchUbtTables': 'fetchSmartTables',
        'addUbtReservation': 'addSmartReservation',
        'ubtSettings': 'smartSettings',
        'UbtTable': 'SmartTable',
        'UbtPrinter': 'SmartPrinter',
        'UbtReservation': 'SmartReservation',
        'ubt-active-shop': 'smart-active-shop',
        'ubt-pos-storage': 'smart-pos-storage',
        'ubt-frontend-storage': 'smart-frontend-storage',
        'ubt-super-admin-storage': 'smart-super-admin-storage',
        'ubtSession': 'smartSession',
        'permUbt': 'permSmart',
        '"ubt"': '"smart"',
        "'ubt'": "'smart'",
        'ChaqqonPro': 'SMART POS',
        'Chaqqon': 'SMART'
    }

    new_content = content
    for old, new in replaces.items():
        new_content = new_content.replace(old, new)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated {filepath}')

for root_dir in root_dirs:
    for root, dirs, files in os.walk(root_dir):
        if '.git' in root or 'node_modules' in root or '.next' in root or '__pycache__' in root or 'venv' in root:
            continue
        for file in files:
            if file.endswith(('.tsx', '.ts', '.html', '.json', '.md', '.prisma', '.py', '.js', '.jsx', '.env', '.txt')):
                replace_in_file(os.path.join(root, file))

