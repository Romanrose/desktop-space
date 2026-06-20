/**
 * 太空舱装修面板
 *
 * 在装修模式下显示，列出已合成的物品按类别分组，点击装备/卸下。
 */

import { useState } from "react";
import type { OmegaState } from "../types";
import { ALL_RECIPES, type CraftRecipe } from "../systems/crafting";

type Props = {
  state: OmegaState;
  updateState: (partial: Partial<OmegaState>) => Promise<OmegaState>;
  onExit: () => void;
  setClickBubble: (msg: string | null) => void;
};

/** slot 名称 → 中文标签 */
const SLOT_LABELS: Record<string, string> = {
  wallpaper: "壁纸",
  floor: "地板",
  furniture: "合成机",
  shelf: "书架",
  bed: "床铺",
  desk: "书桌",
  desk_ornament: "书桌摆件",
  window: "窗户",
  wall_decoration: "墙饰",
  room2_wallpaper: "空间2壁纸",
  room2_floor: "空间2地板",
};

/** recipe category → slot 名称 */
const CATEGORY_TO_SLOT: Record<string, string> = {
  capsule_wallpaper: "wallpaper",
  capsule_floor: "floor",
  capsule_furniture: "furniture",
  capsule_shelf: "shelf",
  capsule_bed: "bed",
  capsule_desk: "desk",
  capsule_desk_ornament: "desk_ornament",
  capsule_window: "window",
  capsule_wall_decoration: "wall_decoration",
  room2_wallpaper: "room2_wallpaper",
  room2_floor: "room2_floor",
};

export default function DecorationPanel({
  state,
  updateState,
  onExit,
  setClickBubble,
}: Props) {
  // 已合成的物品
  const ownedRecipes = ALL_RECIPES.filter((r) =>
    (state.purchasedItems ?? []).includes(r.id)
  );

  // 按 slot 分组
  const bySlot = new Map<string, CraftRecipe[]>();
  for (const recipe of ownedRecipes) {
    const slot = CATEGORY_TO_SLOT[recipe.category] ?? recipe.category;
    const list = bySlot.get(slot) ?? [];
    list.push(recipe);
    bySlot.set(slot, list);
  }

  // 展开的 slot
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);

  async function equip(recipeId: string, slot: string) {
    await updateState({
      equippedDecorations: {
        ...state.equippedDecorations,
        [slot]: recipeId,
      },
    });
    setClickBubble(`已装备「${getRecipeName(recipeId)}」`);
    setTimeout(() => setClickBubble(null), 2000);
  }

  async function unequip(slot: string) {
    const newEquipped = { ...state.equippedDecorations };
    delete newEquipped[slot];
    await updateState({ equippedDecorations: newEquipped });
    setClickBubble("已卸下");
    setTimeout(() => setClickBubble(null), 1500);
  }

  return (
    <section className="decoration-panel">
      <header className="decoration-panel__header">
        <h2>装修模式</h2>
        <span className="decoration-panel__hint">
          点击类别展开，选择已合成的物品装备到太空舱
        </span>
        <button
          type="button"
          className="decoration-panel__exit"
          onClick={(e) => {
            e?.stopPropagation();
            onExit();
          }}
        >
          退出装修
        </button>
      </header>

      <div className="decoration-panel__body">
        {bySlot.size === 0 ? (
          <div className="decoration-panel__empty">
            <p>
              {!(state.completedMilestones ?? []).includes("m2_clean_capsule")
                ? "太空舱还没打扫干净，无法装修。完成清扫后再来吧。"
                : "还没有合成任何装饰品。前往合成机制造物品后再来装修。"}
            </p>
            <p style={{ marginTop: 12, fontSize: 13, color: '#556677' }}>
              {!(state.completedMilestones ?? []).includes("m2_clean_capsule")
                ? "Tips: 提升心境值到 100 触发清扫剧情"
                : "Tips: 打开悬浮窗 → 事项 → 合成机"}
            </p>
          </div>
        ) : (
          [...bySlot.entries()].map(([slot, recipes]) => {
            const equippedId = state.equippedDecorations?.[slot];
            const currentEquipped = equippedId
              ? recipes.find((r) => r.id === equippedId)
              : null;
            const isExpanded = expandedSlot === slot;

            return (
              <div key={slot} className="decoration-panel__slot">
                <button
                  type="button"
                  className="decoration-panel__slot-header"
                  onClick={() => setExpandedSlot(isExpanded ? null : slot)}
                >
                  <span className="decoration-panel__slot-name">
                    {SLOT_LABELS[slot] ?? slot}
                  </span>
                  {currentEquipped ? (
                    <span className="decoration-panel__slot-equipped">
                      ✅ {currentEquipped.name}
                    </span>
                  ) : (
                    <span className="decoration-panel__slot-empty">空</span>
                  )}
                  <span className="decoration-panel__slot-arrow">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="decoration-panel__slot-items">
                    {recipes.map((recipe) => {
                      const isActive =
                        state.equippedDecorations?.[slot] === recipe.id;
                      return (
                        <div
                          key={recipe.id}
                          className={`decoration-panel__item ${
                            isActive
                              ? "decoration-panel__item--active"
                              : ""
                          }`}
                        >
                          <div className="decoration-panel__item-info">
                            <strong>{recipe.name}</strong>
                            <p>{recipe.effect}</p>
                          </div>
                          {isActive ? (
                            <button
                              type="button"
                              className="decoration-panel__unequip-btn"
                              onClick={() => unequip(slot)}
                            >
                              卸下
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="decoration-panel__equip-btn"
                              onClick={() => equip(recipe.id, slot)}
                            >
                              装备
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function getRecipeName(id: string): string {
  return ALL_RECIPES.find((r) => r.id === id)?.name ?? id;
}
