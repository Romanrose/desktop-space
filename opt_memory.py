# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding="utf-8")

FILE = "electron/main.ts"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

# ============================================================
# 1. Add session summarization helper + keyword extraction
#    Insert before function rendererPath()
# ============================================================
anchor = """async function savePersistedData() {
  await writeFile(stateFile(), JSON.stringify(persisted, null, 2), "utf8");
}"""

new_code = """async function savePersistedData() {
  await writeFile(stateFile(), JSON.stringify(persisted, null, 2), "utf8");
}

/**
 * 退出时打包本次会话记录 → 1~2 条记忆摘要
 */
function summarizeSessionLog(lines: ChatLine[]): string[] {
  const playerLines = lines.filter((l) => l.speaker === "player" && l.text.length > 6);
  const omegaLines = lines.filter((l) => l.speaker === "omega");

  if (playerLines.length === 0 && omegaLines.length === 0) return [];

  const summaries: string[] = [];

  // 提取玩家提到的主要话题（去重，取前 5 条）
  const topics = new Set<string>();
  for (const p of playerLines) {
    const cleaned = p.text.replace(/[「」【】《》""''，。！？、：；（）…\-\s]/g, "").slice(0, 30);
    if (cleaned.length >= 4) topics.add(cleaned);
  }
  const topicList = [...topics].slice(0, 5);
  if (topicList.length > 0) {
    summaries.push("本次会话话题：" + topicList.join("、"));
  }

  // Omega 的情绪/状态变化
  const omegaHighlights = omegaLines.filter((l) => l.text.length > 10).slice(-3);
  if (omegaHighlights.length > 0) {
    summaries.push("Ω 提到：" + omegaHighlights.map((l) => l.text.slice(0, 40)).join(" | "));
  }

  return summaries.slice(0, 2);
}

/**
 * 从玩家消息中提取关键词（去掉常见停用词）
 */
function extractKeywords(text: string): string[] {
  const stops = new Set([
    "你", "我", "他", "她", "它", "我们", "你们", "他们", "这个", "那个", "什么",
    "怎么", "为什么", "如何", "可以", "能", "会", "是", "的", "了", "在", "有",
    "不", "就", "也", "都", "很", "还", "要", "让", "把", "被", "给", "跟", "和",
    "吗", "吧", "呢", "啊", "哦", "嗯", "哈", "呀", "嘛", "好", "对", "到", "去",
    "说", "想", "看", "知", "道", "觉", "得", "没", "来", "上", "下", "大", "小",
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "can", "shall", "should", "may", "might", "i", "you", "he", "she", "it",
    "we", "they", "me", "him", "her", "us", "them", "this", "that", "these",
    "those", "am", "and", "or", "but", "not", "no"
  ]);

  // 按中英文分割
  const tokens: string[] = [];
  const chineseSegments = text.match(/[\u4e00-\u9fff]{2,}/g) || [];
  const englishWords = text.toLowerCase().match(/[a-z]{3,}/g) || [];

  for (const seg of chineseSegments) {
    if (seg.length >= 2 && !stops.has(seg)) tokens.push(seg);
  }
  for (const w of englishWords) {
    if (!stops.has(w)) tokens.push(w);
  }

  return [...new Set(tokens)];
}

/**
 * 关键词匹配：从记忆中选取最相关的 1-3 条
 */
function filterMemoriesByKeywords(memories: string[], keywords: string[], maxCount = 3): string[] {
  if (keywords.length === 0 || memories.length === 0) return [];

  const scored = memories.map((mem) => {
    const score = keywords.filter((kw) => mem.includes(kw)).length;
    return { mem, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .filter((s) => s.score > 0)
    .slice(0, maxCount)
    .map((s) => s.mem);
}"""

content = content.replace(anchor, new_code)

# ============================================================
# 2. Add before-quit handler (after app.whenReady)
# ============================================================
old = """app.on("window-all-closed", () => {});"""

new = """app.on("window-all-closed", () => {});

// 退出时打包本次会话记忆
app.on("before-quit", async () => {
  if (sessionLog.length > 4) {
    const summaries = summarizeSessionLog(sessionLog);
    for (const s of summaries) {
      if (s.trim()) {
        persisted.memories.push(s.trim());
      }
    }
    persisted.memories = persisted.memories.slice(-100);
    await savePersistedData();
  }
});"""

content = content.replace(old, new)

# ============================================================
# 3. Modify cloudOmegaResponse: reduce history, keyword memory
# ============================================================
old = """  // Build conversation history from sessionLog (last 6 turns = 12 messages)
  const historyMessages: Array<Record<string, unknown>> = sessionLog.slice(-12).map((entry) => ({
    role: entry.speaker === "omega" ? "assistant" : "user",
    content: entry.speaker === "omega" ? entry.text : entry.text
  }));

  const memoryContext = persisted.memories.length > 0
    ? ("📝 记忆摘要：\n" + persisted.memories.slice(-5).join("\n"))
    : "";

  const userContent: Array<Record<string, unknown>> = [
    { type: "text", text: memoryContext },
    { type: "text", text: "【玩家说】" + text },"""

new = """  // 精简历史：只保留最近 2 轮对话（4 条消息）
  const historyMessages: Array<Record<string, unknown>> = sessionLog.slice(-4).map((entry) => ({
    role: entry.speaker === "omega" ? "assistant" : "user",
    content: entry.speaker === "omega" ? entry.text : entry.text
  }));

  // 关键词匹配记忆：只在玩家提到相关内容时调取
  const keywords = extractKeywords(text);
  const relevantMemories = keywords.length > 0
    ? filterMemoriesByKeywords(persisted.memories, keywords, 3)
    : [];
  const memoryContext = relevantMemories.length > 0
    ? ("📝 相关记忆：\n" + relevantMemories.join("\n"))
    : "（暂无相关历史记录）";

  const userContent: Array<Record<string, unknown>> = [
    { type: "text", text: memoryContext },
    { type: "text", text: "【玩家说】" + text },"""

content = content.replace(old, new)

# ============================================================
# 4. Update system prompt to mention the memory system
# ============================================================
old = '  "memorySummary": "如需记住玩家说的话，写一句简短摘要（≤200字），否则不填",'

new = '  "memorySummary": "如需记住玩家说的话，写一句简短摘要（≤200字，如：玩家对XX感兴趣/玩家提到XX），否则不填",'

content = content.replace(old, new)

# ============================================================
# Write back
# ============================================================
with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("All changes applied!")
