# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding="utf-8")

FILE = r"C:\Users\89682\Desktop\game competition\minigame\omega\game\src\browserBridge.ts"

with open(FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(111, 128):
    if i < len(lines):
        print(f"{i+1}: {repr(lines[i])}")
