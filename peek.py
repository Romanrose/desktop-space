# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\89682\Desktop\game competition\minigame\omega\game\electron\main.ts'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Show lines 396-404
for i in range(395, 405):
    if i < len(lines):
        print(f"{i+1}: {repr(lines[i][:120])}")
