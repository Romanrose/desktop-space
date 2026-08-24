# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding="utf-8")

FILE = "electron/main.ts"

with open(FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find and modify the specific lines
changes = 0
for i, line in enumerate(lines):
    # Line: sessionLog slice
    if 'sessionLog.slice(-12)' in line:
        lines[i] = line.replace('sessionLog.slice(-12)', 'sessionLog.slice(-4)')
        print(f"Line {i+1}: Reduced history: -12 → -4")
        changes += 1
    
    # Line: memory context - replace the full memoryContext block
    if i + 5 < len(lines):
        block = "".join(lines[i:i+6])
        if '"📝 记忆摘要：\\n"' in block:
            # Found the memoryContext lines, replace them
            # Find exactly where the memoryContext lines are
            for j in range(i, i+6):
                if lines[j].strip().startswith('? ("📝'):
                    lines[j] = lines[j].replace(
                        '? ("📝 记忆摘要：\\n" + persisted.memories.slice(-5).join("\\n"))',
                        '? relevantMemories.length > 0 ? ("📝 相关记忆：\\n" + relevantMemories.join("\\n")) : "（暂无相关历史记录）"'
                    )
                    print(f"Line {j+1}: Memory context updated")
                    changes += 1
                    break
            break

with open(FILE, "w", encoding="utf-8") as f:
    f.writelines(lines)

print(f"\nTotal changes: {changes}")
