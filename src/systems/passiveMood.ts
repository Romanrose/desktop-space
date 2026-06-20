/**
 * 被动心境值增长系统
 *
 * 1. 累计游玩时长 → +2 心境值/h
 * 2. 已装备的装饰品 → +X 心境值/h（效果文本含"+X心境值/h"的物品）
 *
 * 在 App 加载时和每 30 分钟检查一次。
 */

import type { OmegaState } from "../types";
import { ALL_RECIPES } from "../systems/crafting";

/** 基础离线时长收益率：+2 mood/h */
const BASE_MOOD_PER_HOUR = 2;

/** 解析效果文本中的"心境值/h"数值 */
function parseHourlyBonus(effect: string): number {
  const match = effect.match(/\+(\d+)心境值\/h/);
  return match ? parseInt(match[1], 10) : 0;
}

/** 计算当前所有已装备装饰品的心境值/h 总和 */
export function getDecorationMoodBonus(equipped: Record<string, string>): number {
  let total = 0;
  for (const recipeId of Object.values(equipped)) {
    const recipe = ALL_RECIPES.find((r) => r.id === recipeId);
    if (recipe) {
      total += parseHourlyBonus(recipe.effect);
    }
  }
  return total;
}

/** 计算从上次活跃到现在的总增益 */
export function calculatePassiveMoodGain(
  state: OmegaState,
  now: number = Date.now()
): { gain: number; message: string | null } {
  const elapsedMs = now - (state.lastActiveTime ?? state.sessionStartTime ?? now);
  const elapsedHours = elapsedMs / 3600_000;

  // 至少 1 小时才有收益
  if (elapsedHours < 1) return { gain: 0, message: null };

  const baseGain = Math.floor(elapsedHours) * BASE_MOOD_PER_HOUR;
  const decorBonus = getDecorationMoodBonus(state.equippedDecorations ?? {});
  const decorGain = Math.floor(elapsedHours) * decorBonus;
  const totalGain = baseGain + decorGain;

  const decorLabel = decorBonus > 0 ? `（含装饰加成 +${decorBonus}/h）` : "";

  return {
    gain: totalGain,
    message:
      totalGain > 0
        ? `你不在的时候，Ω平静地度过了 ${Math.floor(elapsedHours)} 小时。心境值 +${totalGain}${decorLabel}`
        : null,
  };
}

/** 应用被动心境值增长到 state */
export function applyPassiveMoodGain(
  state: OmegaState,
  now: number = Date.now()
): Partial<OmegaState> & { _message?: string | null } {
  const result = calculatePassiveMoodGain(state, now);
  if (result.gain === 0) return { lastActiveTime: now, _message: null };

  return {
    mood: Math.min(1000, (state.mood ?? 0) + result.gain),
    lastActiveTime: now,
    _message: result.message,
  };
}
