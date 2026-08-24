# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding="utf-8")

FILE = r"C:\Users\89682\Desktop\game competition\minigame\omega\game\electron\main.ts"

with open(FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find the system prompt content lines (between line 399 content: and line with "...historyMessages")
in_system = False
system_lines = []
for i in range(395, 440):
    if i < len(lines):
        if 'content:' in lines[i] and i > 396:
            in_system = True
            continue
        if '...historyMessages' in lines[i]:
            in_system = False
            continue
        if in_system:
            system_lines.append((i+1, lines[i]))

print("=== System prompt lines ===")
for line_num, line in system_lines:
    print(f"{line_num}: {repr(line[:150])}")

# Also show the full string content as a single escaped string
full_system = "".join([l for _, l in system_lines])
print("\n=== Full system prompt (repr) ===")
print(repr(full_system[:500]))
