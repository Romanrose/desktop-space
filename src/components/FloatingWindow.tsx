import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatLine, OmegaAIResponse, OmegaState } from "../types";
import Live2DModel from "../components/Live2DModel";
import {
  getAffectionLevel,
  isIdleActionExpired,
  isLowMood,
  pickIdleAction,
} from "../systems/idleBehavior";
import CraftingPanel from "./CraftingPanel";
import GamePanel from "./GamePanel";
import BookshelfPanel from "./BookshelfPanel";
import {
  checkMilestones,
  applyMilestoneReward,
  pickPeriodicTopic,
  ALL_MILESTONES,
} from "../systems/storyMilestones";

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
  fearful: "害怕",
};

/**
 * 根据情绪 + 亲密度生成点击反馈文案
 */
function getClickFeedback(state: OmegaState): string {
  const lv = getAffectionLevel(state.affinity);
  const e = state.emotion;

  // 消极情绪
  if (e === "sad" || e === "calm_negative") {
    if (lv === "low") return "Ω轻轻缩了缩肩膀，像是想把什么藏起来。";
    if (lv === "medium") return "Ω勉强对你笑了一下，睫毛上还有一点水光。";
    return "Ω靠过来很近，呼吸落在玻璃上，化成一小片雾。";
  }

  if (e === "fearful") {
    return "Ω警惕地侧过头，确认是你之后才放松了一点。";
  }

  if (e === "shy") {
    return "Ω低头假装在整理袖子，耳朵却红了。";
  }

  // 积极情绪
  if (lv === "high") {
    return "Ω朝你抬了抬手，嘴角带着很浅的笑。";
  }
  if (lv === "medium") {
    return "Ω转过身来，目光在你脸上停了一瞬。";
  }
  // low
  return "Ω抬起头看你，眨了眨眼睛。";
}

export function FloatingWindow({ state, setState, updateState }: Props) {
  const [menu, setMenu] = useState<"root" | "tasks" | null>(null);
  const [panel, setPanel] = useState<
    "chat" | "record" | "focus" | "alarm" | "crafting" | "game" | "bookshelf" | "clickFeedback" | null
  >(null);
  const [input, setInput] = useState("");
  const [includeScreenshot, setIncludeScreenshot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sessionLog, setSessionLog] = useState<ChatLine[]>([]);
  const [moodFlash, setMoodFlash] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [clickBubble, setClickBubble] = useState<string | null>(null);
  const [idleHint, setIdleHint] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const [sleepTimer, setSleepTimer] = useState(60);
  const containerRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleCycleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sleepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActiveRef = useRef(state.lastActiveTime);
  const stateRef = useRef(state);
  stateRef.current = state;

  const recentLines = useMemo(() => sessionLog.slice(-4), [sessionLog]);

  // 按亲密度档位计算的活力度（用于决定是否显示生气等）
  const affectionLevel = useMemo(() => getAffectionLevel(state.affinity), [state.affinity]);

  // ---------- 鼠标视线跟随 ----------
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
          x: (e.clientX - rect.left) / rect.width,
          y: (e.clientY - rect.top) / rect.height,
        });
      }
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  // ---------- 通用唤醒 ----------
  const wakeUp = useCallback(() => {
    if (stateRef.current.currentMode === "sleep") return; // 睡觉模式不能唤醒
    if (idleTimer.current) clearTimeout(idleTimer.current);
    setIdleHint(false);
    updateState({
      currentMode: "idle",
      lastActiveTime: Date.now(),
    }).catch(() => {});
  }, [updateState]);

  // ---------- 3分钟待机检测 ----------
  useEffect(() => {
    if (state.currentMode === "sleep") return;
    if (state.currentMode === "focus") return;
    if (state.currentMode === "chatting") return;

    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      // 进入待机
      const s = stateRef.current;
      const { action, duration } = pickIdleAction(s);
      setIdleHint(true);
      updateState({
        currentMode: "idle",
        currentIdleAction: action,
        idleActionStart: Date.now(),
        idleActionDuration: duration,
      }).catch(() => {});
    }, 3 * 60 * 1000);

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [
    state.currentMode,
    state.lastActiveTime,
    state.mood,
    state.affinity,
    state.unlocked,
    updateState,
  ]);

  // ---------- 待机行为轮换 ----------
  useEffect(() => {
    if (state.currentMode !== "idle" && state.currentMode !== "focus") {
      if (idleCycleRef.current) {
        clearInterval(idleCycleRef.current);
        idleCycleRef.current = null;
      }
      return;
    }

    // 每 5 秒检查一次行为是否到期
    idleCycleRef.current = setInterval(() => {
      const s = stateRef.current;
      if (s.currentMode !== "idle" && s.currentMode !== "focus") return;
      if (isIdleActionExpired(s)) {
        // 切换到下一个行为
        const { action, duration } = pickIdleAction(s);
        updateState({
          currentIdleAction: action,
          idleActionStart: Date.now(),
          idleActionDuration: duration,
        }).catch(() => {});
      }
    }, 5000);

    return () => {
      if (idleCycleRef.current) {
        clearInterval(idleCycleRef.current);
        idleCycleRef.current = null;
      }
    };
  }, [state.currentMode, updateState]);

  // ---------- 里程碑检测 ----------
  useEffect(() => {
    const result = checkMilestones(stateRef.current);
    if (result.triggered && !stateRef.current.pendingMilestoneEvent) {
      updateState({ pendingMilestoneEvent: result.bubbleText }).catch(() => {});
    }
  }, [state.mood, state.affinity, state.unlocked, updateState]);

  // ---------- 定期话题（每1小时） ----------
  useEffect(() => {
    if (!state.completedMilestones.includes("m1_first_greeting")) return;
    const elapsed = Date.now() - (state.lastGreetingTime ?? 0);
    if (elapsed < 3600_000) {
      // 设定定时器到 1h 触发
      const timer = setTimeout(() => {
        if (stateRef.current.currentMode === "idle") {
          const topic = pickPeriodicTopic();
          updateState({ pendingMilestoneEvent: topic }).catch(() => {});
        }
      }, 3600_000 - elapsed);
      return () => clearTimeout(timer);
    }
  }, [state.completedMilestones, state.lastGreetingTime, updateState]);

  // ---------- 里程碑通知关闭 ----------
  const dismissMilestone = useCallback(async () => {
    const eventText = stateRef.current.pendingMilestoneEvent;
    if (!eventText) return;
    // 查找匹配的里程碑
    const result = checkMilestones(stateRef.current);
    if (result.triggered) {
      const reward = applyMilestoneReward(result.triggered, stateRef.current);
      await updateState(reward);
    } else {
      // 可能是定期话题，只清除不奖励
      await updateState({ pendingMilestoneEvent: null });
    }
  }, [updateState]);

  // ---------- QQ/微信通知检测 ----------
  useEffect(() => {
    let lastHiddenTime = 0;
    const handler = () => {
      if (document.hidden) {
        lastHiddenTime = Date.now();
      } else if (lastHiddenTime > 0) {
        // User returned after being away - simulate notification detection
        const awayMs = Date.now() - lastHiddenTime;
        if (awayMs > 10000 && stateRef.current.currentMode === 'idle' && Math.random() < 0.4) {
          setClickBubble('\u4F60\u597D\u50CF\u6709\u65B0\u6D88\u606F\u4E86\u3002');
          setTimeout(() => setClickBubble(null), 4000);
        }
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [])

  // ---------- 低心境提示 ----------
  const lowMoodBlock = useCallback(
    (intent: string): boolean => {
      if (!isLowMood(stateRef.current)) return false;
      if (intent === "sleep") return false; // 睡觉总是允许
      setClickBubble("Ω在走神，没有注意到你。Ω可能需要休息。");
      setTimeout(() => setClickBubble(null), 3000);
      return true;
    },
    []
  );

  // ---------- 睡眠系统 ----------
  const startSleep = useCallback(async () => {
    setSleeping(true);
    setSleepTimer(60);
    await updateState({ currentMode: "sleep", lastActiveTime: Date.now() });

    sleepIntervalRef.current = setInterval(() => {
      setSleepTimer((prev) => {
        if (prev <= 1) {
          // 睡眠结束
          if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
          sleepIntervalRef.current = null;
          const s = stateRef.current;
          // 恢复心境到 30
          updateState({
            currentMode: "idle",
            mood: Math.max(30, s.mood + 10),
            emotion: "calm_positive",
          }).catch(() => {});
          setSleeping(false);
          setClickBubble("Ω醒了过来，看起来精神了一些。");
          setTimeout(() => setClickBubble(null), 3000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [updateState]);

  // 清理睡眠定时器
  useEffect(() => {
    return () => {
      if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
    };
  }, []);

  // ---------- 聊天/记录刷新 ----------
  async function refreshLog() {
    const log = (await window.omega.state.getSessionLog()) as ChatLine[];
    setSessionLog(log);
  }

  async function openPanel(nextPanel: typeof panel) {
    if (nextPanel && nextPanel !== "clickFeedback") {
      if (lowMoodBlock("panel")) return;
    }
    setPanel(nextPanel);
    if (nextPanel === "record") await refreshLog();
    if (nextPanel === "chat") {
      await updateState({ currentMode: "chatting" });
      await refreshLog();
    }
    wakeUp();
  }

  const closePanel = useCallback(() => {
    setPanel(null);
    setMenu(null);
  }, []);

  // ---------- 发送消息 ----------
  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput("");
    setBusy(true);
    try {
      const response = (await window.omega.ai.sendMessage({
        text,
        includeScreenshot,
      })) as OmegaAIResponse;
      setState(response.state!);
      setMoodFlash(
        `${response.moodDelta >= 0 ? "+" : ""}${response.moodDelta}`
      );
      setTimeout(() => setMoodFlash(null), 1100);
      await refreshLog();
      if (response.featureIntent === "capsule") {
        await window.omega.window.openCapsule();
      }
    } finally {
      setBusy(false);
    }
  }

  // ---------- 太空舱 ----------
  async function openCapsule() {
    if (lowMoodBlock("capsule")) return;
    await window.omega.window.openCapsule();
  }

  // ---------- 游戏锁定文案 ----------
  function lockedGameText() {
    const options = [
      "Ω暂时还没有办法帮你打游戏",
      "Ω不太想帮你打游戏",
      "Ω还没有学会这款游戏",
      "Ω还不知道这是什么游戏",
    ];
    return options[Math.floor(Math.random() * options.length)];
  }

  // ---------- 点击头像 ----------
  function handleAvatarClick(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (isLowMood(stateRef.current)) return; // 低心境时单击无反应
    // 同时触发情感反馈和菜单
    const feedback = getClickFeedback(stateRef.current);
    setClickBubble(feedback);
    setTimeout(() => setClickBubble(null), 4000);
    setMenu(menu ? null : "root");
    wakeUp();
  }

  // ---------- ESC 关闭面板 ----------
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePanel();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closePanel]);

  // 心境值百分比（15-1000 → 0-100%）
  const moodPercentage = Math.max(
    0,
    Math.min(100, ((state.mood - 15) / (1000 - 15)) * 100)
  );

  // 低心境时气泡菜单是否特殊显示
  const moodLocked = isLowMood(state);

  // 待机行为的中文标签
  const idleActionLabel: Record<string, string> = {
    follow_mouse: "看着你这边",
    stare: "望着窗外发呆",
    read: "在看书",
    write: "在写些什么",
    water_plants: "在浇花",
    wooden_sign: "在修理木牌",
    sleep: "在睡觉",
  };

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

      {/* 待机提示气泡 */}
      {idleHint && !panel && !menu && (
        <p className="idle-indicator">
          Ω{idleActionLabel[state.currentIdleAction] ?? "在发呆"}
        </p>
      )}

      {/* 单击反馈气泡 */}
      {clickBubble && (
        <section className="click-bubble">
          <p>{clickBubble}</p>
        </section>
      )}

      {/* 里程碑/定期话题通知气泡 */}
      {state.pendingMilestoneEvent && !panel && (
        <section className="milestone-bubble">
          <p>{state.pendingMilestoneEvent}</p>
          <button
            type="button"
            className="milestone-bubble__dismiss"
            onClick={async (e) => {
              e?.stopPropagation();
              await dismissMilestone();
            }}
          >
            ✓
          </button>
        </section>
      )}

      {/* Ω 角色 */}
      <button
        className={`omega-avatar omega-avatar--${state.emotion} ${
          moodLocked ? "omega-avatar--exhausted" : ""
        }`}
        type="button"
        onClick={handleAvatarClick}
        aria-label="Ω"
        style={{
          transform: `translateX(-50%) translate(${
            (mousePos.x - 0.5) * 8
          }px, ${(mousePos.y - 0.5) * 8}px)`,
          transition: "none",
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: moodLocked ? "not-allowed" : "pointer",
        }}
      >
        <Live2DModel
          modelPath="/live2d/omega/omega.model3.json"
          scale={0.65}
          emotion={state.emotion}
          mousePos={mousePos}
          onClick={() => handleAvatarClick()}
        />
      </button>

      <p className="status-line">
        Ω · {emotionLabel[state.emotion]} · 好感 {state.affinity}
        {state.currentMode === "idle" && idleHint || state.currentMode === "focus" &&
          ` · ${idleActionLabel[state.currentIdleAction] ?? ""}`}
      </p>

      {/* 低心境专属提示 */}
      {moodLocked && !panel && (
        <p className="low-mood-hint">
          Ω看起来很疲惫……点击太空舱让她休息一下吧
        </p>
      )}

      {/* 睡眠倒计时 */}
      {sleeping && (
        <section className="sleep-panel">
          <h2>Ω 正在休息</h2>
          <div className="sleep-countdown">{sleepTimer}s</div>
          <p>醒来后心境值会恢复一些</p>
        </section>
      )}

      {/* 气泡菜单 */}
      {menu === "root" && !sleeping && (
        <nav className="bubble-menu bubble-menu--root">
          <button
            type="button"
            className={moodLocked ? "is-locked" : ""}
            onClick={(e) => {
              e?.stopPropagation();
              if (!lowMoodBlock("input")) openPanel("chat");
            }}
          >
            输入
          </button>
          <button
            type="button"
            className={moodLocked ? "is-locked" : ""}
            onClick={(e) => {
              e?.stopPropagation();
              if (!lowMoodBlock("record")) openPanel("record");
            }}
          >
            记录
          </button>
          <button
            type="button"
            className={moodLocked ? "is-locked" : ""}
            onClick={(e) => {
              e?.stopPropagation();
              if (!lowMoodBlock("tasks")) setMenu("tasks");
            }}
          >
            事项
          </button>
          <button
            type="button"
            className={moodLocked ? "capsule-highlight" : ""}
            onClick={(e) => {
              e?.stopPropagation();
              if (moodLocked) {
                startSleep();
              } else {
                openCapsule();
              }
            }}
          >
            {moodLocked ? "休息（太空舱）" : "太空舱"}
          </button>
        </nav>
      )}

      {menu === "tasks" && !sleeping && (
        <nav className="bubble-menu bubble-menu--tasks">
          <button
            type="button"
            className={moodLocked ? "is-locked" : ""}
            onClick={(e) => {
              e?.stopPropagation();
              if (!lowMoodBlock("alarm")) openPanel("alarm");
            }}
          >
            闹钟
          </button>
          <button
            type="button"
            className={moodLocked ? "is-locked" : ""}
            onClick={(e) => {
              e?.stopPropagation();
              if (!lowMoodBlock("crafting")) openPanel("crafting");
            }}
          >
            合成机
          </button>
          <button
            type="button"
            className={moodLocked ? "is-locked" : ""}
            onClick={(e) => {
              e?.stopPropagation();
              if (!lowMoodBlock("bookshelf")) openPanel("bookshelf");
            }}
          >
            书架
          </button>
          <button
            type="button"
            className={!state.unlocked.game || moodLocked ? "is-locked" : ""}
            onClick={(e) => {
              e?.stopPropagation();
              if (moodLocked) {
                lowMoodBlock("game");
              } else if (state.unlocked.game) {
                openPanel("game");
              } else {
                setClickBubble(lockedGameText());
                setTimeout(() => setClickBubble(null), 3000);
              }
            }}
          >
            游戏
          </button>
          <button
            type="button"
            className={moodLocked ? "is-locked" : ""}
            onClick={(e) => {
              e?.stopPropagation();
              if (!lowMoodBlock("focus")) openPanel("focus");
            }}
          >
            专注模式
          </button>
          <button
            type="button"
            onClick={(e) => {
              e?.stopPropagation();
              setMenu("root");
            }}
          >
            返回
          </button>
        </nav>
      )}

      {/* 聊天面板 */}
      {panel === "chat" && (
        <section className="dialogue-bubble chat-panel" aria-label="Ω 对话">
          <button
            className="dialogue-close"
            type="button"
            aria-label="关闭聊天"
            onClick={(e) => {
              e?.stopPropagation();
              closePanel();
            }}
          >
            ×
          </button>
          <div className="chat-stream" aria-live="polite">
            {recentLines.length === 0 && (
              <p className="empty-copy">Ω正在看着你这边的光。</p>
            )}
            {recentLines.map((line) => (
              <p
                className={`chat-line chat-line--${line.speaker}`}
                key={`${line.createdAt}-${line.text}`}
              >
                <span>
                  {line.speaker === "omega" ? "Ω" : state.nickname || "玩家"}
                </span>
                {line.text}
              </p>
            ))}
            {busy && (
              <p className="chat-line chat-line--omega">
                <span>Ω</span>正在组织语言...
              </p>
            )}
          </div>
          <form className="chat-form" onSubmit={sendMessage}>
            <label className="screen-toggle">
              <input
                type="checkbox"
                checked={includeScreenshot}
                onChange={(event) =>
                  setIncludeScreenshot(event.currentTarget.checked)
                }
              />
              屏幕识别
            </label>
            <input
              value={input}
              onChange={(event) => setInput(event.currentTarget.value)}
              placeholder={
                moodLocked ? "Ω太累了，无法回应……" : "和Ω说话..."
              }
              disabled={moodLocked}
            />
            <button type="submit" disabled={busy || moodLocked}>
              发送
            </button>
          </form>
        </section>
      )}

      {/* 记录面板 */}
      {panel === "record" && (
        <DraggablePanel title="本次记录" onClose={() => closePanel()}>
          <div className="record-list">
            {sessionLog.length === 0 && (
              <p className="empty-copy">本次启动还没有聊天记录。</p>
            )}
            {sessionLog.map((line) => (
              <p key={`${line.createdAt}-${line.text}`}>
                <strong>
                  {line.speaker === "omega" ? "Ω" : state.nickname || "玩家"}：
                </strong>
                {line.text}
              </p>
            ))}
          </div>
        </DraggablePanel>
      )}

      {panel === "bookshelf" && (
        <BookshelfPanel
          state={state}
          updateState={updateState}
          onClose={() => { closePanel(); }}
        />
      )}
      {panel === "game" && (
        <GamePanel
          state={state}
          updateState={updateState}
          onClose={() => { closePanel(); }}
          setClickBubble={setClickBubble}
        />
      )}
      {panel === "crafting" && (
        <CraftingPanel
          state={state}
          updateState={updateState}
          onClose={() => { closePanel(); }}
          setClickBubble={setClickBubble}
        />
      )}
      {panel === "focus" && (
        <FocusPanel
          state={state}
          updateState={updateState}
          closePanel={closePanel}
          setClickBubble={setClickBubble}
        />
      )}

      {panel === "alarm" && (
        <AlarmPanel
          nickname={state.nickname}
          closePanel={closePanel}
          setClickBubble={setClickBubble}
        />
      )}
    </main>
  );
}

/* 闹钟面板组件 */
function AlarmPanel({
  nickname,
  closePanel,
  setClickBubble,
}: {
  nickname: string;
  closePanel: () => void;
  setClickBubble: (msg: string | null) => void;
}) {
  const [mode, setMode] = useState<"countdown" | "fixed">("countdown");
  const [minutes, setMinutes] = useState(5);
  const [alarms, setAlarms] = useState<
    { id: number; label: string; endTime: number; endLabel: string }[]
  >([]);
  const [ringing, setRinging] = useState<number | null>(null);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const alarmIdRef = useRef(0);

  // Set countdown alarm
  const startCountdown = () => {
    if (minutes <= 0) return;
    const id = ++alarmIdRef.current;
    const endTime = Date.now() + minutes * 60_000;
    const label = minutes >= 60
      ? `${Math.floor(minutes / 60)}小时${minutes % 60 > 0 ? (minutes % 60) + '分' : ''}后`
      : `${minutes}分钟后`;
    setAlarms((prev) => [...prev, { id, label, endTime, endLabel: `${nickname || '玩家'}，时间到了。` }]);

    const timer = setTimeout(() => {
      setRinging(id);
      setClickBubble(`${nickname || '玩家'}，时间到了。`);
      setTimeout(() => setClickBubble(null), 5000);
    }, minutes * 60_000);
    timersRef.current.set(id, timer);
  };

  // Snooze
  const snooze = (id: number) => {
    // Clear the ringing
    setRinging((prev) => (prev === id ? null : prev));
    setClickBubble(null);
    // Set a new 5-min alarm
    const newMinutes = 5;
    const newId = ++alarmIdRef.current;
    const endTime = Date.now() + newMinutes * 60_000;
    setAlarms((prev) => [...prev, { id: newId, label: '5分钟后', endTime, endLabel: `${nickname || '玩家'}，时间到了。` }]);
    const timer = setTimeout(() => {
      setRinging(newId);
      setClickBubble(`${nickname || '玩家'}，时间到了。`);
      setTimeout(() => setClickBubble(null), 5000);
    }, newMinutes * 60_000);
    timersRef.current.set(newId, timer);
  };

  // Cancel alarm
  const cancelAlarm = (id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
    setAlarms((prev) => prev.filter((a) => a.id !== id));
    if (ringing === id) setRinging(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  return (
    <section className="floating-panel compact-panel alarm-panel">
      <h2>闹钟</h2>

      {/* 设置区域 */}
      <div className="alarm-setup">
        <div className="alarm-mode-toggle">
          <button
            type="button"
            className={mode === "countdown" ? "alarm-mode--active" : ""}
            onClick={() => setMode("countdown")}
          >
            倒计时
          </button>
        </div>

        {mode === "countdown" && (
          <div className="alarm-input-row">
            <input
              type="number"
              min={1}
              max={1440}
              value={minutes}
              onChange={(e) => setMinutes(Math.max(1, Math.min(1440, parseInt(e.target.value) || 5)))}
            />
            <span>分钟</span>
            <button type="button" onClick={startCountdown} className="alarm-set-btn">
              设置
            </button>
          </div>
        )}
      </div>

      <p className="alarm-remark">
        你不能听见我说话，我只能在时间到了的时候跟你打招呼，你确定要让我叫你吗？
      </p>

      {/* 闹钟列表 */}
      {alarms.length > 0 && (
        <div className="alarm-list">
          <strong>进行中：</strong>
          {alarms.map((alarm) => (
            <div key={alarm.id} className={`alarm-item ${ringing === alarm.id ? 'alarm-ringing' : ''}`}>
              <span>{ringing === alarm.id ? '🔔 ' : ''}{alarm.label}</span>
              <div className="alarm-item-actions">
                {ringing === alarm.id && (
                  <button type="button" className="alarm-snooze-btn" onClick={() => snooze(alarm.id)}>
                    5分钟后再叫我
                  </button>
                )}
                <button type="button" className="alarm-cancel-btn" onClick={() => cancelAlarm(alarm.id)}>
                  取消
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={(e) => { e?.stopPropagation(); closePanel(); }}>
        关闭
      </button>
    </section>
  );
}

/* 专注模式面板组件 */
function FocusPanel({
  state,
  updateState,
  closePanel,
  setClickBubble,
}: {
  state: OmegaState;
  updateState: (partial: Partial<OmegaState>) => Promise<OmegaState>;
  closePanel: () => void;
  setClickBubble: (msg: string | null) => void;
}) {
  const [focusing, setFocusing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accumulatedRef = useRef(state.totalFocusTime);
  const showDuration = useRef(false);
  const [, forceUpdate] = useState(0);

  const startFocus = async () => {
    setFocusing(true);
    setElapsed(0);
    showDuration.current = false;
    await updateState({
      currentMode: "focus",
      currentIdleAction: "stare",
    });
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  };

  const showDuration_ = () => {
    showDuration.current = true;
    forceUpdate((n) => n + 1);
  };

  const stopFocus = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setFocusing(false);
    // 保存累计时长
    const total = accumulatedRef.current + elapsed;
    accumulatedRef.current = total;
    await updateState({
      currentMode: "idle",
      totalFocusTime: total,
    });
    setClickBubble(`这次专注了 ${Math.floor(elapsed / 60)} 分 ${elapsed % 60} 秒`);
    setTimeout(() => setClickBubble(null), 3000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <section className="floating-panel compact-panel">
      <h2>专注模式</h2>
      {!focusing ? (
        <>
          <p>
            Ω会安静地在一旁陪着你。累计专注时长：
            {Math.floor(accumulatedRef.current / 60)} 分 {accumulatedRef.current % 60} 秒
          </p>
          <div className="focus-actions">
            <button type="button" onClick={(e) => { e?.stopPropagation(); startFocus(); }}>
              开始专注
            </button>
            <button type="button" onClick={(e) => { e?.stopPropagation(); closePanel(); }}>
              退出
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="focus-timer">
            专注中…… {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
          </p>
          <div className="focus-actions">
            <button type="button" onClick={(e) => { e?.stopPropagation(); showDuration_(); }}>
              时长
            </button>
            <button type="button" onClick={(e) => { e?.stopPropagation(); stopFocus(); }}>
              退出
            </button>
          </div>
          {showDuration.current && (
            <p className="focus-total">
              累计专注时长：{Math.floor(accumulatedRef.current / 60)} 分 {accumulatedRef.current % 60} 秒
            </p>
          )}
        </>
      )}
    </section>
  );
}

/* 可拖动面板组件 */
function DraggablePanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState({ x: 60, y: 120 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    const handleMove = (ev: MouseEvent) => {
      if (dragging.current)
        setPos({ x: ev.clientX - offset.current.x, y: ev.clientY - offset.current.y });
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
    <section
      className="floating-panel record-panel"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={handleMouseDown}
    >
      <header>
        <h2>{title}</h2>
        <button type="button" onClick={() => onClose()}>
          收起
        </button>
      </header>
      {children}
    </section>
  );
}
