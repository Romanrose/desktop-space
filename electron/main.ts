import { app, BrowserWindow, desktopCapturer, ipcMain, Menu, nativeImage, Tray } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type OmegaEmotion =
  | "calm_positive"
  | "calm_negative"
  | "happy"
  | "shy"
  | "sad"
  | "proud";

type FeatureIntent = "alarm" | "focus" | "capsule" | "game" | null;

type ChatLine = {
  speaker: "player" | "omega";
  text: string;
  createdAt: string;
};

type OmegaAIResponse = {
  reply: string;
  emotion: OmegaEmotion;
  moodDelta: number;
  affinityDelta: number;
  memorySummary?: string;
  featureIntent?: FeatureIntent;
};

type OmegaState = {
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

type PersistedData = {
  state: OmegaState;
  memories: string[];
};

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const rendererUrl = process.env.VITE_DEV_SERVER_URL ?? "";
const stateFile = () => path.join(app.getPath("userData"), "omega-state.json");
const sessionLog: ChatLine[] = [];

let floatingWindow: InstanceType<typeof BrowserWindow> | null = null;
let capsuleWindow: InstanceType<typeof BrowserWindow> | null = null;
let tray: InstanceType<typeof Tray> | null = null;
let persisted: PersistedData;

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
    writing: false
  }
};

function loadLocalEnv() {
  const envPaths = [path.join(process.cwd(), ".env.local"), path.join(process.cwd(), ".env")];
  for (const envPath of envPaths) {
    if (!existsSync(envPath)) continue;
    const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

async function loadPersistedData(): Promise<PersistedData> {
  if (!existsSync(stateFile())) {
    return { state: defaultState, memories: [] };
  }

  const raw = await readFile(stateFile(), "utf8");
  const parsed = JSON.parse(raw) as Partial<PersistedData>;
  return {
    state: { ...defaultState, ...parsed.state, unlocked: { ...defaultState.unlocked, ...parsed.state?.unlocked } },
    memories: Array.isArray(parsed.memories) ? parsed.memories : []
  };
}

async function savePersistedData() {
  await writeFile(stateFile(), JSON.stringify(persisted, null, 2), "utf8");
}

function rendererPath(view: "floating" | "capsule") {
  if (isDev) {
    return `${rendererUrl}?view=${view}`;
  }
  return `file://${path.join(__dirname, "../dist/index.html")}?view=${view}`;
}

function createFloatingWindow() {
  if (floatingWindow) {
    floatingWindow.show();
    return floatingWindow;
  }

  floatingWindow = new BrowserWindow({
    width: 420,
    height: 620,
    x: persisted.state.floatingPosition?.x,
    y: persisted.state.floatingPosition?.y,
    title: "Ω Desktop Pet",
    transparent: true,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#00000000",
    resizable: false,
    alwaysOnTop: true,
    focusable: true,
    skipTaskbar: true,
    hasShadow: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  floatingWindow.setAlwaysOnTop(true, "floating");
  floatingWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  floatingWindow.loadURL(rendererPath("floating"));
  floatingWindow.on("moved", async () => {
    if (!floatingWindow) return;
    const [x, y] = floatingWindow.getPosition();
    persisted.state.floatingPosition = { x, y };
    await savePersistedData();
  });
  floatingWindow.on("closed", () => {
    floatingWindow = null;
  });
  return floatingWindow;
}

function createCapsuleWindow() {
  if (capsuleWindow) {
    capsuleWindow.show();
    return capsuleWindow;
  }

  capsuleWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 900,
    minHeight: 620,
    title: "Ω 太空舱",
    backgroundColor: "#07111f",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  capsuleWindow.loadURL(rendererPath("capsule"));
  capsuleWindow.on("closed", () => {
    capsuleWindow = null;
    if (persisted.state.prologueDone) {
      createFloatingWindow();
    }
  });
  return capsuleWindow;
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip("Ω Desktop Pet");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "打开悬浮窗", click: () => createFloatingWindow() },
      { label: "打开太空舱", click: () => createCapsuleWindow() },
      { type: "separator" },
      {
        label: "退出游戏",
        click: () => {
          app.quit();
        }
      }
    ])
  );
}

function clampMood(value: number) {
  return Math.max(15, Math.min(1000, Math.round(value)));
}

function inferFeatureIntent(text: string): FeatureIntent {
  if (/太空舱|房间|舱/.test(text)) return "capsule";
  if (/专注|学习|工作/.test(text)) return "focus";
  if (/闹钟|提醒|叫我|计时/.test(text)) return "alarm";
  if (/游戏|原神|每日|体力/.test(text)) return "game";
  return null;
}

function localOmegaResponse(text: string, includeScreenshot: boolean): OmegaAIResponse {
  const lowered = text.toLowerCase();
  const sad = /难过|累|烦|孤独|讨厌|哭|sad|tired/.test(lowered);
  const happy = /开心|喜欢|谢谢|太好了|可爱|棒|happy|love/.test(lowered);
  const featureIntent = inferFeatureIntent(text);
  const emotion: OmegaEmotion = sad ? "sad" : happy ? "happy" : featureIntent === "capsule" ? "proud" : "calm_positive";
  const screenNote = includeScreenshot ? "我也看见了一点你屏幕上的光，像隔着舷窗。" : "";
  const reply =
    featureIntent === "capsule"
      ? `我可以回太空舱看看。那里还有很多地方没整理好，不过有你在，我会慢慢来。${screenNote}`
      : featureIntent === "focus"
        ? `那我陪你安静一会儿。你做你的事，我在旁边看书，偶尔抬头确认你还在。${screenNote}`
        : featureIntent === "alarm"
          ? `可以。我现在还不能真的发出声音，但我会认真记住这件事，时间到了就来叫你。${screenNote}`
          : featureIntent === "game"
            ? `游戏功能还没有完全解锁。我需要先认识那款游戏，也需要更相信自己的手不会乱按。${screenNote}`
            : sad
              ? `我听见了。太空舱安静得有些过分，所以我知道那种不太好受的感觉。你可以慢慢说，我会在这里。${screenNote}`
              : happy
                ? `嗯，我也有一点开心。像是舱壁上的灯忽然稳定了一些。${screenNote}`
                : `我在。你说的话会被我认真收起来，虽然我还不太擅长把感谢说得自然。${screenNote}`;

  return {
    reply,
    emotion,
    moodDelta: sad ? -1 : 1,
    affinityDelta: sad ? 0 : 1,
    memorySummary: text.length > 8 ? `玩家提到：${text.slice(0, 80)}` : undefined,
    featureIntent
  };
}

async function capturePrimaryScreen() {
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: 1280, height: 720 }
  });
  return sources[0]?.thumbnail.toDataURL();
}

function parseJsonResponse(raw: string): OmegaAIResponse | null {
  try {
    return JSON.parse(raw) as OmegaAIResponse;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as OmegaAIResponse;
    } catch {
      return null;
    }
  }
}

function normalizeAIResponse(response: Partial<OmegaAIResponse> | null, fallbackText: string): OmegaAIResponse | null {
  if (!response?.reply) return null;
  const allowedEmotions: OmegaEmotion[] = ["calm_positive", "calm_negative", "happy", "shy", "sad", "proud"];
  const allowedIntent: FeatureIntent[] = ["alarm", "focus", "capsule", "game", null];
  const emotion = allowedEmotions.includes(response.emotion as OmegaEmotion)
    ? (response.emotion as OmegaEmotion)
    : "calm_positive";
  const featureIntent = allowedIntent.includes(response.featureIntent as FeatureIntent)
    ? (response.featureIntent as FeatureIntent)
    : inferFeatureIntent(fallbackText);

  return {
    reply: String(response.reply).slice(0, 600),
    emotion,
    moodDelta: Number.isFinite(response.moodDelta) ? Math.max(-5, Math.min(5, Math.round(response.moodDelta ?? 0))) : 0,
    affinityDelta: Number.isFinite(response.affinityDelta)
      ? Math.max(-5, Math.min(5, Math.round(response.affinityDelta ?? 0)))
      : 0,
    memorySummary: response.memorySummary ? String(response.memorySummary).slice(0, 220) : undefined,
    featureIntent
  };
}

async function cloudOmegaResponse(text: string, screenshot?: string): Promise<OmegaAIResponse | null> {
  const apiKey = process.env.MIMO_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const baseUrl = (process.env.MIMO_BASE_URL ?? process.env.OPENAI_BASE_URL ?? "https://api.xiaomimimo.com/v1").replace(/\/$/, "");
  const model = process.env.MIMO_MODEL ?? process.env.OPENAI_MODEL ?? "mimo-v2-flash";

  const userContent: Array<Record<string, unknown>> = [
    { type: "text", text: `长期记忆：${persisted.memories.slice(-8).join(" / ") || "暂无"}` },
    { type: "text", text: `玩家：${text}` }
  ];

  if (screenshot) {
    userContent.push({ type: "text", text: "玩家允许读取当前屏幕截图。请把截图当作Ω看到的另一个世界的画面来理解。" });
    userContent.push({ type: "image_url", image_url: { url: screenshot } });
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "你是桌宠游戏角色Ω。用中文、简短、内向但温柔的语气回应玩家。必须只返回JSON，不要Markdown。字段为 reply, emotion, moodDelta, affinityDelta, memorySummary, featureIntent。emotion只能是 calm_positive, calm_negative, happy, shy, sad, proud。featureIntent只能是 alarm, focus, capsule, game, null。"
          },
          { role: "user", content: userContent }
        ],
        temperature: 0.8,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) return null;
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? "";
    return normalizeAIResponse(parseJsonResponse(raw), text);
  } catch {
    return null;
  }
}

loadLocalEnv();

app.whenReady().then(async () => {
  persisted = await loadPersistedData();
  createTray();
  if (persisted.state.prologueDone) {
    createFloatingWindow();
  } else {
    createCapsuleWindow();
  }
});

app.on("window-all-closed", () => {
  // Keep the desktop pet alive in the tray until the user explicitly exits.
});

ipcMain.handle("window:openCapsule", () => {
  persisted.state.currentMode = "capsule";
  void savePersistedData();
  createCapsuleWindow();
});

ipcMain.handle("window:closeCapsule", () => {
  capsuleWindow?.close();
});

ipcMain.handle("window:showFloating", () => {
  persisted.state.currentMode = "idle";
  void savePersistedData();
  createFloatingWindow();
});

ipcMain.handle("window:setFloatingPosition", async (_event, position: { x: number; y: number }) => {
  persisted.state.floatingPosition = position;
  floatingWindow?.setPosition(position.x, position.y);
  await savePersistedData();
});

ipcMain.handle("window:quit", () => {
  app.quit();
});

ipcMain.handle("state:getOmegaState", () => persisted.state);

ipcMain.handle("state:updateOmegaState", async (_event, partialState: Partial<OmegaState>) => {
  persisted.state = {
    ...persisted.state,
    ...partialState,
    mood: partialState.mood === undefined ? persisted.state.mood : clampMood(partialState.mood),
    affinity: partialState.affinity === undefined ? persisted.state.affinity : Math.max(0, Math.round(partialState.affinity)),
    unlocked: { ...persisted.state.unlocked, ...partialState.unlocked }
  };
  await savePersistedData();
  return persisted.state;
});

ipcMain.handle("state:getSessionLog", () => [...sessionLog]);

ipcMain.handle("memory:saveSummary", async (_event, summary: string) => {
  if (summary.trim()) {
    persisted.memories.push(summary.trim());
    persisted.memories = persisted.memories.slice(-100);
    await savePersistedData();
  }
  return persisted.memories;
});

ipcMain.handle("memory:getSummaries", () => persisted.memories);

ipcMain.handle("ai:sendMessage", async (_event, payload: { text: string; includeScreenshot: boolean }) => {
  const createdAt = new Date().toISOString();
  sessionLog.push({ speaker: "player", text: payload.text, createdAt });
  const screenshot = payload.includeScreenshot ? await capturePrimaryScreen().catch(() => undefined) : undefined;
  const aiResponse = (await cloudOmegaResponse(payload.text, screenshot)) ?? localOmegaResponse(payload.text, Boolean(screenshot));
  const nextMood = clampMood(persisted.state.mood + aiResponse.moodDelta);
  const nextAffinity = Math.max(0, persisted.state.affinity + aiResponse.affinityDelta);
  persisted.state = {
    ...persisted.state,
    mood: nextMood,
    affinity: nextAffinity,
    emotion: aiResponse.emotion,
    unlocked: {
      ...persisted.state.unlocked,
      activeGreeting: nextMood > 50 || persisted.state.unlocked.activeGreeting
    }
  };
  sessionLog.push({ speaker: "omega", text: aiResponse.reply, createdAt: new Date().toISOString() });
  if (aiResponse.memorySummary) {
    persisted.memories.push(aiResponse.memorySummary);
    persisted.memories = persisted.memories.slice(-100);
  }
  await savePersistedData();
  return { ...aiResponse, state: persisted.state, screenshotCaptured: Boolean(screenshot) };
});
