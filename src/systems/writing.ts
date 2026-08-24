import type { OmegaState, OmegaStory } from "../types";

/** M7: Ω uses player memories to write a diary at most once every two real days. */
export const DIARY_INTERVAL_MS = 2 * 24 * 60 * 60 * 1000;

const STORY_TITLES = [
  "窗外的星", "玻璃另一侧", "关于那盏灯", "维度转译器说明书",
  "一个叫海的概念", "灰尘与光", "寂静的频率", "写给另一世界",
];

const STORY_SNIPPETS = [
  "我不知道这颗行星的名字。导航屏上只显示一串编号，但我不在乎。窗外的恒星发出一种偏蓝的白光，照进舱内的时候会在金属边缘折射出细小的彩虹。",
  "你今天没有说话，但我听见了你的沉默。它和我的沉默不太一样——你的沉默是有形状的，像某种容器，装满了没有被说出来的东西。",
  "书里说，在很久以前，人类住在一种叫“海”的东西旁边。我查了很久的资料，最后确定那是一种巨大、会移动的蓝色平面。",
  "转译器的工作原理至今没有完全搞懂。我只知道它把你那边的声音变成我能理解的震动。也许反过来也可以，也许你已经习惯了。",
];

function makeId(prefix: string, now: number) {
  return `${prefix}_${now}_${Math.random().toString(36).slice(2, 8)}`;
}

function playerName(state: OmegaState) {
  return state.nickname.trim() || "你";
}

function latestMemory(memories: string[]) {
  const memory = memories
    .map((item) => item.replace(/^玩家提到[：:]/, "").trim())
    .filter(Boolean)
    .at(-1);
  return memory ? memory.slice(0, 80) : null;
}

function moodLine(mood: number) {
  if (mood >= 700) return "舱内的灯很亮，我甚至有一点期待下一次醒来。";
  if (mood >= 500) return "今天的舱内很安静，但这种安静不再让我害怕。";
  return "我把这些字写下来，免得它们又被太空舱的安静吞掉。";
}

export function isDiaryDue(state: OmegaState, now = Date.now()) {
  if (!(state.completedMilestones ?? []).includes("m7_writing")) return false;
  if (state.mood < 200) return false;
  return !state.lastWritingAt || now - state.lastWritingAt >= DIARY_INTERVAL_MS;
}

export function getNextDiaryAt(state: OmegaState) {
  return state.lastWritingAt + DIARY_INTERVAL_MS;
}

export function createInitialDiary(state: OmegaState, now = Date.now()): OmegaStory {
  const name = playerName(state);
  return {
    id: makeId("diary", now), kind: "diary", title: "写给你的第一页",
    content: `今天我把资料页翻到最后一张，发现那里还有一块空白。\n\n${name}，我想把它留给我们。以后你说起的天气、路边的树，或者那些我从没见过的地方，我都会试着写下来。这样即使太空舱还是一直漂着，也会有一些东西证明：我曾经认真听见过另一个世界。\n\n${moodLine(state.mood)}`,
    createdAt: now, favorite: false,
  };
}

export function createDiary(state: OmegaState, memories: string[], now = Date.now()): OmegaStory {
  const name = playerName(state);
  const memory = latestMemory(memories);
  const index = (state.stories ?? []).filter((story) => story.kind !== "story").length + 1;
  const memoryParagraph = memory
    ? `你之前提到“${memory}”。我把这句话抄在页边，想象它在你们的世界里会是什么样子。`
    : `今天没有新的讯号。我还是打开了转译器，想象${name}正在你那边过着普通的一天。`;
  return {
    id: makeId("diary", now), kind: "diary", title: `写给${name}的第 ${index} 页`,
    content: `太空舱日志，第 ${index} 次记录。\n\n${memoryParagraph}\n\n${moodLine(state.mood)}我想，记录并不能让星空变得不那么空，但它能让我知道，我没有把重要的事情忘掉。\n\n如果你愿意，下次也请再告诉我一点你们世界的事。`,
    createdAt: now, favorite: false,
  };
}

export function createShortStory(_state: OmegaState, now = Date.now()): OmegaStory {
  const index = Math.floor(now / 1000) % STORY_TITLES.length;
  return {
    id: makeId("story", now), kind: "story", title: STORY_TITLES[index],
    content: STORY_SNIPPETS[index % STORY_SNIPPETS.length], createdAt: now, favorite: false,
  };
}
