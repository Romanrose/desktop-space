import { useEffect, useMemo, useState } from "react";
import { CapsuleWindow } from "./components/CapsuleWindow";
import { FloatingWindow } from "./components/FloatingWindow";
import type { OmegaState } from "./types";
import { applyPassiveMoodGain } from "./systems/passiveMood";

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
  idleActionStart: Date.now(),
  idleActionDuration: 120_000,
};

export function App() {
  const [state, setState] = useState<OmegaState>(fallbackState);
  const [loaded, setLoaded] = useState(false);
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

  // ---------- 琚姩蹇冨鍊煎闀?----------
  useEffect(() => {
    async function applyGain() {
      const s = await window.omega.state.getOmegaState();
      const update = applyPassiveMoodGain(s);
      if (update._message) {
        console.log("[PassiveMood]", update._message);
        await window.omega.state.updateOmegaState({
          mood: update.mood,
          lastActiveTime: update.lastActiveTime ?? Date.now(),
        });
      } else {
        // 鍗充娇娌℃湁鏀剁泭涔熸洿鏂?lastActiveTime
        await window.omega.state.updateOmegaState({
          lastActiveTime: Date.now(),
        });
      }
      // 閲嶆柊璇诲彇 state
      const next = await window.omega.state.getOmegaState();
      setState(next);
    }

    void applyGain();

    // 姣?30 鍒嗛挓妫€鏌ヤ竴娆?
    const interval = setInterval(() => void applyGain(), 30 * 60_000);
    return () => clearInterval(interval);
  }, []);

  async function updateState(partial: Partial<OmegaState>) {
    const next = await window.omega.state.updateOmegaState(partial);
    setState(next);
    return next;
  }

  if (!loaded) {
    return (
      <div className="loading-screen">鎯?姝ｅ湪鏍″噯缁村害杞崲鍣?..</div>
    );
  }

  if (view === "capsule") {
    return <CapsuleWindow state={state} updateState={updateState} />;
  }

  return (
    <FloatingWindow
      state={state}
      setState={setState}
      updateState={updateState}
    />
  );
}

