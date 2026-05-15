import type { OmegaBridge } from "../electron/preload";

export type OmegaEmotion =
  | "calm_positive"
  | "calm_negative"
  | "happy"
  | "shy"
  | "sad"
  | "proud";

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
  screenshotCaptured: boolean;
};

export type OmegaState = {
  nickname: string;
  prologueDone: boolean;
  mood: number;
  affinity: number;
  emotion: OmegaEmotion;
  currentMode: "idle" | "chatting" | "capsule" | "prologue";
  floatingPosition?: { x: number; y: number };
  unlocked: {
    activeGreeting: boolean;
    cleanCapsule: boolean;
    game: boolean;
    writing: boolean;
  };
};

declare global {
  interface Window {
    omega: OmegaBridge;
  }
}
