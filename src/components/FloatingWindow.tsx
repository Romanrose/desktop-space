import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ChatLine, OmegaAIResponse, OmegaState } from "../types";
import Live2DModel from "../components/Live2DModel";

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
  proud: "骄傲",
  excited: "兴奋",
  fearful: "害怕"
};

export function FloatingWindow({ state, setState, updateState }: Props) {
  const [menu, setMenu] = useState<"root" | "tasks" | null>(null);
  const [panel, setPanel] = useState<"chat" | "record" | "focus" | "alarm" | null>(null);
  const [input, setInput] = useState("");
  const [includeScreenshot, setIncludeScreenshot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sessionLog, setSessionLog] = useState<ChatLine[]>([]);
  const [moodFlash, setMoodFlash] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const containerRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recentLines = useMemo(() => sessionLog.slice(-4), [sessionLog]);

  // 视线跟随鼠标
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
          x: (e.clientX - rect.left) / rect.width,
          y: (e.clientY - rect.top) / rect.height
        });
      }
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  // 待机状态触发 (3分钟无交互)
  useEffect(() => {
    if (state.currentMode !== "idle") return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      // 简单待机记录，后续接入动画系统
      console.log("Ω 进入待机状态");
    }, 3 * 60 * 1000);
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [state.currentMode, state.lastActiveTime]);

  // 退出待机
  const wakeUp = () => {
    updateState({ currentMode: "idle", lastActiveTime: Date.now() });
    if (idleTimer.current) clearTimeout(idleTimer.current);
  };

  useEffect(() => {
    function closePanel(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPanel(null);
        setMenu(null);
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
    if (nextPanel === "record") await refreshLog();
    if (nextPanel === "chat") {
      await updateState({ currentMode: "chatting" });
      await refreshLog();
    }
    wakeUp();
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
      setState(response.state!);
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

  const moodPercentage = Math.min(100, (state.mood / 1000) * 100);

  return (
    <main className="floating-shell" ref={containerRef} onClick={wakeUp}>
      {/* 心境值横条 */}
      <section className="mood-meter" aria-label="心境值">
        <div className="mood-meter__track">
          <div className="mood-meter__fill" style={{ width: `${moodPercentage}%` }} />
        </div>
        <strong>{state.mood}</strong>
        {moodFlash && <span className="mood-flash">{moodFlash}</span>}
      </section>

      {/* Ω 角色（Live2D） */}
      <button
        className={`omega-avatar omega-avatar--${state.emotion}`}
        type="button"
        onClick={(e) => { e.stopPropagation(); setMenu(menu ? null : "root"); }}
        aria-label="Ω"
        style={{
          transform: `translate(${(mousePos.x - 0.5) * 8}px, ${(mousePos.y - 0.5) * 8}px)`,
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer'
        }}
      >
        <Live2DModel
          modelPath="/test-moc/桌面状态.model3.json"
          scale={0.5} // 根据你的模型大小调整这个值
          emotion={state.emotion}
          mousePos={mousePos}
          onClick={() => setMenu(menu ? null : "root")}
        />
      </button>

      <p className="status-line">
        Ω · {emotionLabel[state.emotion]} · 好感 {state.affinity}
      </p>

      {/* 气泡菜单 */}
      {menu === "root" && (
        <nav className="bubble-menu bubble-menu--root">
          <button type="button" onClick={(e) => { e.stopPropagation(); openPanel("chat"); }}>输入</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); openPanel("record"); }}>记录</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); setMenu("tasks"); }}>事项</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); openCapsule(); }}>太空舱</button>
        </nav>
      )}

      {menu === "tasks" && (
        <nav className="bubble-menu bubble-menu--tasks">
          <button type="button" onClick={(e) => { e.stopPropagation(); openPanel("alarm"); }}>闹钟</button>
          <button
            type="button"
            className={!state.unlocked.game ? "is-locked" : ""}
            onClick={(e) => {
              e.stopPropagation();
              state.unlocked.game ? openPanel(null) : alert(lockedGameText());
            }}
          >
            游戏
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); openPanel("focus"); }}>专注模式</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); setMenu("root"); }}>返回</button>
        </nav>
      )}

      {/* 聊天面板 */}
      {panel === "chat" && (
        <section className="dialogue-bubble chat-panel" aria-label="Ω 对话">
          <button
            className="dialogue-close"
            type="button"
            aria-label="关闭聊天"
            onClick={(e) => { e.stopPropagation(); openPanel(null); }}
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

      {/* 记录面板（可拖动） */}
      {panel === "record" && (
        <DraggablePanel title="本次记录" onClose={() => openPanel(null)}>
          <div className="record-list">
            {sessionLog.length === 0 && <p className="empty-copy">本次启动还没有聊天记录。</p>}
            {sessionLog.map((line) => (
              <p key={`${line.createdAt}-${line.text}`}>
                <strong>{line.speaker === "omega" ? "Ω" : state.nickname || "玩家"}：</strong>
                {line.text}
              </p>
            ))}
          </div>
        </DraggablePanel>
      )}

      {panel === "focus" && (
        <section className="floating-panel compact-panel">
          <h2>专注模式</h2>
          <p>Ω坐在一旁看书。首版先记录入口，后续接入累计时长。</p>
          <button type="button" onClick={(e) => { e.stopPropagation(); openPanel(null); }}>退出</button>
        </section>
      )}

      {panel === "alarm" && (
        <section className="floating-panel compact-panel">
          <h2>闹钟</h2>
          <p>你不能听见我说话，我只能在时间到了的时候跟你打招呼。</p>
          <button type="button" onClick={(e) => { e.stopPropagation(); openPanel(null); }}>知道了</button>
        </section>
      )}
    </main>
  );
}

/* 可拖动面板组件 */
function DraggablePanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const [pos, setPos] = useState({ x: 60, y: 120 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    const handleMove = (ev: MouseEvent) => {
      if (dragging.current) setPos({ x: ev.clientX - offset.current.x, y: ev.clientY - offset.current.y });
    };
    const handleUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  return (
    <section className="floating-panel record-panel" style={{ left: pos.x, top: pos.y }} onMouseDown={handleMouseDown}>
      <header>
        <h2>{title}</h2>
        <button type="button" onClick={onClose}>收起</button>
      </header>
      {children}
    </section>
  );
}