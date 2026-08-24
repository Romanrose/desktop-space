# -*- coding: utf-8 -*-
import sys, re
sys.stdout.reconfigure(encoding="utf-8")

FILE = r"C:\Users\89682\Desktop\game competition\minigame\omega\game\electron\main.ts"

with open(FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Show lines around both system prompts
print("=== Lines 395-415 ===")
for i in range(394, 415):
    if i < len(lines):
        print(f"{i+1}: {repr(lines[i][:120])}")

print("\n=== Lines 435-455 ===")
for i in range(434, 455):
    if i < len(lines):
        print(f"{i+1}: {repr(lines[i][:120])}")
