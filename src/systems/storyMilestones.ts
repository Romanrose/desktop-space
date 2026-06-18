/**
 * Ω 主线剧情触发引擎
 *
 * 管理 milestones 1-7 的触发条件检测、对话内容、奖励发放。
 * 由 FloatingWindow/CapsuleWindow 在适当时机调用 checkMilestones。
 */

import type { OmegaState } from "../types";

/** 所有可用里程碑 ID 列表 */
export const ALL_MILESTONES = [
  "m1_first_greeting",
  "m2_clean_capsule",
  "m3_show_world",
  "m4_childhood_story",
  "m5_construction",
  "m6_game_unlock",
  "m7_writing",
] as const;

export type MilestoneId = (typeof ALL_MILESTONES)[number];

/* ---------- 打招呼内容池 ---------- */

const FIRST_GREETINGS = [
  "早上好，你们的世界今天天气如何？",
  "又见面了。",
  "你平时都吃些什么？",
];

const PERIODIC_TOPICS = [
  "你那边现在是白天还是晚上？",
  "窗外的星星很安静。",
  "我在想……你们世界的颜色是不是比这里多一些。",
  "你有没有想过，声音在真空中其实不会传播？不过你能听见我。",
  "今天有发生什么特别的事吗？",
  "我刚刚在看一本书，里面提到了一种叫「海」的东西。",
];

/** 随机选取一条首次打招呼文案 */
export function pickFirstGreeting(): string {
  return FIRST_GREETINGS[Math.floor(Math.random() * FIRST_GREETINGS.length)];
}

/** 随机选取一条定期话题 */
export function pickPeriodicTopic(): string {
  return PERIODIC_TOPICS[Math.floor(Math.random() * PERIODIC_TOPICS.length)];
}

/* ---------- 里程碑 2: 清扫太空舱对话 ---------- */

const CLEAN_DIALOGUES = [
  { speaker: "omega" as const, text: "我应该打扫一下太空舱了……" },
  { speaker: "player" as const, text: "（点头示意）" },
  { speaker: "omega" as const, text: "这里比我刚来的时候还要乱。墙角堆着一些不记得什么时候的笔记，窗台上全是灰。恒星的光照进来的时候，灰尘会飘得很明显。" },
  { speaker: "player" as const, text: "（安静地等着）" },
  { speaker: "omega" as const, text: "……谢谢你没有催我。我慢慢来就好。" },
];

export function getCleanCapsuleDialogue() {
  return CLEAN_DIALOGUES;
}

/* ---------- 里程碑检查 ---------- */

export type MilestoneCheck = {
  /** 本次检查中新触发的里程碑 ID，若无则为 null */
  triggered: MilestoneId | null;
  /** 触发后的气泡消息（如果需要在悬浮窗显示） */
  bubbleText: string | null;
};

/**
 * 检查是否满足未触发的里程碑条件。
 * 每次只触发一个（按顺序优先），状态由调用方通过 updateState 写入 completedMilestones。
 */
export function checkMilestones(state: OmegaState): MilestoneCheck {
  const completed = new Set(state.completedMilestones ?? []);
  const { mood, affinity, unlocked } = state;

  // 按顺序检查
  if (!completed.has("m1_first_greeting") && mood > 50) {
    return {
      triggered: "m1_first_greeting",
      bubbleText: pickFirstGreeting(),
    };
  }

  if (!completed.has("m2_clean_capsule") && mood >= 100) {
    return {
      triggered: "m2_clean_capsule",
      bubbleText: "我应该打扫一下太空舱了……",
    };
  }

  if (!completed.has("m3_show_world") && mood >= 100 && affinity >= 50) {
    return {
      triggered: "m3_show_world",
      bubbleText: "想看看你们的世界……",
    };
  }

  if (!completed.has("m4_childhood_story") && mood >= 200 && affinity > 50) {
    return {
      triggered: "m4_childhood_story",
      bubbleText: "我……",
    };
  }

  if (!completed.has("m5_construction") && mood >= 300 && unlocked.construction) {
    return {
      triggered: "m5_construction",
      bubbleText: "这些图纸……也许可以派上用场。",
    };
  }

  if (!completed.has("m7_writing") && mood > 500 && affinity > 50) {
    return {
      triggered: "m7_writing",
      bubbleText: "我想写故事……",
    };
  }

  return { triggered: null, bubbleText: null };
}

/**
 * 应用里程碑完成后的奖励变化。
 * 返回需要合并到 state 的 partial。
 */
export function applyMilestoneReward(
  milestone: MilestoneId,
  currentState: OmegaState
): Partial<OmegaState> {
  const completed = new Set(currentState.completedMilestones ?? []);
  completed.add(milestone);

  const partial: Partial<OmegaState> = {
    completedMilestones: [...completed],
    pendingMilestoneEvent: null,
  };

  switch (milestone) {
    case "m1_first_greeting":
      partial.mood = Math.min(1000, (currentState.mood ?? 0) + 5);
      partial.affinity = (currentState.affinity ?? 0) + 1;
      partial.emotion = "calm_positive";
      partial.lastGreetingTime = Date.now();
      break;
    case "m2_clean_capsule":
      partial.capsuleBackgroundDirty = false;
      partial.emotion = "proud";
      break;
    case "m3_show_world":
      partial.mood = Math.min(1000, (currentState.mood ?? 0) + 10);
      partial.affinity = (currentState.affinity ?? 0) + 2;
      partial.emotion = "happy";
      break;
    case "m4_childhood_story":
      partial.mood = Math.min(1000, (currentState.mood ?? 0) + 10);
      partial.affinity = (currentState.affinity ?? 0) + 2;
      partial.emotion = "calm_positive";
      break;
    case "m5_construction":
      partial.mood = Math.min(1000, (currentState.mood ?? 0) + 10);
      partial.emotion = "proud";
      break;
    case "m7_writing":
      partial.mood = Math.min(1000, (currentState.mood ?? 0) + 20);
      partial.affinity = (currentState.affinity ?? 0) + 5;
      partial.emotion = "calm_positive";
      partial.unlocked = {
        ...(currentState.unlocked ?? {}),
        bookshelf: true,
        writing: true,
      };
      break;
    default:
      break;
  }

  return partial;
}
