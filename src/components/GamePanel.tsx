/**
 * Ω 代打工作台
 *
 * 前端只与 Ω 角色交互，代打引擎由 Electron 后端封装。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { OmegaState } from "../types";

type Props = {
  state: OmegaState;
  updateState: (partial: Partial<OmegaState>) => Promise<OmegaState>;
  onClose: () => void;
  setClickBubble: (msg: string | null) => void;
};

type BotStatus = {
  running: boolean;
  engineReady: boolean;
  currentTask: string | null;
};

const TASKS: Array<{ id: string; label: string; emoji: string; desc: string }> = [
  { id: "daily", label: "每日委托", emoji: "✦", desc: "日常任务一条龙" },
  { id: "resin", label: "清空体力", emoji: "◉", desc: "把今天的体力用掉" },
  { id: "domain", label: "秘境速刷", emoji: "◆", desc: "快速清理秘境" },
  { id: "fishing", label: "自动钓鱼", emoji: "≈", desc: "帮你盯住鱼漂" },
  { id: "wood", label: "自动伐木", emoji: "⌖", desc: "收集木材建材" },
  { id: "auto_pick", label: "自动拾取", emoji: "●", desc: "掉落物不遗漏" },
  { id: "auto_skip", label: "剧情跳过", emoji: "»", desc: "重复对话快速过" },
];

const TASK_LABELS: Record<string, string> = Object.fromEntries(
  TASKS.map((t) => [t.id, t.label])
);

export default function GamePanel({ state, updateState, onClose, setClickBubble }: Props) {
  const [busyTask, setBusyTask] = useState<string | null>(null);
  const [botStatus, setBotStatus] = useState<BotStatus>({
    running: false,
    engineReady: false,
    currentTask: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef = useRef(false);
  const updateStateRef = useRef(updateState);
  updateStateRef.current = updateState;

  const refreshStatus = useCallback(async () => {
    if (!window.omega?.gamebot) return;
    try {
      const s = await window.omega.gamebot.status();
      setBotStatus({
        running: s.running,
        engineReady: s.engineReady,
        currentTask: s.currentTask,
      });
      if (s.currentTask) {
        busyRef.current = true;
        setBusyTask(s.currentTask);
      } else {
        const justFinished = busyRef.current;
        busyRef.current = false;
        setBusyTask(null);
        if (justFinished) {
          await updateStateRef.current({ emotion: "happy", lastActiveTime: Date.now() });
        }
      }
    } catch {
      /* 忽略状态轮询错误 */
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
    pollRef.current = setInterval(() => void refreshStatus(), 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refreshStatus]);

  const speak = useCallback((msg: string) => {
    setClickBubble(msg);
    setTimeout(() => setClickBubble(null), 3200);
  }, [setClickBubble]);


  const handleRunTask = useCallback(async (taskId: string) => {
    if (busyTask || starting || !window.omega?.gamebot) return;
    setError(null);
    setStarting(true);
    try {
      const r = await window.omega.gamebot.runTask(taskId);
      if (r.success) {
        setBusyTask(taskId);
        busyRef.current = true;
        speak(`好，${TASK_LABELS[taskId]}交给我。你歇一会儿。`);
        await updateState({ emotion: "proud", lastActiveTime: Date.now() });
      } else {
        setError(r.message);
        speak(r.message);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setStarting(false);
    }
  }, [busyTask, starting, speak, updateState]);

  const handleQuickStart = useCallback(() => {
    void handleRunTask("daily");
  }, [handleRunTask]);

  const handleStopTask = useCallback(async () => {
    if (!window.omega?.gamebot) return;
    try {
      const r = await window.omega.gamebot.stopTask();
      if (r) {
        setBusyTask(null);
        busyRef.current = false;
        speak(r.message);
      }
    } catch {
      /* ignore */
    }
  }, [speak]);

  const handleForceStop = useCallback(async () => {
    if (!window.omega?.gamebot) return;
    setError(null);
    try {
      const r = await window.omega.gamebot.stop();
      setBusyTask(null);
      busyRef.current = false;
      if (r?.success) {
        speak("代理已强制停止");
      } else {
        const message = r?.error || "代理停止失败";
        setError(message);
        speak(message);
      }
    } catch (err) {
      setError(String(err));
    }
  }, [speak]);

  const statusText = busyTask
    ? `正在处理${TASK_LABELS[busyTask] ?? busyTask}`
    : starting
      ? "正在准备……"
      : botStatus.engineReady
        ? "随时可以开工"
        : "随时可以开工";

  const statusClass = busyTask ? "working" : starting ? "starting" : "ready";

  return (
    <section className="floating-panel compact-panel game-panel game-bot-panel">
      <h2>Ω 的代打工作台</h2>

      <div className="game-bot__omega">
        <div className="game-bot__avatar">Ω</div>
        <div className="game-bot__status">
          <span className={`game-bot__dot game-bot__dot--${statusClass}`} />
          <span>{statusText}</span>
        </div>
      </div>

      {error && <p className="game-bot__error">{error}</p>}


      {busyTask || starting ? (
        <div className="game-bot__working">
          <div className="game-bot__spinner" />
          <p>{starting ? "Ω 正在做准备……" : `Ω 正在处理${TASK_LABELS[busyTask!] ?? "任务"}……`}</p>
          {busyTask && (
            <button type="button" className="game-bot__stop-btn" onClick={(e) => { e?.stopPropagation(); handleStopTask(); }}>
              让 Ω 停下
            </button>
          )}
        </div>
      ) : (
        <div className="game-bot__tasks">
          <button
            type="button"
            className="game-bot__task game-bot__task--quick"
            onClick={(e) => { e?.stopPropagation(); handleQuickStart(); }}
          >
            <span className="game-bot__task-icon">▶</span>
            <span className="game-bot__task-body">
              <strong>一键开始</strong>
              <small>日常一条龙</small>
            </span>
          </button>
          {TASKS.map((task) => (
            <button
              key={task.id}
              type="button"
              className="game-bot__task"
              onClick={(e) => { e?.stopPropagation(); handleRunTask(task.id); }}
            >
              <span className="game-bot__task-icon">{task.emoji}</span>
              <span className="game-bot__task-body">
                <strong>{task.label}</strong>
                <small>{task.desc}</small>
              </span>
            </button>
          ))}
        </div>
      )}

      <p className="game-bot__footnote">好感度 {state.affinity} · Ω 会看好这台游戏机</p>

      <div className="game-bot__panel-actions">
        <button
          type="button"
          className="game-bot__kill-btn"
          onClick={(e) => { e?.stopPropagation(); handleForceStop(); }}
        >
          强制停止代理
        </button>
        <button type="button" onClick={(e) => { e?.stopPropagation(); onClose(); }}>
          关闭
        </button>
      </div>
    </section>
  );
}
