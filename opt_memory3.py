# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding="utf-8")

FILE = "electron/main.ts"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the memoryContext variable declaration with the keyword-based version
old = """  const memoryContext = persisted.memories.length > 0
    ? relevantMemories.length > 0 ? ("📝 相关记忆：\n" + relevantMemories.join("\n")) : "（暂无相关历史记录）"
    : "";"""

new = """  // 关键词匹配记忆：只在玩家提到相关内容时调取
  const keywords = extractKeywords(text);
  const relevantMemories = keywords.length > 0
    ? filterMemoriesByKeywords(persisted.memories, keywords, 3)
    : [];
  const memoryContext = relevantMemories.length > 0
    ? ("📝 相关记忆：\n" + relevantMemories.join("\n"))
    : "（暂无相关历史记录）";"""

content = content.replace(old, new)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed memory context with keyword extraction!")
