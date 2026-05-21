import { useEffect, useMemo, useState } from "react";
import { CapsuleWindow } from "./components/CapsuleWindow";
import { FloatingWindow } from "./components/FloatingWindow";
import type { OmegaState } from "./types";

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
    construction: false
  },
  sessionStartTime: Date.now(),
  lastActiveTime: Date.now(),
  totalFocusTime: 0,
  pendingStoryComplete: false,
  capsuleBackgroundDirty: true
};

export function App() {
  const [state, setState] = useState<OmegaState>(fallbackState);
  const [loaded, setLoaded] = useState(false);
  const [viewParam, setViewParam] = useState(() => new URLSearchParams(window.location.search).get("view"));
  const view = useMemo(() => viewParam ?? (state.prologueDone ? "floating" : "capsule"), [state.prologueDone, viewParam]);

  useEffect(() => {
    window.omega.state.getOmegaState().then((nextState) => {
      setState(nextState as OmegaState);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    const syncView = () => setViewParam(new URLSearchParams(window.location.search).get("view"));
    window.addEventListener("popstate", syncView);
    return () => window.removeEventListener("popstate", syncView);
  }, []);

  async function updateState(partial: Partial<OmegaState>) {
    const next = (await window.omega.state.updateOmegaState(partial)) as OmegaState;
    setState(next);
    return next;
  }

  if (!loaded) {
    return <div className="loading-screen">Ω 正在校准维度转译器...</div>;
  }

  if (view === "capsule") {
    return <CapsuleWindow state={state} updateState={updateState} />;
  }

  return <FloatingWindow state={state} setState={setState} updateState={updateState} />;
}