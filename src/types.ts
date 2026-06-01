// 这是你的全局类型定义文件
// 所有在多个组件中使用的类型都应该在这里定义

export type OmegaEmotion =
  | "calm_positive"
  | "calm_negative"
  | "happy"
  | "shy"
  | "sad"
  | "proud"
  | "excited"
  | "fearful";

export type FeatureIntent = "alarm" | "focus" | "capsule" | "game" | null;

export type ChatLine = {
  speaker: "player" | "omega";
  text: string;
  createdAt: string;
};

export type OmegaAIResponse = {
  reply: string;
  emotion: OmegaEmotion;
  moodDelta: number;
  affinityDelta: number;
  memorySummary?: string;
  featureIntent?: FeatureIntent;
  state?: OmegaState;
};

export type OmegaState = {
  nickname: string;
  prologueDone: boolean;
  mood: number;
  affinity: number;
  emotion: OmegaEmotion;
  currentMode: "idle" | "chatting" | "capsule" | "prologue" | "focus" | "sleep";
  floatingPosition?: { x: number; y: number };
  unlocked: {
    activeGreeting: boolean;
    cleanCapsule: boolean;
    game: boolean;
    writing: boolean;
    bookshelf: boolean;
    construction: boolean;
  };
  sessionStartTime: number;
  lastActiveTime: number;
  totalFocusTime: number;
  pendingStoryComplete: boolean;
  capsuleBackgroundDirty: boolean;
};

export type PersistedData = {
  state: OmegaState;
  memories: string[];
};

// 全局window.omega类型声明
declare global {
  interface Window {
    omega: {
      state: {
        getSessionLog: () => Promise<ChatLine[]>;
      };
      ai: {
        sendMessage: (payload: { text: string; includeScreenshot: boolean }) => Promise<
          OmegaAIResponse & { state: OmegaState }
        >;
      };
      window: {
        openCapsule: () => Promise<void>;
      };
    };
  }
}

export {};