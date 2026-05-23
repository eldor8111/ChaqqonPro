import os
import re

target_dir = r'c:\Users\ZILOLA ZIYADULLAYEVA\Desktop\ChaqqonPro'
exclude_dirs = {'.git', 'node_modules', '.next', 'dist', 'build', '.vscode', 'vendor', '__pycache__', 'env', 'venv'}
exclude_files = {'rename_chaqqon_to_smart.py', 'anthropic.claude-code-2.0.13-win32-x64.vsix'}

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception:
        return

    new_content = content
    # Order matters: replace longer strings first
    replacements = [
        ('ChaqqonPro', 'Smart'),
        ('chaqqonpro', 'smart'),
        ('CHAQQONPRO', 'SMART'),
        ('Chaqqon-Pro', 'Smart'),
        ('chaqqon-pro', 'smart'),
        ('Chaqqon', 'Smart'),
        ('chaqqon', 'smart'),
        ('CHAQQON', 'SMART')
    ]
    
    for old, new in replacements:
        new_content = new_content.replace(old, new)
        
    if new_content != content:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f'Updated {filepath}')
        except Exception as e:
            print(f'Failed to write {filepath}: {e}')

def rename_file_or_dir(path):
    dirname, basename = os.path.split(path)
    new_basename = basename
    
    replacements = [
        ('ChaqqonPro', 'Smart'),
        ('chaqqonpro', 'smart'),
        ('CHAQQONPRO', 'SMART'),
        ('Chaqqon-Pro', 'Smart'),
        ('chaqqon-pro', 'smart'),
        ('Chaqqon', 'Smart'),
        ('chaqqon', 'smart'),
        ('CHAQQON', 'SMART')
    ]
    
    for old, new in replacements:
        new_basename = new_basename.replace(old, new)
        
    if new_basename != basename:
        new_path = os.path.join(dirname, new_basename)
        try:
            os.rename(path, new_path)
            print(f'Renamed {path} -> {new_path}')
            return new_path
        except Exception as e:
            print(f'Failed to rename {path}: {e}')
            return path
    return path

# First replace in files
for root, dirs, files in os.walk(target_dir):
    dirs[:] = [d for d in dirs if d not in exclude_dirs]
    for file in files:
        if file in exclude_files or file.endswith(('.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.pdf', '.zip', '.tar', '.gz')):
            continue
        replace_in_file(os.path.join(root, file))

# Then rename directories and files (bottom-up to avoid invalidating paths)
for root, dirs, files in os.walk(target_dir, topdown=False):
    dirs[:] = [d for d in dirs if d not in exclude_dirs]
    for file in files:
        if file in exclude_files:
            continue
        rename_file_or_dir(os.path.join(root, file))
    for d in dirs:
        rename_file_or_dir(os.path.join(root, d))
