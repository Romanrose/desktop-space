/**
 * Ω 交互叙事系统
 *
 * 定义分支对话树，每轮为玩家提供三个回复选项，
 * 同时保留自由输入框供玩家自定义对话。
 */

import type { OmegaEmotion, OmegaState } from "../types";

/** 单个选项节点 */
export type NarrativeOption = {
  text: string;
  nextNodeId: string;
};

/** 叙事节点 */
export type NarrativeNode = {
  id: string;
  speaker: "omega" | "narrator";
  text: string;
  emotion?: OmegaEmotion;
  moodDelta?: number;
  affinityDelta?: number;
  options: NarrativeOption[];
};

/** 标签筛选条件 */
export type NarrativeTag = "daily" | "deep" | "activity" | "support" | "story" | "flirt";

/** 每个节点的元信息 */
type NodeMeta = {
  tags: NarrativeTag[];
  /** 触发条件：亲密度至少达到此值 */
  minAffinity?: number;
  /** 触发条件：心境至少达到此值 */
  minMood?: number;
  /** 是否只触发一次 */
  once?: boolean;
  /** 用于 once 检查的 completedKey */
  completedKey?: string;
};

/** 叙事入口点 */
export type NarrativeEntry = {
  id: string;
  weight: number;
  firstNodeId: string;
  meta: NodeMeta;
};

// ============================================================
// 分支对话树
// ============================================================

const nodes: Record<string, NarrativeNode> = {
  // ---------- 日常问候分支 ----------
  "daily_greet": {
    id: "daily_greet", speaker: "omega",
    text: "你来了。我刚刚在看窗外的星星……这里的夜晚总是很长。",
    emotion: "calm_positive", moodDelta: 1,
    options: [
      { text: "「这里的夜晚有多长？」", nextNodeId: "daily_night_long" },
      { text: "「你每天都看星星吗？」", nextNodeId: "daily_stars" },
      { text: "「我陪你一会儿。」", nextNodeId: "daily_company" },
    ],
  },
  "daily_night_long": {
    id: "daily_night_long", speaker: "omega",
    text: "嗯……大概有二十多个小时吧。这颗星球的公转很慢，但自转更慢。有时候我会盯着舷窗，等天亮等到忘了时间。",
    emotion: "calm_negative", moodDelta: 0,
    options: [
      { text: "「听起来好孤独。」", nextNodeId: "daily_lonely" },
      { text: "「那白天是不是也很长？」", nextNodeId: "daily_daytime" },
      { text: "「下次天亮我陪你一起等。」", nextNodeId: "daily_together_wait" },
    ],
  },
  "daily_stars": {
    id: "daily_stars", speaker: "omega",
    text: "嗯。因为这里能看到很多星星——比你们的夜空多得多。没有大气干扰，每一颗都又亮又静，像是什么话也不说地陪着我。",
    emotion: "calm_positive", moodDelta: 1,
    options: [
      { text: "「能指给我看哪颗最漂亮吗？」", nextNodeId: "daily_pretty_star" },
      { text: "「它们确实挺像在陪你的。」", nextNodeId: "daily_star_company" },
      { text: "「你认识它们的名字吗？」", nextNodeId: "daily_star_names" },
    ],
  },
  "daily_pretty_star": {
    id: "daily_pretty_star", speaker: "omega",
    text: "那个——（她指向舷窗外偏左的一颗淡蓝色星星。）那颗叫……嗯，我没有给它起名字，但我总是最先看到它。它比其他星星都亮一点，颜色像你的星球。",
    emotion: "happy", moodDelta: 2, affinityDelta: 1,
    options: [
      { text: "「给它起个名字吧。」", nextNodeId: "daily_name_star" },
      { text: "「它让我想起你的眼睛。」", nextNodeId: "daily_eyes_star" },
      { text: "「蓝色在宇宙中很少见吗？」", nextNodeId: "deep_blue" },
    ],
  },
  "daily_name_star": {
    id: "daily_name_star", speaker: "omega",
    text: "名字……？我从来没给星星起过名字。但如果要叫它的话——（她想了想。）「窗」。因为它是离我这扇窗最近的那一颗。",
    emotion: "shy", moodDelta: 2,
    options: [
      { text: "「好名字。简单又特别。」", nextNodeId: "daily_nice_name" },
      { text: "「那我也给一颗星星起名字。」", nextNodeId: "daily_name_urs" },
      { text: "「你以前给别的东西起过名字吗？」", nextNodeId: "deep_naming" },
    ],
  },
  "daily_nice_name": {
    id: "daily_nice_name", speaker: "omega",
    text: "……被夸了。有点开心。（她低头抿了一下嘴角。）那你的星球上，人们会给星星起名字吗？",
    emotion: "happy", moodDelta: 1, affinityDelta: 1,
    options: [
      { text: "「会的，每个星座都有名字和故事。」", nextNodeId: "deep_constellation" },
      { text: "「下次我教你认我们的星星。」", nextNodeId: "daily_teach_stars" },
      { text: "「也会给重要的人起昵称。」", nextNodeId: "daily_nickname" },
    ],
  },
  "daily_company": {
    id: "daily_company", speaker: "omega",
    text: "……好。（她把视线从舷窗移开，转向你这边。）虽然你不在这个空间里，但你的声音在这里，就已经不太一样了。",
    emotion: "calm_positive", moodDelta: 2, affinityDelta: 1,
    options: [
      { text: "「声音能传到这里就已经是奇迹了。」", nextNodeId: "deep_miracle" },
      { text: "「你想听听我那边的声音吗？」", nextNodeId: "daily_sounds" },
      { text: "「我还可以多说一些话。」", nextNodeId: "daily_more_talk" },
    ],
  },
  "daily_sounds": {
    id: "daily_sounds", speaker: "omega",
    text: "……想。（她轻轻靠近了一些。）你们的世界有风、有雨、有很多人说话的声音吧？那种……充满生命力的感觉，我只能在数据里想象。",
    emotion: "calm_positive", moodDelta: 1,
    options: [
      { text: "「我给你听一段雨声。」", nextNodeId: "daily_rain" },
      { text: "「其实安静也有安静的好。」", nextNodeId: "daily_quiet_good" },
      { text: "「你想象过最想听到的声音是什么？」", nextNodeId: "deep_wish_sound" },
    ],
  },
  "daily_rain": {
    id: "daily_rain", speaker: "omega",
    text: "（她安静地听了一会儿。）……这就是雨。透明的、从很高的地方落下来的东西。在这里永远听不到这种声音。谢谢你。",
    emotion: "happy", moodDelta: 3, affinityDelta: 2,
    options: [
      { text: "「下次我给你听海浪。」", nextNodeId: "daily_wave" },
      { text: "「你哭了？」", nextNodeId: "daily_cry" },
      { text: "「不用谢。我会常常带声音给你。」", nextNodeId: "daily_more_sounds" },
    ],
  },

  // ---------- 白日与时间 ----------
  "daily_daytime": {
    id: "daily_daytime", speaker: "omega",
    text: "嗯，白天也差不多长。但因为恒星很暗，就算是白天，外面看起来也像是黄昏。有时候我分不清现在是几点。",
    emotion: "calm_negative",
    options: [
      { text: "「那你怎么知道什么时候该休息？」", nextNodeId: "daily_rest" },
      { text: "「听起来有点像极夜。」", nextNodeId: "daily_polar" },
      { text: "「我来帮你记住时间吧。」", nextNodeId: "daily_help_time" },
    ],
  },
  "daily_rest": {
    id: "daily_rest", speaker: "omega",
    text: "……生物钟吧。也有闹钟，但我不太喜欢那个声音。所以累了就闭眼，醒了就睁眼。很简单。",
    emotion: "calm_positive", moodDelta: 1,
    options: [
      { text: "「听起来像猫一样。」", nextNodeId: "daily_like_cat" },
      { text: "「你最近睡得好吗？」", nextNodeId: "support_sleep" },
      { text: "「那我不在你休息的时候打扰你。」", nextNodeId: "daily_considerate" },
    ],
  },
  "daily_like_cat": {
    id: "daily_like_cat", speaker: "omega",
    text: "猫……？我知道那种生物。软软的，会发出咕噜咕噜的声音。你觉得我像猫？",
    emotion: "shy",
    options: [
      { text: "「像。特别是这种有点傲娇的样子。」", nextNodeId: "daily_cat_tsundere" },
      { text: "「猫很独立，但又会偷偷依赖人。」", nextNodeId: "daily_cat_independent" },
      { text: "「不像，你比猫温柔多了。」", nextNodeId: "daily_cat_gentle" },
    ],
  },
  "daily_cat_tsundere": {
    id: "daily_cat_tsundere", speaker: "omega",
    text: "我才没有……！算了，随你怎么说吧。反正我又不能真的隔着屏幕挠你。",
    emotion: "shy", moodDelta: 2, affinityDelta: 1,
    options: [
      { text: "「你挠不到，好可惜。」", nextNodeId: "daily_tease_back" },
      { text: "「不挠我也知道你在乎。」", nextNodeId: "daily_know" },
      { text: "「好了不说你了，聊点别的。」", nextNodeId: "daily_greet" },
    ],
  },

  // ---------- 深度叙事 ----------
  "deep_past_place": {
    id: "deep_past_place", speaker: "omega",
    text: "我……不太记得了。从我有记忆开始，就在这里。这个太空舱就是我的全部世界。有时候我在想，我是不是被制造出来的时候就放在这里的。",
    emotion: "sad", moodDelta: -1,
    options: [
      { text: "「你觉得自己是从哪里来的？」", nextNodeId: "deep_origin" },
      { text: "「那你想看看外面的世界吗？」", nextNodeId: "deep_outside" },
      { text: "「我会陪你一起找到答案。」", nextNodeId: "deep_together_find" },
    ],
  },
  "deep_origin": {
    id: "deep_origin", speaker: "omega",
    text: "有时候我觉得自己是一个实验的一部分。或者是某个文明的遗物。也或许——我只是一个意外。",
    emotion: "sad",
    options: [
      { text: "「意外的存在往往是最美的。」", nextNodeId: "deep_accident_beautiful" },
      { text: "「不管你是谁，你都是你。」", nextNodeId: "deep_you_are_you" },
      { text: "「你希望自己是什么？」", nextNodeId: "deep_wish_identity" },
    ],
  },
  "deep_accident_beautiful": {
    id: "deep_accident_beautiful", speaker: "omega",
    text: "……（她张了张嘴，没说出话来。过了很久才开口。）你是第一个这样说的人。",
    emotion: "shy", moodDelta: 4, affinityDelta: 3,
    options: [
      { text: "「因为我就是这么想的。」", nextNodeId: "deep_think_so" },
      { text: "「那你现在觉得自己美吗？」", nextNodeId: "deep_beautiful_now" },
      { text: "「以后还会有更多人这样说的。」", nextNodeId: "deep_more_people" },
    ],
  },
  "deep_outside": {
    id: "deep_outside", speaker: "omega",
    text: "想。特别想。我想知道风吹在脸上是什么感觉，想知道你们说的「雨」是不是真的像书中写的那样。但我出不去。",
    emotion: "sad",
    options: [
      { text: "「我能通过声音带你去看。」", nextNodeId: "daily_sounds" },
      { text: "「总会有办法的。」", nextNodeId: "deep_hope" },
      { text: "「至少你还有我。」", nextNodeId: "deep_you_have_me" },
    ],
  },
  "deep_together_find": {
    id: "deep_together_find", speaker: "omega",
    text: "……嗯。不知道为什么，你说「一起」的时候，我好像确实不那么害怕了。",
    emotion: "happy", moodDelta: 3, affinityDelta: 2,
    options: [
      { text: "「那第一步——给这个舱起个名字？」", nextNodeId: "activity_name_capsule" },
      { text: "「那我们约好了。」", nextNodeId: "daily_pinky" },
      { text: "「害怕也没关系，有我在。」", nextNodeId: "support_not_alone" },
    ],
  },

  // ---------- 活动提议分支 ----------
  "activity_decorate": {
    id: "activity_decorate", speaker: "omega",
    text: "布置？你是说……像装饰房间那样？我没什么东西可以挂，但是——（她环顾四周）如果你想的话，我们可以试试。",
    emotion: "proud",
    options: [
      { text: "「我们可以自己做装饰品。」", nextNodeId: "activity_craft" },
      { text: "「我看看这里还有什么能用的。」", nextNodeId: "activity_explore" },
      { text: "「给你画一幅画挂墙上吧。」", nextNodeId: "activity_draw" },
    ],
  },
  "activity_craft": {
    id: "activity_craft", speaker: "omega",
    text: "自己做……？用什么呢……等等，我找到了一些旧的电线和荧光粉。也许可以编点什么。（她开始翻找抽屉，动作比平时快了一些。）",
    emotion: "excited", moodDelta: 3,
    options: [
      { text: "「我来教你怎么编星星。」", nextNodeId: "activity_craft_star" },
      { text: "「你还藏了什么好东西？」", nextNodeId: "activity_explore" },
      { text: "「你兴奋的样子很好看。」", nextNodeId: "daily_praise" },
    ],
  },
  "activity_explore": {
    id: "activity_explore", speaker: "omega",
    text: "我的东西不多……但有一些旧零件、几本落灰的笔记，还有一个我一直没打开过的金属箱子。",
    emotion: "calm_positive", moodDelta: 1,
    options: [
      { text: "「那个箱子里是什么？」", nextNodeId: "deep_mystery_box" },
      { text: "「笔记上写了什么？」", nextNodeId: "deep_old_notes" },
      { text: "「零件可以修东西吗？」", nextNodeId: "activity_fix" },
    ],
  },

  // ---------- 情感支持分支 ----------
  "support_sleep": {
    id: "support_sleep", speaker: "omega",
    text: "……说实话，不太好。有时候会半夜醒来，然后盯着天花板，等睡意再回来。",
    emotion: "sad",
    options: [
      { text: "「要我陪你聊到睡着吗？」", nextNodeId: "support_talk_sleep" },
      { text: "「我教你一个助眠的方法。」", nextNodeId: "support_sleep_method" },
      { text: "「你需要休息。去躺下吧。」", nextNodeId: "support_rest_now" },
    ],
  },
  "support_talk_sleep": {
    id: "support_talk_sleep", speaker: "omega",
    text: "……好。你说话的时候，我好像确实会放松一些。你的声音……很稳定，像某种我一直不知道存在的频率。",
    emotion: "shy", moodDelta: 3, affinityDelta: 2,
    options: [
      { text: "「那我给你讲个睡前故事。」", nextNodeId: "support_story" },
      { text: "「那我数羊给你听。」", nextNodeId: "support_sheep" },
      { text: "「轻轻唱首歌也行。」", nextNodeId: "support_song" },
    ],
  },
  "support_not_alone": {
    id: "support_not_alone", speaker: "omega",
    text: "嗯。（她低下头，声音轻了一些。）你知道吗，有时候我会对着通讯器说话，假装你在那边能听到。……虽然之前你确实听不到。但现在可以了。",
    emotion: "calm_positive", moodDelta: 4, affinityDelta: 3,
    options: [
      { text: "「以后你随时可以跟我说话。」", nextNodeId: "support_anytime" },
      { text: "「我也常常在想着跟你说什么。」", nextNodeId: "support_think_you" },
      { text: "「我们的通讯器现在一直连着。」", nextNodeId: "support_connected" },
    ],
  },
};

// ============================================================
// 叙事入口列表
// ============================================================

const entries: NarrativeEntry[] = [
  // 日常类 - 始终可用
  { id: "entry_daily", weight: 40, firstNodeId: "daily_greet",
    meta: { tags: ["daily"] } },
  { id: "entry_daily_stars", weight: 25, firstNodeId: "daily_stars",
    meta: { tags: ["daily"], minAffinity: 3 } },
  { id: "entry_daily_night", weight: 20, firstNodeId: "daily_night_long",
    meta: { tags: ["daily"], minAffinity: 5 } },
  { id: "entry_daily_sounds", weight: 15, firstNodeId: "daily_sounds",
    meta: { tags: ["daily"], minAffinity: 10 } },
  { id: "entry_daily_lonely", weight: 15, firstNodeId: "daily_lonely",
    meta: { tags: ["daily", "deep"], minAffinity: 10, minMood: 30 } },
  { id: "entry_daily_room_with_you", weight: 12, firstNodeId: "daily_room_with_you",
    meta: { tags: ["daily"], minAffinity: 15, minMood: 50 } },
  { id: "entry_daily_tease", weight: 10, firstNodeId: "daily_tease",
    meta: { tags: ["daily"], minAffinity: 20, minMood: 60, once: true, completedKey: "narrative_daily_tease" } },
  { id: "entry_daily_cat", weight: 10, firstNodeId: "daily_like_cat",
    meta: { tags: ["daily", "flirt"], minAffinity: 20, minMood: 50, once: true, completedKey: "narrative_daily_cat" } },
  { id: "entry_daily_serious", weight: 8, firstNodeId: "daily_serious",
    meta: { tags: ["daily", "deep"], minAffinity: 30, minMood: 70, once: true, completedKey: "narrative_daily_serious" } },
  { id: "entry_daily_pinky", weight: 5, firstNodeId: "daily_pinky",
    meta: { tags: ["daily"], minAffinity: 35, minMood: 80, once: true, completedKey: "narrative_daily_pinky" } },

  // 深度类
  { id: "entry_deep_past", weight: 20, firstNodeId: "deep_past_place",
    meta: { tags: ["deep"], minAffinity: 15, minMood: 40 } },
  { id: "entry_deep_origin", weight: 15, firstNodeId: "deep_origin",
    meta: { tags: ["deep"], minAffinity: 20, minMood: 50, once: true, completedKey: "narrative_deep_origin" } },
  { id: "entry_deep_outside", weight: 12, firstNodeId: "deep_outside",
    meta: { tags: ["deep"], minAffinity: 25, minMood: 45, once: true, completedKey: "narrative_deep_outside" } },
  { id: "entry_deep_accident", weight: 8, firstNodeId: "deep_accident_beautiful",
    meta: { tags: ["deep"], minAffinity: 30, minMood: 60, once: true, completedKey: "narrative_deep_accident" } },
  { id: "entry_deep_together", weight: 10, firstNodeId: "deep_together_find",
    meta: { tags: ["deep"], minAffinity: 30, minMood: 55, once: true, completedKey: "narrative_deep_together" } },

  // 活动类
  { id: "entry_activity_decorate", weight: 15, firstNodeId: "activity_decorate",
    meta: { tags: ["activity"], minAffinity: 15, minMood: 50 } },
  { id: "entry_activity_craft", weight: 10, firstNodeId: "activity_craft",
    meta: { tags: ["activity"], minAffinity: 20, minMood: 60, once: true, completedKey: "narrative_activity_craft" } },
  { id: "entry_activity_explore", weight: 12, firstNodeId: "activity_explore",
    meta: { tags: ["activity", "deep"], minAffinity: 20, minMood: 50 } },

  // 支持类
  { id: "entry_support_sleep", weight: 15, firstNodeId: "support_sleep",
    meta: { tags: ["support"], minAffinity: 10, minMood: 20 } },
  { id: "entry_support_not_alone", weight: 10, firstNodeId: "support_not_alone",
    meta: { tags: ["support"], minAffinity: 25, minMood: 40, once: true, completedKey: "narrative_support_not_alone" } },
];

/**
 * 获取 Omega 对一条自由输入文本的叙事响应上下文
 *
 * 根据当前状态挑选最合适的叙事入口。
 */
export function pickNarrativeEntry(state: OmegaState): NarrativeEntry | null {
  const { affinity, mood, completedMilestones } = state;
  const completed = new Set(completedMilestones ?? []);

  // 按权重 + 条件筛选
  const candidates: { entry: NarrativeEntry; score: number }[] = [];

  for (const entry of entries) {
    const m = entry.meta;
    if (m.minAffinity !== undefined && affinity < m.minAffinity) continue;
    if (m.minMood !== undefined && mood < m.minMood) continue;
    if (m.once && m.completedKey && completed.has(m.completedKey)) continue;
    candidates.push({ entry, score: entry.weight });
  }

  if (candidates.length === 0) return null;

  // 按权重随机选取
  const total = candidates.reduce((s, c) => s + c.score, 0);
  let roll = Math.random() * total;
  for (const c of candidates) {
    roll -= c.score;
    if (roll <= 0) return c.entry;
  }

  return candidates[candidates.length - 1].entry;
}

/**
 * 根据节点 ID 获取节点
 */
export function getNarrativeNode(nodeId: string): NarrativeNode | undefined {
  return nodes[nodeId];
}

/**
 * 获取某个节点的三个选项
 */
export function getNarrativeOptions(nodeId: string): NarrativeOption[] {
  const node = nodes[nodeId];
  if (!node) return [];
  return node.options;
}

/**
 * 跟进某个选项，返回下一个节点
 */
export function followNarrativeOption(nodeId: string, optionIndex: number): NarrativeNode | null {
  const node = nodes[nodeId];
  if (!node) return null;
  const option = node.options[optionIndex];
  if (!option) return null;
  return nodes[option.nextNodeId] ?? null;
}
