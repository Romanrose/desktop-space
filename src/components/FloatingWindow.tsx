import { FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ChatLine, OmegaAIResponse, OmegaState } from "../types";

type Props = {
  state: OmegaState;
  setState: (state: OmegaState) => void;
  updateState: (partial: Partial<OmegaState>) => Promise<OmegaState>;
};

const emotionLabel: Record<OmegaState["emotion"], string> = {
  calm_positive: "平静",
  calm_negative: "低落",
  happy: "开心",
  shy: "害羞",
  sad: "难过",
  proud: "骄傲"
};

export function FloatingWindow({ state, setState, updateState }: Props) {
  const [menu, setMenu] = useState<"root" | "tasks" | null>(null);
  const [panel, setPanel] = useState<"chat" | "record" | "focus" | "alarm" | null>(null);
  const [input, setInput] = useState("");
  const [includeScreenshot, setIncludeScreenshot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sessionLog, setSessionLog] = useState<ChatLine[]>([]);
  const [moodFlash, setMoodFlash] = useState<string | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startPointerX: number;
    startPointerY: number;
    startWindowX: number;
    startWindowY: number;
    dragged: boolean;
  } | null>(null);

  const recentLines = useMemo(() => sessionLog.slice(-4), [sessionLog]);

  useEffect(() => {
    function closePanel(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPanel(null);
      }
    }

    window.addEventListener("keydown", closePanel);
    return () => window.removeEventListener("keydown", closePanel);
  }, []);

  async function refreshLog() {
    const log = (await window.omega.state.getSessionLog()) as ChatLine[];
    setSessionLog(log);
  }

  async function openPanel(nextPanel: typeof panel) {
    setPanel(nextPanel);
    if (nextPanel) {
      setMenu(null);
    }
    if (nextPanel === "record") {
      await refreshLog();
    }
    if (nextPanel === "chat") {
      await updateState({ currentMode: "chatting" });
      await refreshLog();
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput("");
    setBusy(true);
    try {
      const response = (await window.omega.ai.sendMessage({
        text,
        includeScreenshot
      })) as OmegaAIResponse;
      setState(response.state);
      setMoodFlash(`${response.moodDelta >= 0 ? "+" : ""}${response.moodDelta}`);
      setTimeout(() => setMoodFlash(null), 1100);
      await refreshLog();
      if (response.featureIntent === "capsule") {
        await window.omega.window.openCapsule();
      }
    } finally {
      setBusy(false);
    }
  }

  async function openCapsule() {
    await window.omega.window.openCapsule();
  }

  function lockedGameText() {
    const options = [
      "Ω暂时还没有办法帮你打游戏",
      "Ω不太想帮你打游戏",
      "Ω还没有学会这款游戏",
      "Ω还不知道这是什么游戏"
    ];
    return options[Math.floor(Math.random() * options.length)];
  }

  function toggleRootMenu() {
    setPanel(null);
    setMenu(menu ? null : "root");
  }

  function startAvatarPointer(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startPointerX: event.screenX,
      startPointerY: event.screenY,
      startWindowX: window.screenX,
      startWindowY: window.screenY,
      dragged: false
    };
  }

  function moveAvatarPointer(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.screenX - drag.startPointerX;
    const deltaY = event.screenY - drag.startPointerY;
    if (Math.hypot(deltaX, deltaY) < 4 && !drag.dragged) return;
    drag.dragged = true;
    void window.omega.window.setFloatingPosition(
      Math.round(drag.startWindowX + deltaX),
      Math.round(drag.startWindowY + deltaY)
    );
  }

  function endAvatarPointer(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (!drag.dragged) {
      toggleRootMenu();
    }
  }

  return (
    <main className="floating-shell">
      <section className="mood-meter" aria-label="心境值">
        <div className="mood-meter__track">
          <div className="mood-meter__fill" style={{ width: `${Math.min(100, state.mood / 10)}%` }} />
        </div>
        <strong>{state.mood}</strong>
        {moodFlash && <span className="mood-flash">{moodFlash}</span>}
      </section>

      <button
        className={`omega-avatar omega-avatar--${state.emotion}`}
        type="button"
        onPointerDown={startAvatarPointer}
        onPointerMove={moveAvatarPointer}
        onPointerUp={endAvatarPointer}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
        aria-label="Ω"
      >
        <img src="/assets/omega/omega-transparent.png" alt="Ω" />
      </button>

      <p className="status-line">
        Ω · {emotionLabel[state.emotion]} · 好感 {state.affinity}
      </p>

      {menu === "root" && (
        <nav className="bubble-menu bubble-menu--root">
          <button type="button" onClick={() => openPanel("chat")}>输入</button>
          <button type="button" onClick={() => openPanel("record")}>记录</button>
          <button type="button" onClick={() => setMenu("tasks")}>事项</button>
          <button type="button" onClick={openCapsule}>太空舱</button>
        </nav>
      )}

      {menu === "tasks" && (
        <nav className="bubble-menu bubble-menu--tasks">
          <button type="button" onClick={() => openPanel("alarm")}>闹钟</button>
          <button
            type="button"
            className={!state.unlocked.game ? "is-locked" : ""}
            onClick={() => (state.unlocked.game ? openPanel(null) : alert(lockedGameText()))}
          >
            游戏
          </button>
          <button type="button" onClick={() => openPanel("focus")}>专注模式</button>
          <button type="button" onClick={() => setMenu("root")}>返回</button>
        </nav>
      )}

      {panel === "chat" && (
        <section className="dialogue-bubble chat-panel" aria-label="Ω 对话">
          <button
            className="dialogue-close"
            type="button"
            aria-label="关闭聊天"
            onClick={() => openPanel(null)}
          >
            ×
          </button>
          <div className="chat-stream" aria-live="polite">
            {recentLines.length === 0 && <p className="empty-copy">Ω正在看着你这边的光。</p>}
            {recentLines.map((line) => (
              <p className={`chat-line chat-line--${line.speaker}`} key={`${line.createdAt}-${line.text}`}>
                <span>{line.speaker === "omega" ? "Ω" : state.nickname || "玩家"}</span>
                {line.text}
              </p>
            ))}
            {busy && <p className="chat-line chat-line--omega"><span>Ω</span>正在组织语言...</p>}
          </div>
          <form className="chat-form" onSubmit={sendMessage}>
            <label className="screen-toggle">
              <input
                type="checkbox"
                checked={includeScreenshot}
                onChange={(event) => setIncludeScreenshot(event.currentTarget.checked)}
              />
              屏幕识别
            </label>
            <input
              value={input}
              onChange={(event) => setInput(event.currentTarget.value)}
              placeholder="和Ω说话..."
            />
            <button type="submit" disabled={busy}>发送</button>
          </form>
        </section>
      )}

      {panel === "record" && (
        <section className="floating-panel record-panel">
          <header>
            <h2>本次记录</h2>
            <button type="button" onClick={() => openPanel(null)}>收起</button>
          </header>
          <div className="record-list">
            {sessionLog.length === 0 && <p className="empty-copy">本次启动还没有聊天记录。</p>}
            {sessionLog.map((line) => (
              <p key={`${line.createdAt}-${line.text}`}>
                <strong>{line.speaker === "omega" ? "Ω" : state.nickname || "玩家"}：</strong>
                {line.text}
              </p>
            ))}
          </div>
        </section>
      )}

      {panel === "focus" && (
        <section className="floating-panel compact-panel">
          <h2>专注模式</h2>
          <p>Ω坐在一旁看书。首版先记录入口，后续接入累计时长。</p>
          <button type="button" onClick={() => openPanel(null)}>退出</button>
        </section>
      )}

      {panel === "alarm" && (
        <section className="floating-panel compact-panel">
          <h2>闹钟</h2>
          <p>你不能听见我说话，我只能在时间到了的时候跟你打招呼。</p>
          <button type="button" onClick={() => openPanel(null)}>知道了</button>
        </section>
      )}
    </main>
  );
}
