/**
 * 合成机面板组件
 *
 * 显示可合成的物品列表，按类别分组。
 * 左侧选择类别，右侧显示物品详情和合成按钮。
 */

import { useState } from "react";
import type { OmegaState } from "../types";
import {
  ALL_RECIPES,
  type CraftCategory,
  getAvailableCategories,
  tryCraft,
} from "../systems/crafting";

type Props = {
  state: OmegaState;
  updateState: (partial: Partial<OmegaState>) => Promise<OmegaState>;
  onClose: () => void;
  setClickBubble: (msg: string | null) => void;
};

const CATEGORY_LABELS: Record<CraftCategory, string> = {
  capsule_wallpaper: "壁纸",
  capsule_floor: "地板",
  capsule_furniture: "合成机",
  capsule_shelf: "书架",
  capsule_bed: "床铺",
  capsule_desk: "书桌",
  capsule_desk_ornament: "书桌摆件",
  capsule_window: "窗户",
  capsule_wall_decoration: "墙饰",
  room2_wallpaper: "空间2壁纸",
  room2_floor: "空间2地板",
  room2_decor: "装饰",
  blueprint: "图纸",
  material: "材料",
  function_item: "功能",
};

/** 类别图标映射 */
const CATEGORY_ICONS: Partial<Record<CraftCategory, string>> = {
  capsule_wallpaper: "🧱",
  capsule_floor: "🟫",
  capsule_desk: "🪑",
  capsule_desk_ornament: "🏺",
  room2_decor: "🪴",
  blueprint: "📐",
  material: "🔧",
  function_item: "⚙️",
};

export default function CraftingPanel({ state, updateState, onClose, setClickBubble }: Props) {
  const categories = getAvailableCategories(state);
  const [selectedCategory, setSelectedCategory] = useState<CraftCategory | null>(
    categories[0] ?? null
  );

  const filteredRecipes = ALL_RECIPES.filter(
    (r) =>
      r.category === selectedCategory &&
      r.isUnlocked(state) &&
      !(state.purchasedItems ?? []).includes(r.id)
  );

  const purchasedRecipes = ALL_RECIPES.filter(
    (r) => (state.purchasedItems ?? []).includes(r.id)
  );

  async function handleCraft(recipeId: string) {
    const result = tryCraft(recipeId, state);
    if (result.success) {
      await updateState(result.newState);
      setClickBubble(result.message);
      setTimeout(() => setClickBubble(null), 2500);
    } else {
      setClickBubble(result.message);
      setTimeout(() => setClickBubble(null), 2500);
    }
  }

  return (
    <section className="crafting-panel">
      <header className="crafting-panel__header">
        <h2>合成机</h2>
        <button type="button" className="crafting-panel__close" onClick={onClose}>
          ✕
        </button>
      </header>

      <div className="crafting-panel__body">
        {/* 左侧类别列表 */}
        <nav className="crafting-panel__categories">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`crafting-panel__cat-btn ${
                selectedCategory === cat ? "crafting-panel__cat-btn--active" : ""
              }`}
              onClick={() => setSelectedCategory(cat)}
            >
              <span className="crafting-panel__cat-icon">{CATEGORY_ICONS[cat] ?? "📦"}</span>
              <span>{CATEGORY_LABELS[cat] ?? cat}</span>
            </button>
          ))}
          {purchasedRecipes.length > 0 && (
            <button
              key="purchased"
              type="button"
              className={`crafting-panel__cat-btn ${
                selectedCategory === null ? "crafting-panel__cat-btn--active" : ""
              }`}
              onClick={() => setSelectedCategory(null)}
            >
              <span className="crafting-panel__cat-icon">✅</span>
              <span>已合成</span>
            </button>
          )}
        </nav>

        {/* 右侧物品列表 */}
        <div className="crafting-panel__items">
          {selectedCategory === null ? (
            // 显示已合成的物品
            purchasedRecipes.length === 0 ? (
              <p className="crafting-panel__empty">还没有合成任何物品。</p>
            ) : (
              purchasedRecipes.map((recipe) => (
                <div key={recipe.id} className="crafting-panel__item crafting-panel__item--done">
                  <div className="crafting-panel__item-info">
                    <strong className="crafting-panel__item-name">{recipe.name}</strong>
                    <p className="crafting-panel__item-effect">{recipe.effect}</p>
                    <p className="crafting-panel__item-flavor">"{recipe.flavor}"</p>
                  </div>
                  <span className="crafting-panel__item-badge">已合成</span>
                </div>
              ))
            )
          ) : filteredRecipes.length === 0 ? (
            <p className="crafting-panel__empty">该类别没有可合成的物品。</p>
          ) : (
            filteredRecipes.map((recipe) => (
              <div key={recipe.id} className="crafting-panel__item">
                <div className="crafting-panel__item-info">
                  <strong className="crafting-panel__item-name">{recipe.name}</strong>
                  <p className="crafting-panel__item-effect">{recipe.effect}</p>
                  <p className="crafting-panel__item-flavor">"{recipe.flavor}"</p>
                  <div className="crafting-panel__item-meta">
                    <span className="crafting-panel__item-cost">
                      消耗 {recipe.costMood} 心境值
                    </span>
                    <span className="crafting-panel__item-unlock">
                      {recipe.unlockCondition !== "无" ? `需：${recipe.unlockCondition}` : ""}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="crafting-panel__craft-btn"
                  disabled={state.mood < recipe.costMood}
                  onClick={() => handleCraft(recipe.id)}
                >
                  合成
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
