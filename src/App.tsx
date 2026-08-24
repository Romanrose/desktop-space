import { useEffect, useMemo, useState } from "react";
import { CapsuleWindow } from "./components/CapsuleWindow";
import { FloatingWindow } from "./components/FloatingWindow";
import { useRef } from "react";
import type { OmegaState } from "./types";
import { applyPassiveMoodGain, applyOnlineMoodTick } from "./systems/passiveMood";
import { createDiary, getNextDiaryAt, isDiaryDue } from "./systems/writing";

const fallbackState: OmegaState = {
  nickname: "",
  prologueDone: false,
  mood: 30,
  affinity: 0,
  emotion: "calm_negative",
  currentMode: "prologue",
  unlocked: {
    activeGreeting: false,
    cleanCapsule: false,
    game: false,
    writing: false,
    bookshelf: false,
    construction: false,
    gardening: false,
  },
  sessionStartTime: Date.now(),
  lastActiveTime: Date.now(),
  totalFocusTime: 0,
  pendingStoryComplete: false,
  capsuleBackgroundDirty: true,
  currentIdleAction: "stare",
  completedMilestones: [],
  lastGreetingTime: 0,
  pendingMilestoneEvent: null,
  purchasedItems: [],
  capsuleDecoration: {},
  equippedDecorations: {},
  room2Unlocked: false,
  room2Furniture: {},
  stories: [],
  lastWritingAt: 0,
  idleActionStart: Date.now(),
  idleActionDuration: 120_000,
  genshinDiscussed: false,
  totalGenshinMs: 0,
};

export function App() {
  const [state, setState] = useState<OmegaState>(fallbackState);
  const [loaded, setLoaded] = useState(false);
  const diaryGenerationInFlight = useRef(false);
  const [viewParam, setViewParam] = useState(
    () => new URLSearchParams(window.location.search).get("view")
  );
  const view = useMemo(
    () => viewParam ?? (state.prologueDone ? "floating" : "capsule"),
    [state.prologueDone, viewParam]
  );

  useEffect(() => {
    window.omega.state.getOmegaState().then((nextState) => {
      setState(nextState);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    const syncView = () =>
      setViewParam(new URLSearchParams(window.location.search).get("view"));
    window.addEventListener("popstate", syncView);
    return () => window.removeEventListener("popstate", syncView);
  }, []);

  // M7 日记由时间驱动：启动时补写逾期内容，并在下一次到期时自动生成。
  useEffect(() => {
    if (!loaded) return;
    const writingUnlocked = (state.completedMilestones ?? []).includes("m7_writing") && state.mood >= 200;
    if (!writingUnlocked) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const writeDueDiary = async () => {
      if (cancelled || diaryGenerationInFlight.current) return;
      diaryGenerationInFlight.current = true;
      try {
        const current = await window.omega.state.getOmegaState();
        if (!isDiaryDue(current)) return;

        const memories = await window.omega.memory.getSummaries();
        // 读取记忆是异步的；写入前重新检查，避免并发状态更新重复生成日记。
        const latest = await window.omega.state.getOmegaState();
        if (!isDiaryDue(latest)) return;

        const diary = createDiary(latest, memories);
        const next = await window.omega.state.updateOmegaState({
          stories: [...(latest.stories ?? []), diary].slice(-999),
          lastWritingAt: diary.createdAt,
        });
        if (!cancelled) setState(next);
      } catch (error) {
        console.warn("[Writing] unable to create due diary", error);
        if (!cancelled) retryTimer = setTimeout(() => void writeDueDiary(), 60_000);
      } finally {
        diaryGenerationInFlight.current = false;
      }
    };

    if (isDiaryDue(state)) {
      void writeDueDiary();
    } else {
      const delay = Math.max(0, getNextDiaryAt(state) - Date.now());
      retryTimer = setTimeout(() => void writeDueDiary(), delay);
    }

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [loaded, state.completedMilestones, state.lastWritingAt, state.mood]);

  // 离线补算（应用加载时） + 在线持续 tick（每 60 秒）
  useEffect(() => {
    async function applyOfflineGain() {
      const s = await window.omega.state.getOmegaState();
      const update = applyPassiveMoodGain(s);
      if (update._message) {
        console.log("[PassiveMood]", update._message);
        await window.omega.state.updateOmegaState({
          mood: update.mood,
          lastActiveTime: update.lastActiveTime ?? Date.now(),
        });
      } else {
        await window.omega.state.updateOmegaState({
          lastActiveTime: Date.now(),
        });
      }
      const next = await window.omega.state.getOmegaState();
      setState(next);
    }

    async function applyOnlineTick() {
      const s = await window.omega.state.getOmegaState();
      const update = applyOnlineMoodTick(s);
      if (update.lastActiveTime !== s.lastActiveTime || (update.mood !== undefined && update.mood !== s.mood)) {
        await window.omega.state.updateOmegaState(update);
        const next = await window.omega.state.getOmegaState();
        setState(next);
      }
    }

    // 初始加载时执行离线补算
    void applyOfflineGain();

    // 之后每 60 秒执行在线 tick
    const interval = setInterval(() => void applyOnlineTick(), 60_000);
    return () => clearInterval(interval);
  }, []);

  async function updateState(partial: Partial<OmegaState>) {
    const next = await window.omega.state.updateOmegaState(partial);
    setState(next);
    return next;
  }

  if (!loaded) {
    return (
      <div className="loading-screen-game">
        <div className="loading-screen-game__content">
          <h1 className="loading-screen-game__title">DESKTOP SPACE</h1>
          <p className="loading-screen-game__subtitle">Calibrating dimensional bridge...</p>
          <div className="loading-screen-game__bar"><div className="loading-screen-game__bar-fill" /></div>
        </div>
      </div>
    );
  }

  if (view === "capsule") {
    return <CapsuleWindow state={state} updateState={updateState} />;
  }

  return (
    <>
      {/* starfield background removed */}
      <FloatingWindow
        state={state}
        setState={setState}
        updateState={updateState}
      />
    </>
  );
}
