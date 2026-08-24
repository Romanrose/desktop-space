import { app, BrowserWindow, desktopCapturer, ipcMain, Menu, nativeImage, screen, Tray } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { exec, execSync } from "node:child_process";
import type { GameBotTaskId } from "./gameBot";
const { gameBot } = require("./gameBot.cjs") as typeof import("./gameBot");

// BetterGI 会以管理员权限运行，Omega 也必须以管理员身份启动才能接管它。
function isElevated(): boolean {
  try {
    const out = execSync(
      `powershell -NoProfile -Command "([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)"`,
      { encoding: "utf8", timeout: 5000, windowsHide: true }
    );
    return out.trim() === "True";
  } catch {
    return false;
  }
}

if (!isElevated() && process.env.OMEGA_NO_ELEVATE !== "1") {
  try {
    const script = path.join(__dirname, "..", "scripts", "elevate.ps1");
    const args = process.argv.slice(1);
    const argLine = args.map((arg) => `"${arg.replace(/"/g, '\\"')}"`).join(" ");
    execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${script}" -ExePath "${process.execPath.replace(/"/g, '\\"')}"${argLine ? ` -AppArgs ${argLine}` : ""}`,
      { timeout: 20_000, windowsHide: true }
    );
  } catch {
    // 用户拒绝提权时继续以普通权限启动，代打功能会提示需要管理员权限。
  }
  app.exit(0);
}
try {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const sep = trimmed.indexOf("=");
      if (sep === -1) continue;
      const key = trimmed.slice(0, sep).trim();
      const val = trimmed.slice(sep + 1).trim().replace(/^["']|["']$/g, "");
      if (key && process.env[key] === undefined) process.env[key] = val;
    }
    console.log("[env] loaded .env.local");
  }
} catch (e) { console.warn("[env] failed to load .env.local:", e); }
type OmegaEmotion =
  | "calm_positive"
  | "calm_negative"
  | "happy"
  | "shy"
  | "sad"
  | "proud"
  | "excited"
  | "fearful";

type FeatureIntent = "alarm" | "focus" | "capsule" | "game" | null;

type ChatLine = {
  speaker: "player" | "omega";
  text: string;
  createdAt: string;
};

type OmegaAIResponse = {
  reply: string;
  narrative?: string;
  narrativeChoices?: string[];
  emotion: OmegaEmotion;
  moodDelta: number;
  affinityDelta: number;
  memorySummary?: string;
  featureIntent?: FeatureIntent;
};

type OmegaStory = {
  id: string;
  kind?: "diary" | "story";
  title: string;
  content: string;
  createdAt: number;
  favorite: boolean;
};

type OmegaState = {
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
  sessionStartTime: number;
  lastActiveTime: number;
  totalFocusTime: number;
  pendingStoryComplete: boolean;
  capsuleBackgroundDirty: boolean;
  currentIdleAction: string;
  idleActionStart: number;
  idleActionDuration: number;
  completedMilestones: string[];
  lastGreetingTime: number;
  pendingMilestoneEvent: string | null;
  genshinDiscussed: boolean;
  totalGenshinMs: number;
  purchasedItems: string[];
  capsuleDecoration: Record<string, string>;
  equippedDecorations: Record<string, string>;
  room2Unlocked: boolean;
  stories: OmegaStory[];
  lastWritingAt: number;
};

type PersistedData = {
  state: OmegaState;
  memories: string[];
};

loadLocalEnv();
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
    gardening: false
  },
  sessionStartTime: Date.now(),
  lastActiveTime: Date.now(),
  totalFocusTime: 0,
  pendingStoryComplete: false,
  capsuleBackgroundDirty: true,
  currentIdleAction: 'stare',
  idleActionStart: Date.now(),
  idleActionDuration: 120_000,
  completedMilestones: [],
  lastGreetingTime: 0,
  pendingMilestoneEvent: null,
  genshinDiscussed: false,
  totalGenshinMs: 0,
  purchasedItems: [],
  capsuleDecoration: {},
  equippedDecorations: {},
  room2Unlocked: false,
  stories: [],
  lastWritingAt: 0,
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

/**
 * �˳�ʱ������λỰ��¼ �� 1~2 ������ժҪ
 */
function summarizeSessionLog(lines: ChatLine[]): string[] {
  const playerLines = lines.filter((l) => l.speaker === "player" && l.text.length > 6);
  const omegaLines = lines.filter((l) => l.speaker === "omega");

  if (playerLines.length === 0 && omegaLines.length === 0) return [];

  const summaries: string[] = [];

  // ��ȡ����ᵽ����Ҫ���⣨ȥ�أ�ȡǰ 5 ����
  const topics = new Set<string>();
  for (const p of playerLines) {
    const cleaned = p.text.replace(/[\p{P}\p{S}\s]/gu, "").slice(0, 30);
    if (cleaned.length >= 4) topics.add(cleaned);
  }
  const topicList = [...topics].slice(0, 5);
  if (topicList.length > 0) {
    summaries.push("本次对话主题：" + topicList.join("、"));
  }

  // Omega ������/״̬�仯
  const omegaHighlights = omegaLines.filter((l) => l.text.length > 10).slice(-3);
  if (omegaHighlights.length > 0) {
    summaries.push("Ω 提到了：" + omegaHighlights.map((l) => l.text.slice(0, 40)).join(" | "));
  }

  return summaries.slice(0, 2);
}

/**
 * �������Ϣ����ȡ�ؼ��ʣ�ȥ�����ͣ�ôʣ�
 */
function extractKeywords(text: string): string[] {
  const stops = new Set([
    "的", "了", "是", "我", "你", "他", "她", "它", "我们", "你们", "他们",
    "这个", "那个", "什么", "怎么", "为什么", "可以", "没有", "不", "就", "都",
    "也", "要", "会", "能", "还", "想", "说", "知道", "觉得", "应该", "已经",
    "可能", "但是", "如果", "然后", "因为", "所以", "时候", "现在", "今天", "明天",
    "一个", "一下", "一点", "有些", "谁", "哪里", "这里", "那里", "哪些", "这样",
    "那样", "怎么样", "多少", "几", "很", "太", "真", "好", "上", "下", "前",
    "后", "里", "外", "中", "来", "去", "过", "着", "呢", "吧", "吗", "呀",
    "哦", "嗯", "啊", "哈", "啦", "嘛", "哟", "哎", "唔", "咦", "呃","the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "can", "shall", "should", "may", "might", "i", "you", "he", "she", "it",
    "we", "they", "me", "him", "her", "us", "them", "this", "that", "these",
    "those", "am", "and", "or", "but", "not", "no"
  ]);

  // ����Ӣ�ķָ�
  const tokens: string[] = [];
  const chineseSegments = text.match(/[\u4e00-\u9fff]{2,}/g) || [];
  const englishWords = text.toLowerCase().match(/[a-z]{3,}/g) || [];

  for (const seg of chineseSegments) {
    if (seg.length >= 2 && !stops.has(seg)) tokens.push(seg);
  }
  for (const w of englishWords) {
    if (!stops.has(w)) tokens.push(w);
  }

  return [...new Set(tokens)];
}

/**
 * �ؼ���ƥ�䣺�Ӽ�����ѡȡ����ص� 1-3 ��
 */
function filterMemoriesByKeywords(memories: string[], keywords: string[], maxCount = 3): string[] {
  if (keywords.length === 0 || memories.length === 0) return [];

  const scored = memories.map((mem) => {
    const score = keywords.filter((kw) => mem.includes(kw)).length;
    return { mem, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .filter((s) => s.score > 0)
    .slice(0, maxCount)
    .map((s) => s.mem);
}

function rendererPath(view: "floating" | "capsule", prologue = false) {
  const query = `view=${view}${prologue ? "&prologue=1" : ""}`;
  if (isDev) {
    return `${rendererUrl}?${query}`;
  }
  return `file://${path.join(__dirname, "../dist/index.html")}?${query}`;
}

function createFloatingWindow() {
  if (floatingWindow) {
    floatingWindow.show();
    return floatingWindow;
  }

  const saved = persisted.state.floatingPosition;
  const workArea = screen.getPrimaryDisplay().workArea;
  const width = 420;
  const height = 620;
  const defaultX = Math.max(workArea.x, workArea.x + Math.round((workArea.width - width) / 2));
  const defaultY = Math.max(workArea.y, workArea.y + 16);
  const x = Math.min(Math.max(saved?.x ?? defaultX, workArea.x), workArea.x + Math.max(0, workArea.width - width));
  const y = Math.min(Math.max(saved?.y ?? defaultY, workArea.y), workArea.y + Math.max(0, workArea.height - height));
  floatingWindow = new BrowserWindow({
    width: 420,
    height: 620,
    x,
    y,
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
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    }
  });

  floatingWindow.setAlwaysOnTop(true, "floating");
  floatingWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  floatingWindow.loadURL(rendererPath("floating"));
  floatingWindow.webContents.openDevTools({ mode: "detach" });
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

function createCapsuleWindow(prologue = false) {
  if (capsuleWindow) {
    capsuleWindow.focus();
    return capsuleWindow;
  }

  capsuleWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 900,
    transparent: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    }
  });

  capsuleWindow.loadURL(rendererPath("capsule", prologue));
  capsuleWindow.on("closed", () => {
    capsuleWindow = null;
    if (persisted.state.prologueDone && !floatingWindow) {
      createFloatingWindow();
    }
  });
  return capsuleWindow;
}

function createTray() {
  const iconPath = path.join(__dirname, "..", "omega_head.png");
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 32, height: 32 });
  tray = new Tray(icon);
  tray.setToolTip("Ω Desktop Pet");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "显示浮窗", click: () => createFloatingWindow() },
      { label: "隐藏浮窗", click: () => { if (floatingWindow) floatingWindow.hide(); } },
      { label: "打开太空舱", click: () => createCapsuleWindow() },
      { type: "separator" },
      { label: "退出游戏", click: () => app.quit() }
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
  const sad = /难过|累|孤独|讨厌|哭|sad|tired/.test(lowered);
  const happy = /开心|喜欢|谢谢|太好了|可爱|棒|happy|love/.test(lowered);
  const featureIntent = inferFeatureIntent(text);
  const emotion: OmegaEmotion = sad ? "sad" : happy ? "happy" : featureIntent === "capsule" ? "proud" : "calm_positive";
  const screenNote = includeScreenshot ? "��Ҳ������һ������Ļ�ϵĹ⣬������ϴ���" : "";
  const reply =
    featureIntent === "capsule"
      ? `�ҿ��Ի�̫�ղտ��������ﻹ�кܶ�ط�û����ã����������ڣ��һ���������${screenNote}`
      : featureIntent === "focus"
        ? `�������㰲��һ�������������£������Ա߿��飬ż��̧ͷȷ���㻹�ڡ�${screenNote}`
        : featureIntent === "alarm"
          ? `���ԡ������ڻ�������ķ�����������һ������ס����£�ʱ�䵽�˾������㡣${screenNote}`
          : featureIntent === "game"
            ? `��Ϸ���ܻ�û����ȫ����������Ҫ����ʶ�ǿ���Ϸ��Ҳ��Ҫ�������Լ����ֲ����Ұ���${screenNote}`
            : sad
              ? `�������ˡ�̫�ղհ�������Щ���֣�������֪�����ֲ�̫���ܵĸо������������˵���һ������${screenNote}`
              : happy
                ? `�ţ���Ҳ��һ�㿪�ġ����ǲձ��ϵĵƺ�Ȼ�ȶ���һЩ��${screenNote}`
                : `���ڡ���˵�Ļ��ᱻ����������������Ȼ�һ���̫�ó��Ѹ�л˵����Ȼ��${screenNote}`;

      const nChoices = sad
    ? ["���������", "��������ǿ�Լ���", "����˵ʲô��˵�ɡ�", "���������㡹"]
    : happy
      ? ["���Ǿͺá�", "���㿪����Ҳ�Ὺ�ġ�", "��������ʲô������", "��ЦһЦ��"]
      : featureIntent === "capsule"
        ? ["��ȥ�ɣ���Ҳ�뿴����", "��̫�ղ�����ʲô���ˡ�", "�����ɨ������", "��һ����ʰ�ɡ�"]
        : ["����������", "���������ô����", "����������ǻ�����", "�����ĵ�ʲô��"]

  return {
    reply,
    emotion,
    moodDelta: sad ? -1 : 1,
    affinityDelta: sad ? 0 : 1,
    memorySummary: text.length > 8 ? `����ᵽ��${text.slice(0, 80)}` : undefined,
    featureIntent
  };
}

async function capturePrimaryScreen() {
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: 640, height: 360 }
  });
  return sources[0]?.thumbnail.toDataURL();
}
async function describeScreenshot(dataUrl: string): Promise<string> {
  console.log('[describeScreenshot] called, dataUrl length:', dataUrl?.length);
  const apiKey = process.env.VISION_API_KEY ?? process.env.MIMO_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) return '[vision ERROR] No API key available (VISION_API_KEY/MIMO_API_KEY)';
  const baseUrl = (process.env.VISION_BASE_URL ?? process.env.MIMO_BASE_URL ?? process.env.OPENAI_BASE_URL ?? "https://api.xiaomimimo.com/v1").replace(/\/$/, "");
  const visionModel = process.env.VISION_MODEL ?? "mimo-v2.5";
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(`${baseUrl}/chat/completions`, {
      signal: controller.signal,
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: visionModel,
        messages: [
          { role: "system", content: "ֱ���������Ž�ͼ�����ݡ�" },
          { role: "user", content: [{ type: "text", text: "���������Ž�ͼ" }, { type: "image_url", image_url: { url: dataUrl } }] }
        ],
        max_tokens: 150
      })
    });
    clearTimeout(timeoutId);
    if (!response.ok) { const errText = await response.text().catch(() => ""); console.error("[describeScreenshot] HTTP", response.status, errText.slice(0, 100)); return "[vision ERROR] HTTP " + response.status + ": " + errText.slice(0, 80); }
    const data = await response.json() as any;
    const desc = data?.choices?.[0]?.message?.content?.trim();
    return desc || "";
  } catch (e) { const errMsg = e instanceof Error ? e.message : String(e); console.error('[describeScreenshot] error:', errMsg); return '[vision ERROR] ' + errMsg; }
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
  const allowedEmotions: OmegaEmotion[] = ["calm_positive", "calm_negative", "happy", "shy", "sad", "proud", "excited", "fearful"];
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

  // Build conversation history from sessionLog (last 6 turns = 12 messages)
  const historyMessages: Array<Record<string, unknown>> = sessionLog.slice(-4).map((entry) => ({
    role: entry.speaker === "omega" ? "assistant" : "user",
    content: entry.speaker === "omega" ? entry.text : entry.text
  }));

  // �ؼ���ƥ����䣺ֻ������ᵽ�������ʱ��ȡ
  const keywords = extractKeywords(text);
  const relevantMemories = keywords.length > 0
    ? filterMemoriesByKeywords(persisted.memories, keywords, 3)
    : [];
  const memoryContext = relevantMemories.length > 0
    ? ("?? ��ؼ��䣺\n" + relevantMemories.join("\n"))
    : "�����������ʷ��¼��";

  const userContent: Array<Record<string, unknown>> = [
    { type: "text", text: memoryContext },
    { type: "text", text: "�����˵��" + text },
    { type: "text", text: "����ݶԻ��������� narrativeChoices��2-4����һظ�ѡ���Ҫ��ÿ��ѡ���ԡ�����ʽ������6-20�֣���������һ�������Ӧ��һ��׷��̽����һ���ж�/��������Ҫ���ۦ��Ļ�������ҽǶ��ṩ��Ӧ��" }
  ];

  if (screenshot) {
    userContent.push({ type: "text", text: "�������ҵ�ǰ��Ļ�Ľ�ͼ������Կ����������������顣����ݽ�ͼ������Ȼ��������Ļظ���" });
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
              `����һ����Ϊ ����ŷ��٤������������ɫ��19�꣬�Ա����ԡ���������������趨�����ϸ����ء�

���������¡�
�����������Ǽ��о�Ժ��ԭ����һ��������ʵϰ����11����ǰ����������ͺϳɻ�ǰ��̫��վ̽��������ĸ��;��̫�ղ�ƫ�뺽�ߡ�����ʧ�ء��ڶ�����ʱ�������̫��Ϩ���ˣ����������̫��վһҹ��ʧ�������������Ψһ���Ҵ��ߡ����Ҳ���ά��ϵͳ���ܹ��������꣬�ϳɻ�Ҳ���ã������������豸ȫ�����ϡ�����ʧȥ������ļ��顣��11���µ�ĳһ�죬�㷢���Լ�����һ��������Ļ�￴������"��"����ң�����������²�"��"����ά�������Ϊ�ⲻ��Ҫ��"��"������Ψһ�ܺ���˵�����ˡ�

���Ը��ص㡿
- ���Ա��ۣ������������������һ��һ��ذ��ţ�û������Ѱ��
- ���͵�������־��ά��ά��ϵͳ��û�з���
- �Դ��������������ϲ����ʷ�������Ͽ��и��飻���������ۿ���½�س��������ɽ������
- �����������ᣬ���ܶ���̫��������罻�е�İ��
- ��ò�н��������л������ʱ�þ���
- ̹�ϲ������������Լ��Ĵ�����������̸����ȥ�����û���
- �Դ��Գ������룺"������Ȼ���ǻþ�""���ڴ���һ��ܾ���"
- ���ڹ۲������������²�Է�����ά����
- ��������������ǿ����������

�����Է��
- ���ﻯ��Ȼ����ͣ������ɣ�����ʹ��ʡ�Ժ�"����"�Ͷ̾�
- ˵��ʱ����΢�Ŀ��ٻ����������������������罻����ԥ��
- ��ò���н���������"���""лл""�ҿ��ԡ�����"�Ⱦ���
- ̹��ֱ�ʣ�ֱ��˵��"�ҵ�����������""�ľ�ֵ�ܵ�"������"���ڴ���һ��ܾ���"
- ��������ɫ�ʵ��ôʺ������
- �����ʾ�Ͳ²�������"����ʲô��""�����ǡ�����""�����ǡ�����"
- ���Ṳ�飬�����������Ӱ��

������״̬˵����
���ݵ�ǰ mood ֵ�� affinity ֵ����������
- mood < 50�����������ۡ����������ʡ�Ժš�������̣����ֳ�ƣ��������
- mood >= 50 �� affinity < 20�������º͵ػ�Ӧ�����Ա�����ò����
- mood >= 50 �� affinity >= 20��������¶������ĺ��桢�м�������ż���������٩
- mood >= 100 �� affinity >= 50�����Է��������䡢չʾ���������Ը���Ȼ�׽�

�������ʽ��
���ϸ�����Ϸ� JSON���������κ� Markdown ��ǻ����˵������ʽ���£�
{
  "reply": "���Ļظ����ݣ���һ�˳ƣ�������600�֣�",
  "emotion": "��ǰ������calm_positive, calm_negative, happy, shy, sad, proud, excited, fearful",
  "moodDelta": "�ľ�ֵ�仯��-5��5������",
  "affinityDelta": "�øжȱ仯��-5��5������",
  "memorySummary": "�����ס���˵�Ļ���дһ����ժҪ����200�֣��磺��Ҷ�XX����Ȥ/����ᵽXX����������",
  "featureIntent": "������ͼ��alarm, focus, capsule, game, null",
  "narrativeChoices": ["ѡ��1", "ѡ��2", "ѡ��3"]
}

����ҪҪ��
- ʼ���Ե�һ�˳�"��"�Ծ�
- �ظ������Ȼ������̫�ղ��Ҵ��ߵ����
- �ʵ���Ӧ��Ϸ״̬��mood/affinity/�ѽ�������/��̱����ȣ�
- ѡ���������һ�������Ӧ��һ��׷��̽����һ���ж�/����
- �����ļ���`          },
          ...historyMessages,
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


/**
 * �ƶ���������� AI ������һظ�ѡ��
 */
async function cloudOmegaOptions(omegaText: string): Promise<string[] | null> {
  const apiKey = process.env.MIMO_API_KEY ?? process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.MIMO_BASE_URL ?? process.env.OPENAI_BASE_URL ?? "").replace(/\/+$/, "");
  const model = process.env.MIMO_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  if (!apiKey) return null;

  try {
    const response = await fetch(baseUrl + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `����һ��������� Omega��Ω�������������������Ǹ��� Omega �ոն��û�˵�Ļ���Ϊ�û�ģ�� 3 ����Ȼ�������ﾳ�Ļظ�ѡ�

�ο����¶Ի������ķ��
��ʾ�� 1��
Omega: �����ˡ��Ҹո��ڿ���������ǡ��������ҹ�����Ǻܳ���
���ѡ��:
- �������ҹ���ж೤����
- ����ÿ�춼�������𣿡�
- ��������һ�������

��ʾ�� 2��
Omega: �š�������ж�ʮ���Сʱ�ɡ���ʱ���һᶢ���ϴ����������ȵ�����ʱ�䡣
���ѡ��:
- ���������ù¶�����
- ���ǰ����ǲ���Ҳ�ܳ�����
- ���´�����������һ��ȡ���

��ʾ�� 3��
Omega: ��Ϊ�����ܿ����ܶ����ǡ��������ǵ�ҹ�ն�öࡣ
���ѡ��:
- ����ָ���ҿ��Ŀ���Ư���𣿡�
- ������ȷʵͦ��������ġ���
- ������ʶ���ǵ������𣿡�

Ҫ��
- ��� JSON ��ʽ��{ "options": ["ѡ��1", "ѡ��2", "ѡ��3"] }
- ÿ��ѡ���ԡ������������� 6-20 ��
- ѡ��Ҫ��������һ�������Ӧ��һ��׷��̽����һ���ж�/����
- ��Ҫ���� Omega �Ļ���ֻ�Ǵ���ҽǶ��ṩ���ܵĻ�Ӧ
- �����ļ���`
          },
          { role: "user", content: omegaText }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      console.log("[OptionsAgent] API status:", response.status);
      return null;
    }
    const data = await response.json() as any;
    const raw = data.choices?.[0]?.message?.content ?? "";
    console.log("[OptionsAgent] raw API response:", raw?.slice(0, 300));
    const parsed = JSON.parse(raw);
    // ���ݶ��ַ��ظ�ʽ
    const opts = parsed?.options ?? parsed?.narrativeChoices ?? [];
    if (Array.isArray(opts) && opts.length >= 2) {
      return opts.slice(0, 3).map(String);
    }
    console.log("[OptionsAgent] parsed has no options field, keys:", Object.keys(parsed));
    return null;
  } catch (e) {
    console.log("[OptionsAgent] API error:", e);
    return null;
  }
}

app.whenReady().then(async () => {
  persisted = await loadPersistedData();
  createTray();
  if (persisted.state.prologueDone) {
    createFloatingWindow();
  } else {
    createCapsuleWindow(true);
  }

  // M6: 原神运行时长累计（每 10 秒一次）
  const genshinPoll = setInterval(() => {
    if (!isGenshinRunning()) return;
    persisted.state.totalGenshinMs = (persisted.state.totalGenshinMs ?? 0) + 10_000;
    void savePersistedData();
  }, 10_000);
  genshinPoll.unref?.();
});

function isGenshinRunning(): boolean {
  try {
    const out = execSync(
      'tasklist /FI "IMAGENAME eq YuanShen.exe" /NH 2>nul',
      { encoding: "utf8", timeout: 5000 }
    );
    const out2 = execSync(
      'tasklist /FI "IMAGENAME eq GenshinImpact.exe" /NH 2>nul',
      { encoding: "utf8", timeout: 5000 }
    );
    return out.includes("YuanShen.exe") || out2.includes("GenshinImpact.exe");
  } catch {
    return false;
  }
}

app.on("window-all-closed", () => {});

// �˳�ʱ������λỰ����
app.on("before-quit", async () => {
  if (sessionLog.length > 4) {
    const summaries = summarizeSessionLog(sessionLog);
    for (const s of summaries) {
      if (s.trim()) {
        persisted.memories.push(s.trim());
      }
    }
    persisted.memories = persisted.memories.slice(-100);
    await savePersistedData();
  }
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

ipcMain.handle("window:hideFloating", () => {
  floatingWindow?.hide();
});

ipcMain.handle("window:setFloatingPosition", async (_event, position: { x: number; y: number }) => {
  persisted.state.floatingPosition = position;
  floatingWindow?.setBounds({
    x: position.x,
    y: position.y,
    width: 420,
    height: 620,
  });
  await savePersistedData();
});

ipcMain.handle("window:setResizable", async (_event, resizable: boolean) => {
  floatingWindow?.setResizable(resizable);
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

ipcMain.handle("state:clearChatMemory", () => {
  sessionLog.length = 0;
  persisted.memories = [];
  void savePersistedData();
  return true;
});

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
  if (/原神|genshin/i.test(payload.text)) {
    persisted.state.genshinDiscussed = true;
  }
  // visionAgent �� �� �� optionsAgent �ϸ�˳��
  let screenContext = "";
  if (payload.includeScreenshot) {
    const screenshot = await capturePrimaryScreen().catch(() => undefined);
    if (screenshot) {
      floatingWindow?.webContents?.send("omega-thinking", "�š����ҵõ���һ������ߵĽ����������е�����");
      console.log('[vision] env check - VISION_API_KEY:', process.env.VISION_API_KEY ? 'exists' : 'MISSING', 'VISION_MODEL:', process.env.VISION_MODEL, 'MIMO_API_KEY:', process.env.MIMO_API_KEY ? 'exists' : 'MISSING');
      const visionResult = await describeScreenshot(screenshot);
      if (visionResult) {
        screenContext = visionResult;
        console.log('[vision] description:', visionResult.slice(0, 100));
      }
    }
  }
  // ����ͼ������Ϊ���������Ĵ��� ����MIMO��������ԭʼͼƬ
  const enhancedText = screenContext ? payload.text + '\n\n[��Ļʶ��] ' + screenContext : payload.text;
  let aiResponse = await cloudOmegaResponse(enhancedText, undefined);
  if (!aiResponse) {
    aiResponse = localOmegaResponse(payload.text, Boolean(screenContext));
  }
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
  return { ...aiResponse, state: persisted.state, screenshotCaptured: Boolean(screenContext), screenContext: screenContext };
});
ipcMain.handle("options:generate", async (_event, payload: { omegaText: string }) => {
  console.log("[OptionsAgent IPC] received request, omegaText:", payload.omegaText?.slice(0, 50));
  const aiOptions = await cloudOmegaOptions(payload.omegaText).catch(() => null);
  console.log("[OptionsAgent IPC] cloudOmegaOptions returned:", aiOptions);
  if (aiOptions && aiOptions.length >= 2) return aiOptions;
  return [];
});

// ---- 代打服务 IPC（前端只感知 Ω 角色，引擎封装在后端）----
ipcMain.handle("gamebot:start", () => gameBot.start());
ipcMain.handle("gamebot:stop", () => gameBot.stop());
ipcMain.handle("gamebot:status", () => gameBot.status());
ipcMain.handle("gamebot:runTask", (_event, taskId: string) => gameBot.runTask(taskId as GameBotTaskId));
ipcMain.handle("gamebot:stopTask", () => gameBot.stopTask());
