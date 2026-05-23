import os
import re
import shutil

root_dir = r'd:\Smart\UBT POS'

# Rename directories first
dirs_to_rename = [
    (r'src\app\ubt-pos', r'src\app\smart-pos'),
    (r'src\app\ubt', r'src\app\smart'),
    (r'src\app\(dashboard)\ubt', r'src\app\(dashboard)\smart'),
    (r'src\app\api\ubt', r'src\app\api\smart'),
]

for old, new in dirs_to_rename:
    old_path = os.path.join(root_dir, old)
    new_path = os.path.join(root_dir, new)
    if os.path.exists(old_path) and not os.path.exists(new_path):
        os.rename(old_path, new_path)
        print(f"Renamed dir {old} to {new}")

# Rename string contents
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
        'Smart': 'SMART POS',
        'Smart': 'SMART'
    }

    new_content = content
    for old, new in replaces.items():
        new_content = new_content.replace(old, new)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated {filepath}')

for root, dirs, files in os.walk(root_dir):
    if '.git' in root or 'node_modules' in root or '.next' in root:
        continue
    for file in files:
        if file.endswith(('.tsx', '.ts', '.html', '.json', '.md', '.prisma', '.py', '.js', '.jsx')):
            replace_in_file(os.path.join(root, file))

