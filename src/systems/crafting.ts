/**
 * 合成机配方系统
 *
 * 管理合成配方数据、解锁条件检查和合成消耗。
 * 数据来自 合成机.xls。
 */

import type { OmegaState } from "../types";

/** 物品类别 */
export type CraftCategory =
  | "capsule_wallpaper"
  | "capsule_floor"
  | "capsule_furniture"
  | "capsule_shelf"
  | "capsule_bed"
  | "capsule_desk"
  | "capsule_desk_ornament"
  | "capsule_window"
  | "capsule_wall_decoration"
  | "room2_wallpaper"
  | "room2_floor"
  | "room2_decor"
  | "blueprint"
  | "material"
  | "function_item";

/** 单个配方 */
export type CraftRecipe = {
  id: string;
  name: string;
  category: CraftCategory;
  /** 显示用的类别标签 */
  categoryLabel: string;
  /** 消耗心境值 */
  costMood: number;
  /** 效果描述 */
  effect: string;
  /** 文案 */
  flavor: string;
  /** 解锁条件描述 */
  unlockCondition: string;
  /** 解锁检查函数 */
  isUnlocked: (state: OmegaState) => boolean;
  /** 合成后的效果回调（应用 buff 或解锁 flag） */
  apply: (state: OmegaState) => Partial<OmegaState>;
};

/* ---------- 合成机解锁检查辅助 ---------- */

function hasMilestone(state: OmegaState, m: string): boolean {
  return (state.completedMilestones ?? []).includes(m);
}

function hasPurchased(state: OmegaState, id: string): boolean {
  return (state.purchasedItems ?? []).includes(id);
}

/* ---------- 所有配方 ---------- */

export const ALL_RECIPES: CraftRecipe[] = [
  // === 太空舱美化（需 M2 清洁完成） ===
  {
    id: "capsule_wallpaper_1",
    name: "一整套新风格墙纸",
    category: "capsule_wallpaper",
    categoryLabel: "壁纸",
    costMood: 100,
    effect: "美化",
    flavor: "（等美工设计）",
    unlockCondition: "完成清洁太空舱任务",
    isUnlocked: (s) => hasMilestone(s, "m2_clean_capsule"),
    apply: () => ({ capsuleDecoration: { wallpaper: "style1" } }),
  },
  {
    id: "capsule_floor_1",
    name: "一整套新风格地板",
    category: "capsule_floor",
    categoryLabel: "地板",
    costMood: 100,
    effect: "美化",
    flavor: "（等美工设计）",
    unlockCondition: "完成清洁太空舱任务",
    isUnlocked: (s) => hasMilestone(s, "m2_clean_capsule"),
    apply: () => ({ capsuleDecoration: { floor: "style1" } }),
  },
  {
    id: "capsule_shelf_1",
    name: "一整套新风格书架",
    category: "capsule_shelf",
    categoryLabel: "书架",
    costMood: 100,
    effect: "美化",
    flavor: "（等美工设计）",
    unlockCondition: "完成清洁太空舱任务",
    isUnlocked: (s) => hasMilestone(s, "m2_clean_capsule"),
    apply: () => ({}),
  },
  {
    id: "capsule_desk_1",
    name: "一整套新风格书桌",
    category: "capsule_desk",
    categoryLabel: "书桌",
    costMood: 100,
    effect: "美化（悬浮窗美化）",
    flavor: "（等美工设计）",
    unlockCondition: "完成清洁太空舱任务",
    isUnlocked: (s) => hasMilestone(s, "m2_clean_capsule"),
    apply: () => ({}),
  },
  {
    id: "capsule_desk_2",
    name: "单独风格书桌1",
    category: "capsule_desk",
    categoryLabel: "书桌",
    costMood: 100,
    effect: "美化（悬浮窗美化）",
    flavor: "（等美工设计）",
    unlockCondition: "完成清洁太空舱任务",
    isUnlocked: (s) => hasMilestone(s, "m2_clean_capsule"),
    apply: () => ({}),
  },
  {
    id: "capsule_desk_3",
    name: "单独风格书桌2",
    category: "capsule_desk",
    categoryLabel: "书桌",
    costMood: 100,
    effect: "美化（悬浮窗美化）",
    flavor: "（等美工设计）",
    unlockCondition: "完成清洁太空舱任务",
    isUnlocked: (s) => hasMilestone(s, "m2_clean_capsule"),
    apply: () => ({}),
  },

  // === 书桌摆件（需 M2） ===
  {
    id: "desk_books",
    name: "一摞书",
    category: "capsule_desk_ornament",
    categoryLabel: "书桌摆件",
    costMood: 50,
    effect: "美化（悬浮窗美化）",
    flavor: "书籍是人类进步的阶梯。",
    unlockCondition: "完成清洁太空舱任务",
    isUnlocked: (s) => hasMilestone(s, "m2_clean_capsule"),
    apply: () => ({}),
  },
  {
    id: "desk_ornament",
    name: "可爱摆件",
    category: "capsule_desk_ornament",
    categoryLabel: "书桌摆件",
    costMood: 50,
    effect: "美化（悬浮窗美化）",
    flavor: "在桌子上摆喜欢的东西会让心情变好吗？",
    unlockCondition: "完成清洁太空舱任务",
    isUnlocked: (s) => hasMilestone(s, "m2_clean_capsule"),
    apply: () => ({}),
  },

  // === 功能物品 ===
  {
    id: "game_console",
    name: "游戏机",
    category: "function_item",
    categoryLabel: "功能",
    costMood: 100,
    effect: "功能解锁",
    flavor: "制造之后就可以打游戏了。",
    unlockCondition: "无",
    isUnlocked: () => true,
    apply: (s) => ({ unlocked: { ...s.unlocked, game: true } }),
  },
  {
    id: "planting_tools",
    name: "一些种子和一些种植工具",
    category: "function_item",
    categoryLabel: "功能",
    costMood: 50,
    effect: "种花动作解锁",
    flavor: "制造之后就可以种点什么了。",
    unlockCondition: "无",
    isUnlocked: () => true,
    apply: (s) => ({ unlocked: { ...s.unlocked, gardening: true } }),
  },

  // === 空间2扩建（需 M5） ===
  {
    id: "blueprint_expand",
    name: "太空舱扩建图纸",
    category: "blueprint",
    categoryLabel: "图纸",
    costMood: 50,
    effect: "解锁扩建材料和工具",
    flavor: "太空舱的扩建图纸。",
    unlockCondition: "心境值首次达到300",
    isUnlocked: (s) => hasMilestone(s, "m5_construction"),
    apply: (s) => ({ unlocked: { ...s.unlocked, construction: true } }),
  },
  {
    id: "material_tools",
    name: "扩建工具",
    category: "material",
    categoryLabel: "材料",
    costMood: 50,
    effect: "扩建必须",
    flavor: "一些工具及其使用说明书。",
    unlockCondition: "购买太空舱扩建图纸",
    isUnlocked: (s) => hasPurchased(s, "blueprint_expand"),
    apply: (s) => {
      // 检查是否两种材料都已购买 -> 解锁 room2
      const purchased = s.purchasedItems ?? [];
      if (purchased.includes("material_supplies")) {
        return { room2Unlocked: true };
      }
      return {};
    },
  },
  {
    id: "material_supplies",
    name: "扩建材料",
    category: "material",
    categoryLabel: "材料",
    costMood: 50,
    effect: "扩建必须",
    flavor: "最高端的科技扩建往往采用最原始的方式。",
    unlockCondition: "购买太空舱扩建图纸",
    isUnlocked: (s) => hasPurchased(s, "blueprint_expand"),
    apply: (s) => {
      // 检查是否两种材料都已购买 -> 解锁 room2
      const purchased = s.purchasedItems ?? [];
      if (purchased.includes("material_tools")) {
        return { room2Unlocked: true };
      }
      return {};
    },
  },

  // === 空间2装饰（需扩建完成） ===
  {
    id: "room2_wallpaper",
    name: "新壁纸（等美工设计）",
    category: "room2_wallpaper",
    categoryLabel: "空间2壁纸",
    costMood: 20,
    effect: "美化",
    flavor: "（等美工设计）",
    unlockCondition: "完成扩建任务",
    isUnlocked: (s) => hasMilestone(s, "m5_construction"),
    apply: () => ({}),
  },
  {
    id: "room2_floor",
    name: "新地板（等美工设计）",
    category: "room2_floor",
    categoryLabel: "空间2地板",
    costMood: 20,
    effect: "美化",
    flavor: "（等美工设计）",
    unlockCondition: "完成扩建任务",
    isUnlocked: (s) => hasMilestone(s, "m5_construction"),
    apply: () => ({}),
  },
  {
    id: "vase",
    name: "白瓷花瓶",
    category: "room2_decor",
    categoryLabel: "装饰",
    costMood: 50,
    effect: "+1心境值/h",
    flavor: "插花白色瓷瓶——哪里来的花？",
    unlockCondition: "完成扩建任务",
    isUnlocked: (s) => hasMilestone(s, "m5_construction"),
    apply: () => ({}),
  },
  {
    id: "wall_lamp",
    name: "壁挂灯",
    category: "room2_decor",
    categoryLabel: "装饰",
    costMood: 50,
    effect: "+1心境值/h",
    flavor: "暖色调的壁挂灯，让整个房间都显得很温暖。",
    unlockCondition: "完成扩建任务",
    isUnlocked: (s) => hasMilestone(s, "m5_construction"),
    apply: () => ({}),
  },
  {
    id: "small_table",
    name: "小茶几",
    category: "room2_decor",
    categoryLabel: "装饰",
    costMood: 50,
    effect: "+1心境值/h",
    flavor: "桌子上放着一些零食，很有生活气息。",
    unlockCondition: "完成扩建任务",
    isUnlocked: (s) => hasMilestone(s, "m5_construction"),
    apply: () => ({}),
  },
  {
    id: "window",
    name: "窗户",
    category: "room2_decor",
    categoryLabel: "装饰",
    costMood: 50,
    effect: "+1心境值/h",
    flavor: "可以看到窗外黑漆漆的宇宙，布满了星星。",
    unlockCondition: "完成扩建任务",
    isUnlocked: (s) => hasMilestone(s, "m5_construction"),
    apply: () => ({}),
  },
  {
    id: "planet_model",
    name: "行星模型",
    category: "room2_decor",
    categoryLabel: "装饰",
    costMood: 50,
    effect: "+1心境值/h",
    flavor: "行星对陆地上的人来说总是非常浪漫。",
    unlockCondition: "完成扩建任务",
    isUnlocked: (s) => hasMilestone(s, "m5_construction"),
    apply: () => ({}),
  },
  {
    id: "plant",
    name: "绿色植物",
    category: "room2_decor",
    categoryLabel: "装饰",
    costMood: 50,
    effect: "+1心境值/h",
    flavor: "不知名植物，舱内为数不多的绿色。",
    unlockCondition: "完成扩建任务",
    isUnlocked: (s) => hasMilestone(s, "m5_construction"),
    apply: () => ({}),
  },
  {
    id: "bean_bag",
    name: "懒人沙发",
    category: "room2_decor",
    categoryLabel: "装饰",
    costMood: 100,
    effect: "+2心境值/h",
    flavor: "它就像在诱惑你过去躺一会，但我们没做这个功能。",
    unlockCondition: "完成扩建任务",
    isUnlocked: (s) => hasMilestone(s, "m5_construction"),
    apply: () => ({}),
  },
  {
    id: "wardrobe",
    name: "衣橱",
    category: "room2_decor",
    categoryLabel: "装饰",
    costMood: 100,
    effect: "+3心境值/h",
    flavor: "里面挂满了同样的衣服。",
    unlockCondition: "完成扩建任务",
    isUnlocked: (s) => hasMilestone(s, "m5_construction"),
    apply: () => ({}),
  },
  {
    id: "record_player",
    name: "唱片机",
    category: "room2_decor",
    categoryLabel: "装饰",
    costMood: 200,
    effect: "+5心境值/h",
    flavor: "没有网络的日子就像回到了旧时代，而人类总是需要音乐。",
    unlockCondition: "完成扩建任务",
    isUnlocked: (s) => hasMilestone(s, "m5_construction"),
    apply: () => ({}),
  },
];

/** 按类别分组 */
export function getRecipesByCategory(): Map<CraftCategory, CraftRecipe[]> {
  const map = new Map<CraftCategory, CraftRecipe[]>();
  for (const recipe of ALL_RECIPES) {
    const list = map.get(recipe.category) ?? [];
    list.push(recipe);
    map.set(recipe.category, list);
  }
  return map;
}

/** 获取某个物品可用的类别列表（仅包含有已解锁配方的类别） */
export function getAvailableCategories(state: OmegaState): CraftCategory[] {
  const seen = new Set<CraftCategory>();
  for (const recipe of ALL_RECIPES) {
    if (recipe.isUnlocked(state) && !hasPurchased(state, recipe.id)) {
      seen.add(recipe.category);
    }
  }
  return [...seen];
}

/** 尝试合成物品 */
export function tryCraft(
  recipeId: string,
  state: OmegaState
): { success: boolean; newState: Partial<OmegaState>; message: string } {
  const recipe = ALL_RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return { success: false, newState: {}, message: "未知物品" };
  if (!recipe.isUnlocked(state)) return { success: false, newState: {}, message: "未解锁" };
  if (hasPurchased(state, recipeId)) return { success: false, newState: {}, message: "已合成" };
  if (state.mood < recipe.costMood) return { success: false, newState: {}, message: `心境值不足（需要 ${recipe.costMood}）` };

  const reward = recipe.apply(state);
  const purchased = [...(state.purchasedItems ?? []), recipeId];
  return {
    success: true,
    newState: {
      ...reward,
      purchasedItems: purchased,
      mood: Math.max(15, state.mood - recipe.costMood),
    },
    message: `成功合成「${recipe.name}」！`,
  };
}
