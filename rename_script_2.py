import os
import re

target_dir = r'd:\SMART POS'

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return

    new_content = content
    # Replace SMART<span ...>POS</span> with SMART<span ...>POS</span>
    new_content = re.sub(r'SMART\s*<span([^>]*)>Pro</span>', r'SMART<span\1>POS</span>', new_content, flags=re.IGNORECASE)
    # Replace SMART<span ...>POS</span> with SMART<span ...>POS</span>
    new_content = re.sub(r'SMART\s*<span([^>]*)>PRO</span>', r'SMART<span\1>POS</span>', new_content, flags=re.IGNORECASE)
    
    new_content = re.sub(r'SMART\s*Pro', 'SMART POS', new_content, flags=re.IGNORECASE)
    new_content = re.sub(r'SMART', 'SMART', new_content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated {filepath}')

for root, dirs, files in os.walk(target_dir):
    if '.git' in root or 'node_modules' in root or '.next' in root:
        continue
    for file in files:
        if file.endswith(('.tsx', '.ts', '.html', '.json', '.md', '.py')):
            replace_in_file(os.path.join(root, file))
