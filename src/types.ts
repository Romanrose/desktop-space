// 类型定义文件
// 包含游戏中的所有共享类型和 window.omega 全局声明

export type OmegaEmotion =
  | "calm_positive"
  | "calm_negative"
  | "happy"
  | "shy"
  | "sad"
  | "proud"
  | "excited"
  | "fearful";

/** 待机行为类型 */
export type OmegaIdleAction =
  | "follow_mouse"
  | "stare"
  | "read"
  | "write"
  | "water_plants"
  | "wooden_sign"
  | "sleep";

/** 亲密度档位 */
export type AffectionLevel = "low" | "medium" | "high";

export type OmegaStory = {
  id: string;
  kind?: "diary" | "story";
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
  narrativeChoices?: string[];
  emotion: OmegaEmotion;
  moodDelta: number;
  affinityDelta: number;
  memorySummary?: string;
  featureIntent?: FeatureIntent;
  state?: OmegaState;
  screenshotCaptured?: boolean;
  screenContext?: string;
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
  /** 已购买物品 ID 列表 */
  purchasedItems: string[];
  /** 太空舱装饰映射 slot->value */
  capsuleDecoration: Record<string, string>;
  /** 已装备装饰 slot -> recipeId */
  equippedDecorations: Record<string, string>;
  /** Ω 写的故事 */
  stories: OmegaStory[];
  /** 最近一次由 Ω 写日记的时间；M7 日记每两天至多生成一次 */
  lastWritingAt: number;
  /** 房间2是否解锁 */
  room2Unlocked: boolean;
  /** room2 furniture positions */
  room2Furniture: Record<string, { x: number; y: number }>;
  sessionStartTime: number;
  lastActiveTime: number;
  totalFocusTime: number;
  pendingStoryComplete: boolean;
  capsuleBackgroundDirty: boolean;
  /** 当前待机行为 */
  currentIdleAction: OmegaIdleAction;
  /** 待机行为开始时间戳 */
  idleActionStart: number;
  /** 待机行为持续时间 ms */
  idleActionDuration: number;
  /** 已完成的里程碑 ID 列表 */
  completedMilestones: string[];
  /** 上次打招呼时间 */
  lastGreetingTime: number;
  /** 待处理的里程碑事件 */
  pendingMilestoneEvent: string | null;
  /** M6：是否与 Ω 聊到过原神 */
  genshinDiscussed: boolean;
  /** M6：Ω 在线期间原神累计运行时长 ms */
  totalGenshinMs: number;
};

export type PersistedData = {
  state: OmegaState;
  memories: string[];
};

// window.omega 全局声明
declare global {
  interface Window {
    omega: {
      window: {
        openCapsule: () => Promise<void>;
        closeCapsule: () => Promise<void>;
        showFloating: () => Promise<void>;
        hideFloating: () => Promise<void>;
        setFloatingPosition: (x: number, y: number) => Promise<void>;
        setResizable: (resizable: boolean) => Promise<void>;
        quit: () => Promise<void>;
      };
      state: {
        getOmegaState: () => Promise<OmegaState>;
        updateOmegaState: (partialState: Partial<OmegaState>) => Promise<OmegaState>;
        getSessionLog: () => Promise<ChatLine[]>;
        clearChatMemory: () => Promise<boolean>;
      };
      memory: {
        saveSummary: (summary: string) => Promise<string[]>;
        getSummaries: () => Promise<string[]>;
      };
      ai: {
        sendMessage: (payload: { text: string; includeScreenshot: boolean }) => Promise<OmegaAIResponse & { state: OmegaState }>;
      };
      /** 提词器 Agent：根据 Ω 的发言生成玩家回复选项 */
      options?: {
        generate: (omegaText: string, history?: ChatLine[]) => Promise<string[]>;
      };
      /** vision 思考中提示 */
      onOmegaThinking?: (callback: (msg: string) => void) => () => void;

    /** 代打服务：引擎封装在后端，前端只与 Ω 角色交互 */
    gamebot: {
      start: () => Promise<{ success: boolean; error?: string; pid?: number }>;
      stop: () => Promise<{ success: boolean; error?: string }>;
      status: () => Promise<{
        running: boolean;
        engineReady: boolean;
        currentTask: string | null;
        pid: number | null;
        startedAt: number | null;
      }>;
      runTask: (taskId: string) => Promise<{ success: boolean; taskId: string; message: string; error?: string }>;
      stopTask: () => Promise<{ success: boolean; taskId: string; message: string } | null>;
    };
  }
  }
}

export {};
