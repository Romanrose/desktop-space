/**
 * 被动心境值增长系统
 *
 * 1. 累计游戏时长 → +2 心境值/h
 *    在线时每分钟 tick，离线时整额补算
 * 2. 已装备的装饰品 → +X 心境值/h（效果文本含"+X心境值/h"的物品）
 *
 * 在线 tick 每 60 秒发放一次（精确小数），
 * 离线补算在 App 加载时执行（仅超 1 小时才计入）。
 */

import type { OmegaState } from "../types";
import { ALL_RECIPES } from "../systems/crafting";

/** 基础离线时长收益率：+2 mood/h */
const BASE_MOOD_PER_HOUR = 2;

/** 在线增长与离线相同费率，但每分钟按小数精度发放 */
const TICK_INTERVAL_MS = 60_000; // 1 分钟

/** 解析效果文本中的"心境值/h"数值 */
function parseHourlyBonus(effect: string): number {
  const match = effect.match(/\+(\d+)心境值\/h/);
  return match ? parseInt(match[1], 10) : 0;
}

/** 计算当前所有已装备装饰品的心境值/h 总和（导出用于展示） */
export function getDecorationMoodBonus(
  equipped: Record<string, string>
): number {
  let total = 0;
  for (const recipeId of Object.values(equipped)) {
    const recipe = ALL_RECIPES.find((r) => r.id === recipeId);
    if (recipe) total += parseHourlyBonus(recipe.effect);
  }
  return total;
}

/** 离线补算：仅在超过 1 小时时生效，用于重新打开应用时追算离线收益 */
export function calculatePassiveMoodGain(
  state: OmegaState,
  now: number = Date.now()
): { gain: number; message: string | null } {
  const elapsedMs = now - (state.lastActiveTime ?? state.sessionStartTime ?? now);
  const elapsedHours = elapsedMs / 3600_000;

  if (elapsedHours < 1) return { gain: 0, message: null };

  const baseGain = Math.floor(elapsedHours) * BASE_MOOD_PER_HOUR;
  const decorBonus = getDecorationMoodBonus(state.equippedDecorations ?? {});
  const decorGain = Math.floor(elapsedHours) * decorBonus;
  const totalGain = baseGain + decorGain;

  const decorLabel =
    decorBonus > 0 ? `（含装饰加成 +${decorBonus}/h）` : "";

  return {
    gain: totalGain,
    message:
      totalGain > 0
        ? `你不在的时候，Ω平静地度过了 ${Math.floor(elapsedHours)} 小时。心境值 +${totalGain}${decorLabel}`
        : null,
  };
}

/** 在线 tick：按精确小数计算从上一次 tick 以来的增幅（无 1 小时门槛） */
export function calculateOnlineMoodTick(
  state: OmegaState,
  now: number = Date.now()
): { gain: number } {
  const elapsedMs = now - (state.lastActiveTime ?? state.sessionStartTime ?? now);
  if (elapsedMs < TICK_INTERVAL_MS / 2) return { gain: 0 }; // 半分钟防抖
  const elapsedHours = elapsedMs / 3600_000;
  const hourlyRate =
    BASE_MOOD_PER_HOUR + getDecorationMoodBonus(state.equippedDecorations ?? {});
  const gain = Math.max(0, elapsedHours * hourlyRate);
  return { gain };
}

/** 应用在线 tick 到 state */
export function applyOnlineMoodTick(
  state: OmegaState,
  now: number = Date.now()
): Partial<OmegaState> {
  const { gain } = calculateOnlineMoodTick(state, now);
  if (gain === 0) return { lastActiveTime: now };
  return {
    mood: Math.min(1000, (state.mood ?? 0) + gain),
    lastActiveTime: now,
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
