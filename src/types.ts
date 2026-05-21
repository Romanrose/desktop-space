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
  state: OmegaState;
  screenshotCaptured?: boolean;
};

export type OmegaState = {
  nickname: string;
  prologueDone: boolean;
  mood: number;               // 心境值 15-1000
  affinity: number;           // 好感度 >=0
  emotion: OmegaEmotion;
  currentMode: "idle" | "chatting" | "capsule" | "prologue" | "focus" | "sleep";
  floatingPosition?: { x: number; y: number };
  unlocked: {
    activeGreeting: boolean;
    cleanCapsule: boolean;
    game: boolean;
    writing: boolean;
    bookshelf: boolean;       // 新增
    construction: boolean;    // 新增
  };
  sessionStartTime: number;
  lastActiveTime: number;
  totalFocusTime: number;
  pendingStoryComplete: boolean;
  capsuleBackgroundDirty: boolean; // true=脏乱，false=整洁
};