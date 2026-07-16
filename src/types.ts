// 杩欐槸浣犵殑鍏ㄥ眬绫诲瀷瀹氫箟鏂囦欢
// 鎵€鏈夊湪澶氫釜缁勪欢涓娇鐢ㄧ殑绫诲瀷閮藉簲璇ュ湪杩欓噷瀹氫箟

export type OmegaEmotion =
  | "calm_positive"
  | "calm_negative"
  | "happy"
  | "shy"
  | "sad"
  | "proud"
  | "excited"
  | "fearful";

/** 寰呮満鐘舵€佷笅 惟 鍙兘鎵ц鐨勯殢鏈鸿涓?*/
export type OmegaIdleAction =
  | "follow_mouse"
  | "stare"
  | "read"
  | "write"
  | "water_plants"
  | "wooden_sign"
  | "sleep";

/** 浜插瘑搴︽。浣?*/
export type AffectionLevel = "low" | "medium" | "high";

export type OmegaStory = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  favorite: boolean;
};

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
  screenshotCaptured?: boolean;
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
    gardening: boolean;
  };
  /** 宸茶喘涔扮殑鍚堟垚鏈虹墿鍝?ID 鍒楄〃 */
  purchasedItems: string[];
  /** 澶┖鑸辫楗扮姸鎬?*/
  capsuleDecoration: Record<string, string>;
  /** 褰撳墠閰嶈鐨勫お绌鸿埍瑁呴グ锛宻lot -> recipeId */
  equippedDecorations: Record<string, string>;
  /** 惟 鍐欒繃鐨勬晠浜嬪垪琛?*/
  stories: OmegaStory[];
  /** 绗簩鎴块棿鏄惁宸茶В閿?*/
  room2Unlocked: boolean;
  /** room2 furniture positions */
  room2Furniture: Record<string, { x: number; y: number }>;
  sessionStartTime: number;
  lastActiveTime: number;
  totalFocusTime: number;
  pendingStoryComplete: boolean;
  capsuleBackgroundDirty: boolean;
  /** 褰撳墠姝ｅ湪鎵ц鐨勫緟鏈鸿涓?*/
  currentIdleAction: OmegaIdleAction;
  /** 褰撳墠琛屼负鐨勫紑濮嬫椂闂存埑 */
  idleActionStart: number;
  /** 褰撳墠琛屼负鐨勬寔缁椂闂达紙ms锛?*/
  idleActionDuration: number;
  /** 宸插畬鎴愮殑閲岀▼纰戝垪琛?*/
  completedMilestones: string[];
  /** 鏈€杩戜竴娆′富鍔ㄦ墦鎷涘懠鐨勬椂闂存埑 */
  lastGreetingTime: number;
  /** 寰呭鐞嗙殑閲岀▼纰戜簨浠舵皵娉?*/
  pendingMilestoneEvent: string | null;
};

export type PersistedData = {
  state: OmegaState;
  memories: string[];
};

// 鍏ㄥ眬 window.omega 绫诲瀷澹版槑
declare global {
  interface Window {
    omega: {
      window: {
        openCapsule: () => Promise<void>;
        closeCapsule: () => Promise<void>;
        showFloating: () => Promise<void>;
        hideFloating: () => Promise<void>;
        setFloatingPosition: (x: number, y: number) => Promise<void>;
        quit: () => Promise<void>;
      };
      state: {
        getOmegaState: () => Promise<OmegaState>;
        updateOmegaState: (partialState: Partial<OmegaState>) => Promise<OmegaState>;
        getSessionLog: () => Promise<ChatLine[]>;
      };
      memory: {
        saveSummary: (summary: string) => Promise<string[]>;
        getSummaries: () => Promise<string[]>;
      };
      ai: {
        sendMessage: (payload: { text: string; includeScreenshot: boolean }) => Promise<OmegaAIResponse & { state: OmegaState }>;
      };
    };
  }
}

export {};

