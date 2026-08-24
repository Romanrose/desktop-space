# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'C:\Users\89682\Desktop\game competition\minigame\omega\game\electron\main.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()
print(f'Read {len(lines)} lines')
print(f'Line 398: {repr(lines[397][:80])}')
print(f'Line 400: {repr(lines[399][:80])}')
