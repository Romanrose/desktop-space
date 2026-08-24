/**
 * Ω 提词器 Agent
 *
 * 取代原本的分支对话树（narrative.ts），根据 Ω 的发言内容、
 * 对话历史与游戏状态，动态为玩家生成三个回复选项。
 *
 * 工作模式：
 * 1. AI 模式 — 调用独立的 option agent API
 * 2. 本地模式 — 基于关键词匹配 + 状态上下文的启发式生成
 */

import type { ChatLine, OmegaEmotion, OmegaState } from "../types";

export interface AgentOption {
  text: string;
}

/** 情感关键词 → 中文标签映射 */
const EMOTION_KEYWORDS: Record<string, { label: string; keywords: string[] }> = {
  happy: { label: "开心", keywords: ["开心", "高兴", "喜欢", "好", "棒", "开心", "笑", "温暖", "亮"] },
  sad: { label: "难过", keywords: ["难过", "孤独", "寂寞", "累", "暗", "冷", "空", "害怕", "不安"] },
  shy: { label: "害羞", keywords: ["害羞", "不好意思", "紧张", "低头", "脸红", "耳朵"] },
  proud: { label: "骄傲", keywords: ["骄傲", "自豪", "完成", "终于", "第一次", "做到了"] },
  fearful: { label: "害怕", keywords: ["害怕", "怕", "危险", "警惕", "不安", "担心"] },
  calm_positive: { label: "平静-积极", keywords: [] },
  calm_negative: { label: "平静-消极", keywords: [] },
  excited: { label: "兴奋", keywords: ["兴奋", "激动", "期待", "新", "哇", "看"] },
};

/** 主题关键词 */
const TOPIC_KEYWORDS: Record<string, { label: string; keywords: string[] }> = {
  star: { label: "星星", keywords: ["星星", "星", "舷窗", "窗外", "夜空", "光", "宇宙", "星球"] },
  book: { label: "书", keywords: ["书", "故事", "写", "文字", "笔记", "读", "记忆", "记录"] },
  room: { label: "太空舱", keywords: ["太空舱", "舱", "房间", "墙", "地板", "桌子", "书架", "装饰"] },
  plant: { label: "植物", keywords: ["植物", "花", "浇", "绿", "生命"] },
  past: { label: "过去", keywords: ["过去", "以前", "曾经", "小时候", "童年", "回忆", "记"] },
  music: { label: "音乐", keywords: ["音乐", "声音", "听", "唱", "旋律", "寂静", "安静"] },
  future: { label: "未来", keywords: ["未来", "以后", "哪天", "总有一天", "希望", "想"] },
  world: { label: "世界", keywords: ["世界", "地球", "人类", "你们", "那边", "白天", "晚上"] },
  time: { label: "时间", keywords: ["时间", "小时", "分钟", "等", "长夜", "白天", "自转", "公转"] },
  game: { label: "游戏", keywords: ["游戏", "玩", "功能", "解锁", "未完成"] },
};

/**
 * 检测文本中的情感倾向
 */
function detectEmotion(text: string): OmegaEmotion | null {
  const lower = text.toLowerCase();
  for (const [emotion, entry] of Object.entries(EMOTION_KEYWORDS)) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return emotion as OmegaEmotion;
    }
  }
  return null;
}

/**
 * 检测文本中的主题
 */
function detectTopics(text: string): string[] {
  const lower = text.toLowerCase();
  const topics: string[] = [];
  for (const [topic, entry] of Object.entries(TOPIC_KEYWORDS)) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      topics.push(topic);
    }
  }
  return topics;
}

/**
 * 本地模式：基于关键词 + 状态启发式生成三个回复选项
 */

/**
 * 本地模式：N/A — 本地回退时不生成选项，由玩家自由输入
 */
function localGenerateOptions(
  omegaText: string,
  state: OmegaState,
  history: ChatLine[]
): AgentOption[] {
  return [];
}

/**
 * 完整异步生成流程：先尝试 AI 接口，失败则本地 fallback
 */
export async function generateOptions(
  omegaText: string,
  state: OmegaState,
  history: ChatLine[]
): Promise<AgentOption[]> {
  // AI 模式：调用 LLM 提词器；不可用时返回空数组（让玩家自由输入）
  console.log("[OptionsAgent] checking window.omega.options?.generate:",
    typeof window !== "undefined" && (window as any).omega?.options?.generate ? "EXISTS" : "NOT FOUND");
  if (typeof window !== "undefined" && (window as any).omega?.options?.generate) {
    try {
      const result: string[] = await (window as any).omega.options.generate(
        omegaText,
        history
      );
      console.log("[OptionsAgent] AI returned:", result);
      if (Array.isArray(result) && result.length >= 2) {
        return result.slice(0, 3).map((text: string) => ({ text }));
      }
    } catch {
      // fall through
    }
  }
  console.log("[OptionsAgent] returning empty - no options available");
  return [];
}

/**
 * 从 AI response 中提取 narrativeChoices，若缺失则本地填补
 */
export function extractOptionsFromResponse(
  response: { narrativeChoices?: string[] },
  omegaText: string,
  state: OmegaState,
  history: ChatLine[]
): AgentOption[] {
  if (
    response.narrativeChoices &&
    Array.isArray(response.narrativeChoices) &&
    response.narrativeChoices.length >= 2
  ) {
    return response.narrativeChoices.slice(0, 3).map((text) => ({ text }));
  }
  console.log("[OptionsAgent] returning empty - no options available");
  return [];
}

/**
 * 同步版，供 browserBridge mock AI 使用
 */
export function syncGenerateOptions(omegaText: string, state: OmegaState): string[] {
  return [];
}

/**
 * 构建 AI option agent 的 system prompt
 */
export function buildOptionAgentPrompt(omegaText: string, state: OmegaState): string {
  const nickname = state.nickname || "玩家";
  
  // 从 narrative.ts 中提取的对话样本，作为 few-shot 示例
  const examples = `
【示例 1】
Omega: 你来了。我刚刚在看窗外的星星……这里的夜晚总是很长。
玩家选项:
- 「这里的夜晚有多长？」
- 「你每天都看星星吗？」
- 「我陪你一会儿。」

【示例 2】
Omega: 嗯……大概有二十多个小时吧。有时候我会盯着舷窗，等天亮等到忘了时间。
玩家选项:
- 「听起来好孤独。」
- 「那白天是不是也很长？」
- 「下次天亮我陪你一起等。」

【示例 3】
Omega: 因为这里能看到很多星星——比你们的夜空多得多。没有大气干扰，每一颗都又亮又静。
玩家选项:
- 「能指给我看哪颗最漂亮吗？」
- 「它们确实挺像在陪你的。」
- 「你认识它们的名字吗？」

【示例 4】
Omega: 那个——（她指向舷窗外偏左的一颗淡蓝色星星。）那颗叫……嗯，我没有给它起名字。
玩家选项:
- 「给它起个名字吧。」
- 「它让我想起你的眼睛。」
- 「蓝色在宇宙中很少见吗？」

【示例 5】
Omega: 我听见了。太空舱安静得有些过分，所以我知道那种不太好受的感觉。
玩家选项:
- 「听起来不太好受……你还好吗？」
- 「有什么我能帮上忙的吗？」
- 「我会一直在这里陪你。」
  `;
  
  return `你是一个桌面宠物 Omega（惟）的提词器。你的任务是根据 Omega 刚刚对用户说的话，为用户 ${nickname} 模拟 3 个自然、符合语境的回复选项。

参考以下对话样本的风格：
${examples}

要求：
- 输出 JSON 格式：{ "options": ["选项1", "选项2", "选项3"] }
- 每个选项长度 6-20 字
- 选项要多样化：一个共情回应、一个追问探索、一个行动/互动
- 不要评价 Omega 的话，只是从玩家角度提供可能的回应
- 用中文简体

Omega 说：${omegaText}`;
}

/**
 * 解析 AI option agent 的 JSON 响应
 */
export function parseOptionAgentResponse(raw: string): string[] | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.options) && parsed.options.length >= 2) {
      return parsed.options.slice(0, 3).map(String);
    }
  } catch {
    // ignore
  }
  return null;
}
