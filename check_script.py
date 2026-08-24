# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\89682\Desktop\game competition\minigame\omega\game\electron\main.ts'
SCRIPT = r'C:\Users\89682\Desktop\game competition\minigame\omega\game\update_prompt.py'

# Check if the script file itself has proper Chinese
with open(SCRIPT, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the new_system variable
idx = content.find("new_system = '''")
if idx > -1:
    print("Found new_system in script file")
    snippet = content[idx:idx+200]
    print(repr(snippet[:200]))
else:
    print("new_system not found in script!")
    # Try finding the old_system
    idx2 = content.find("old_system = ")
    if idx2 > -1:
        print("Found old_system:")
        print(repr(content[idx2:idx2+200]))
