/**
 * Ω 待机行为概率调度系统
 *
 * 根据心境值、好感度、解锁状态，按概率权重选取当前行为，
 * 并返回该行为的持续时长（ms）。
 */

import type { OmegaIdleAction, OmegaState } from "../types";

/** 单个行为的权重配置 */
type WeightEntry = {
  action: OmegaIdleAction;
  weight: number;
  duration: number; // ms
};

/* ---------- 各行为的基准时长 ---------- */
const DURATIONS: Record<OmegaIdleAction, number> = {
  follow_mouse: 5 * 60_000,
  stare: 2 * 60_000,
  read: 2 * 60_000,
  write: 2 * 60_000,
  water_plants: 1 * 60_000,
  wooden_sign: 5 * 60_000,
  sleep: 1 * 60_000,
};

/**
 * 加权随机选取一个行为。
 * 返回 { action, duration }，或 null（没有可用的行为时）。
 */
export function pickIdleAction(state: OmegaState): {
  action: OmegaIdleAction;
  duration: number;
} {
  const weights = buildWeights(state);
  const totalWeight = weights.reduce((sum, e) => sum + e.weight, 0);
  if (totalWeight <= 0) {
    // fallback: 发呆
    return { action: "stare", duration: DURATIONS.stare };
  }

  let roll = Math.random() * totalWeight;
  for (const entry of weights) {
    roll -= entry.weight;
    if (roll <= 0) {
      return { action: entry.action, duration: entry.duration };
    }
  }

  // safety fallback
  return { action: "stare", duration: DURATIONS.stare };
}

/**
 * 判断当前待机行为是否已经到期。
 */
export function isIdleActionExpired(
  state: OmegaState,
  now: number = Date.now()
): boolean {
  return now - state.idleActionStart >= state.idleActionDuration;
}

/** 检查低心境限制：心境 < 15 时大部分交互被阻止 */
export function isLowMood(state: OmegaState): boolean {
  return state.mood < 15;
}

/** 根据亲密度数值返回档位 */
export function getAffectionLevel(affinity: number): "low" | "medium" | "high" {
  if (affinity >= 50) return "high";
  if (affinity >= 20) return "medium";
  return "low";
}

/* ---- 内部：构造概率权重表 ---- */

function buildWeights(state: OmegaState): WeightEntry[] {
  const { mood, unlocked, currentMode } = state;
  const hasConstruction = unlocked.construction;

  // 专注模式：固定行为循环
  if (currentMode === "focus") {
    const focusActions: OmegaIdleAction[] = ["stare", "read", "write", "water_plants"];
    const focusDurations: Record<string, number> = {
      stare: 2 * 60_000,
      read: 5 * 60_000,
      write: 5 * 60_000,
      water_plants: 1 * 60_000,
    };
    return focusActions.map((action) => ({
      action,
      weight: 25, // 均匀分布
      duration: focusDurations[action] ?? 2 * 60_000,
    }));
  }

  if (mood < 50) {
    // 低心境：只有盯鼠标和发呆
    return [
      { action: "follow_mouse", weight: 50, duration: DURATIONS.follow_mouse },
      { action: "stare", weight: 50, duration: DURATIONS.stare },
    ];
  }

  // 高心境（>= 50）基线概率
  const entries: WeightEntry[] = [
    { action: "follow_mouse", weight: 40, duration: DURATIONS.follow_mouse },
    { action: "stare", weight: 10, duration: 1 * 60_000 }, // 高心境发呆只有1min
  ];

  // 已解锁的活动平分剩余 50%
  const leisureActions: OmegaIdleAction[] = [];
  if (unlocked.bookshelf || unlocked.writing) {
    // 书橱和写作解锁后可用 read/write
    leisureActions.push("read", "write");
  }
  if (mood >= 50) {
    // 浇花默认可用（解锁条件是心境>=50）
    leisureActions.push("water_plants");
  }

  if (leisureActions.length > 0) {
    const share = Math.floor(50 / leisureActions.length);
    for (const action of leisureActions) {
      entries.push({ action, weight: share, duration: DURATIONS[action] });
    }
  } else {
    // 什么都没解锁时全部归到看书（默认行为）
    entries.push({ action: "read", weight: 50, duration: DURATIONS.read });
  }

  // 有建筑项目且心境 >= 100：木牌行为占用一部分概率
  if (hasConstruction && mood >= 100) {
    // 重新分配: wooden_sign 40%, 原有的 follow_mouse 减半, 休闲减半
    const woodEntries: WeightEntry[] = [
      { action: "wooden_sign", weight: 40, duration: DURATIONS.wooden_sign },
      { action: "follow_mouse", weight: 20, duration: DURATIONS.follow_mouse },
    ];
    // 休闲类平分剩余 40%
    const remainingLeisure = [...leisureActions];
    if (remainingLeisure.length === 0) remainingLeisure.push("read");
    const leisureShare = Math.floor(40 / remainingLeisure.length);
    for (const action of remainingLeisure) {
      woodEntries.push({
        action,
        weight: leisureShare,
        duration: DURATIONS[action],
      });
    }
    return woodEntries;
  }

  return entries;
}
