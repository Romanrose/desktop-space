# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\89682\Desktop\game competition\minigame\omega\game\electron\main.ts'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Find ALL occurrences of "???" patterns to see what's left
import re
for m in re.finditer(r'"[^"]*\?{3,}[^"]*"', content):
    line_num = content[:m.start()].count('\n') + 1
    snippet = content[max(0,m.start()-80):m.end()+80]
    print(f"Line {line_num}: ...{repr(snippet)}...")
    print()

# Also find backtick strings with ???
for m in re.finditer(r'`[^`]*\?{3,}[^`]*`', content):
    line_num = content[:m.start()].count('\n') + 1
    snippet = content[max(0,m.start()-80):m.end()+80]
    print(f"Line {line_num} (backtick): ...{repr(snippet)}...")
    print()
