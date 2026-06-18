/**
 * 游戏面板
 *
 * 合成游戏机后解锁，提供简单的游戏任务辅助界面。
 */

import { useState } from "react";
import type { OmegaState } from "../types";

type Props = {
  state: OmegaState;
  updateState: (partial: Partial<OmegaState>) => Promise<OmegaState>;
  onClose: () => void;
  setClickBubble: (msg: string | null) => void;
};

export default function GamePanel({ state, updateState, onClose, setClickBubble }: Props) {
  const [action, setAction] = useState<string | null>(null);

  async function handleAction(type: "daily" | "resin") {
    setAction(type);
    // 模拟运行
    await new Promise((r) => setTimeout(r, 2000));

    const messages: Record<string, string> = {
      daily: "每日任务完成了，Ω揉了揉眼睛，但看起来很开心。",
      resin: "体力清完了。Ω说：'下次还可以找我。'",
    };

    await updateState({
      emotion: "happy",
      lastActiveTime: Date.now(),
    });

    setClickBubble(messages[type]);
    setTimeout(() => {
      setClickBubble(null);
      setAction(null);
    }, 3000);
  }

  return (
    <section className="floating-panel compact-panel game-panel">
      <h2>游戏</h2>

      {action ? (
        <div className="game-panel__running">
          <p>Ω 正在处理{action === "daily" ? "每日任务" : "体力"}……</p>
          <div className="game-panel__spinner" />
        </div>
      ) : (
        <>
          <p className="game-panel__desc">
            好感度 {state.affinity} · Ω已经学会了怎么操作那款游戏。
            你可以让Ω帮忙做一些简单的事。
          </p>
          <div className="game-panel__actions">
            <button
              type="button"
              className="game-panel__btn"
              onClick={(e) => { e?.stopPropagation(); handleAction("daily"); }}
            >
              做每日任务
            </button>
            <button
              type="button"
              className="game-panel__btn"
              onClick={(e) => { e?.stopPropagation(); handleAction("resin"); }}
            >
              清体力
            </button>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={(e) => { e?.stopPropagation(); onClose(); }}
        disabled={action !== null}
      >
        关闭
      </button>
    </section>
  );
}
