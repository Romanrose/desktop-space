import type { ChatLine, OmegaAIResponse, OmegaState } from "./types";

const defaultState: OmegaState = {
  nickname: "",
  prologueDone: false,
  mood: 20,
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
    gardening: false
  },
  purchasedItems: [],
  capsuleDecoration: {},
  equippedDecorations: {},
  stories: [],
  room2Unlocked: false,
  room2Furniture: {},
  sessionStartTime: Date.now(),
  lastActiveTime: Date.now(),
  totalFocusTime: 0,
  pendingStoryComplete: false,
  capsuleBackgroundDirty: true,
  currentIdleAction: "stare",
  idleActionStart: Date.now(),
  idleActionDuration: 120000,
  completedMilestones: [],
  lastGreetingTime: 0,
  pendingMilestoneEvent: null,
};

const stateKey = "omega.browser.state";
const memoryKey = "omega.browser.memories";
const sessionLog: ChatLine[] = [];

function loadState(): OmegaState {
  const raw = localStorage.getItem(stateKey);
  if (!raw) return defaultState;
  try {
    const parsed = JSON.parse(raw) as Partial<OmegaState>;
    return {
      ...defaultState,
      ...parsed,
      unlocked: { ...defaultState.unlocked, ...parsed.unlocked }
    };
  } catch {
    return defaultState;
  }
}

function saveState(state: OmegaState) {
  localStorage.setItem(stateKey, JSON.stringify(state));
}

function loadMemories(): string[] {
  const raw = localStorage.getItem(memoryKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMemories(memories: string[]) {
  localStorage.setItem(memoryKey, JSON.stringify(memories.slice(-100)));
}

function forceMockAI() {
  return localStorage.getItem("omega.browser.forceMock") === "1";
}

function routeTo(view: "floating" | "capsule") {
  const next = new URL(window.location.href);
  next.searchParams.set("view", view);
  window.history.replaceState(null, "", next);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function inferReply(text: string, state: OmegaState): OmegaAIResponse {
  const featureIntent = /太空舱|房间|舱/.test(text)
    ? "capsule"
    : /专注|学习|工作/.test(text)
      ? "focus"
      : /闹钟|提醒|叫我|计时/.test(text)
        ? "alarm"
        : /游戏|原神|每日|体力/.test(text)
          ? "game"
          : null;
  const sad = /难过|累|烦|孤独|讨厌|哭|sad|tired/i.test(text);
  const happy = /开心|喜欢|谢谢|太好了|可爱|棒|happy|love/i.test(text);
  const emotion = sad ? "sad" : happy ? "happy" : featureIntent === "capsule" ? "proud" : "calm_positive";
  const moodDelta = sad ? -1 : 1;
  const affinityDelta = sad ? 0 : 1;
  const nextState: OmegaState = {
    ...state,
    mood: Math.max(15, Math.min(1000, state.mood + moodDelta)),
    affinity: Math.max(0, state.affinity + affinityDelta),
    emotion,
    unlocked: {
      ...state.unlocked,
      activeGreeting: state.unlocked.activeGreeting || state.mood + moodDelta > 50
    }
  };
  const reply =
    featureIntent === "capsule"
      ? "我可以回太空舱看看。那里还有很多地方没整理好，不过有你在，我会慢慢来。"
      : featureIntent === "focus"
        ? "那我陪你安静一会儿。你做你的事，我在旁边看书。"
        : featureIntent === "alarm"
          ? "可以。我现在还不能真的发出声音，但我会认真记住这件事。"
          : featureIntent === "game"
            ? "游戏功能还没有完全解锁。我需要先认识那款游戏。"
            : sad
              ? "我听见了。太空舱安静得有些过分，所以我知道那种不太好受的感觉。"
              : happy
                ? "嗯，我也有一点开心。像是舱壁上的灯忽然稳定了一些。"
                : "我在。你说的话会被我认真收起来。";

  return {
    reply,
    emotion,
    moodDelta,
    affinityDelta,
    memorySummary: text.length > 8 ? `玩家提到：${text.slice(0, 80)}` : undefined,
    featureIntent,
    state: nextState,
    screenshotCaptured: false
  };
}

async function cloudReply(text: string, state: OmegaState): Promise<OmegaAIResponse | null> {
  if (forceMockAI()) return null;
  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        memories: loadMemories()
      })
    });
    if (!response.ok) return null;
    const ai = (await response.json()) as Omit<OmegaAIResponse, "state" | "screenshotCaptured">;
    return {
      ...ai,
      state: {
        ...state,
        mood: Math.max(15, Math.min(1000, state.mood + ai.moodDelta)),
        affinity: Math.max(0, state.affinity + ai.affinityDelta),
        emotion: ai.emotion,
        unlocked: {
          ...state.unlocked,
          activeGreeting: state.unlocked.activeGreeting || state.mood + ai.moodDelta > 50
        }
      },
      screenshotCaptured: false
    };
  } catch {
    return null;
  }
}

export function installBrowserBridge() {
  if (window.omega) return;

  window.omega = {
    window: {
      openCapsule: async () => routeTo("capsule"),
      closeCapsule: async () => routeTo("floating"),
      showFloating: async () => routeTo("floating"),
      hideFloating: async () => undefined,
      setFloatingPosition: async () => undefined,
      quit: async () => undefined
    },
    state: {
      getOmegaState: async () => loadState(),
      updateOmegaState: async (partialState: unknown) => {
        const partial = partialState as Partial<OmegaState>;
        const current = loadState();
        const next = {
          ...current,
          ...partial,
          unlocked: { ...current.unlocked, ...partial.unlocked }
        };
        saveState(next);
        return next;
      },
      getSessionLog: async () => [...sessionLog]
    },
    memory: {
      saveSummary: async (summary: string) => {
        const memories = loadMemories();
        if (summary.trim()) memories.push(summary.trim());
        saveMemories(memories);
        return memories;
      },
      getSummaries: async () => loadMemories()
    },
    ai: {
      sendMessage: async ({ text }: { text: string; includeScreenshot: boolean }) => {
        const createdAt = new Date().toISOString();
        sessionLog.push({ speaker: "player", text, createdAt });
        const state = loadState();
        const response = (await cloudReply(text, state)) ?? inferReply(text, state);
      if (response.state) saveState(response.state);
        if (response.memorySummary) {
          const memories = loadMemories();
          memories.push(response.memorySummary);
          saveMemories(memories);
        }
        sessionLog.push({ speaker: "omega", text: response.reply, createdAt: new Date().toISOString() });
      return response as OmegaAIResponse & { state: OmegaState };
      }
    }
  };
}
