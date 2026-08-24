# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding="utf-8")

FILE = "electron/main.ts"

with open(FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find the memoryContext line and insert keyword declarations before it
for i, line in enumerate(lines):
    if 'memoryContext = persisted.memories.length > 0' in line:
        print(f"Found memoryContext at line {i+1}: {line.rstrip()}")
        
        # Insert keyword extraction before
        indent = line[:len(line) - len(line.lstrip())]
        insert_lines = [
            "  // 关键词匹配记忆：只在玩家提到相关内容时调取\n",
            f"  const keywords = extractKeywords(text);\n",
            f"  const relevantMemories = keywords.length > 0\n",
            f"    ? filterMemoriesByKeywords(persisted.memories, keywords, 3)\n",
            f"    : [];\n",
        ]
        for j, ins in enumerate(insert_lines):
            lines.insert(i + j, ins)
        
        # Now modify the memoryContext definition (shifted by 5 lines)
        ctx_line_idx = i + 5
        old_line = lines[ctx_line_idx]
        new_line = '  const memoryContext = relevantMemories.length > 0\n'
        lines[ctx_line_idx] = new_line
        
        # Fix the next line too
        nest_line_idx = i + 6
        nest_line = '    ? ("📝 相关记忆：\\n" + relevantMemories.join("\\n"))\n'
        lines[nest_line_idx] = nest_line
        
        # Fix the third line
        empty_line_idx = i + 7
        empty_line = '    : "（暂无相关历史记录）";\n'
        lines[empty_line_idx] = empty_line
        
        print(f"Modified lines {i+1}-{i+7}")
        break

with open(FILE, "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Done!")
