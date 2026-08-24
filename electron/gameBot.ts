/**
 * 代打服务（GameBot）
 *
 * 将 BetterGI 封装在 Electron 主进程后端：
 *  - 启动前自动写好 BetterGI 的快捷键 / 一条龙配置 / 原神启动路径；
 *  - 一条龙类任务（daily / resin / domain）通过 BetterGI 命令行参数真实启动；
 *  - 实时/独立任务（fishing / wood / auto_pick / auto_skip）通过注入快捷键触发；
 *  - 前端只与 Ω 角色交互，不暴露 BetterGI 下载、配置和快捷键。
 */

import { exec, execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type GameBotTaskId =
  | "daily"
  | "resin"
  | "domain"
  | "fishing"
  | "wood"
  | "auto_pick"
  | "simple"
  | "auto_skip";

export interface GameBotStatus {
  running: boolean;
  engineReady: boolean;
  currentTask: GameBotTaskId | null;
  pid: number | null;
  startedAt: number | null;
}

export interface GameBotTaskResult {
  success: boolean;
  taskId: GameBotTaskId;
  message: string;
  error?: string;
}

type TaskMode = "onedragon" | "hotkey";

interface TaskMeta {
  label: string;
  mode: TaskMode;
  oneDragonConfig?: string;
  hotkey?: keyof typeof HOTKEYS;
}

const TASK_META: Record<GameBotTaskId, TaskMeta> = {
  daily: {
    label: "每日委托",
    mode: "onedragon",
    oneDragonConfig: "omega_full",
  },
  resin: {
    label: "清空体力",
    mode: "onedragon",
    oneDragonConfig: "omega_resin",
  },
  domain: {
    label: "秘境速刷",
    mode: "onedragon",
    oneDragonConfig: "omega_domain",
  },
  fishing: {
    label: "自动钓鱼",
    mode: "hotkey",
    hotkey: "autoFishingGameHotkey",
  },
  wood: {
    label: "自动伐木",
    mode: "hotkey",
    hotkey: "autoWoodHotkey",
  },
  auto_pick: {
    label: "自动拾取",
    mode: "hotkey",
    hotkey: "autoPickEnabledHotkey",
  },
  auto_skip: {
    label: "剧情跳过",
    mode: "hotkey",
    hotkey: "autoSkipEnabledHotkey",
  },
  simple: {
    label: "简单任务",
    mode: "onedragon",
    oneDragonConfig: "omega_simple",
  },
};

const HOTKEYS = {
  autoPickEnabledHotkey: { vk: 0x7c, configKey: "F13" },
  autoSkipEnabledHotkey: { vk: 0x7d, configKey: "F14" },
  autoFishingGameHotkey: { vk: 0x7e, configKey: "F15" },
  autoWoodHotkey: { vk: 0x7f, configKey: "F16" },
  autoDomainHotkey: { vk: 0x80, configKey: "F17" },
  onedragonHotkey: { vk: 0x81, configKey: "F18" },
  cancelTaskHotkey: { vk: 0x82, configKey: "F19" },
} as const;

const ENGINE_IMAGE = "BetterGI.exe";
const ENGINE_START_TIMEOUT_MS = 60_000;
const SETUP_TIMEOUT_MS = 30 * 60 * 1000;
const GENSHIN_START_ARGS = "-popupwindow -screen-width 1920 -screen-height 1080";

const ONE_DRAGON_TASKS = [
  "领取邮件",
  "合成树脂",
  "自动秘境",
  "自动首领讨伐",
  "自动幽境危战",
  "自动地脉花",
  "领取每日奖励",
  "领取尘歌壶奖励",
];

function readJsonSafe(filePath: string): Record<string, unknown> | null {
  try {
    if (!existsSync(filePath)) return null;
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function deepMerge<T extends Record<string, unknown>>(base: T, patch: Record<string, unknown>): T {
  const next: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const oldValue = next[key];
    if (
      oldValue &&
      typeof oldValue === "object" &&
      !Array.isArray(oldValue) &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      next[key] = deepMerge(oldValue as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      next[key] = value;
    }
  }
  return next as T;
}

function findEngineRoot(): string | null {
  const candidates = [
    path.join(__dirname, "..", "bettergi", "BetterGI"),
    path.join(__dirname, "..", "bettergi"),
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "BetterGI") : "",
    process.env.ProgramFiles ? path.join(process.env.ProgramFiles, "BetterGI") : "",
    process.env["ProgramFiles(x86)"] ? path.join(process.env["ProgramFiles(x86)"], "BetterGI") : "",
  ];
  for (const dir of candidates) {
    if (!dir) continue;
    if (existsSync(path.join(dir, ENGINE_IMAGE)) || existsSync(path.join(dir, "BetterGenshinImpact.exe"))) {
      return dir;
    }
  }
  return null;
}

function findEngineExe(): string | null {
  const root = findEngineRoot();
  if (!root) return null;
  const exe = path.join(root, ENGINE_IMAGE);
  if (existsSync(exe)) return exe;
  const legacy = path.join(root, "BetterGenshinImpact.exe");
  return existsSync(legacy) ? legacy : null;
}

function isGameRunning(): boolean {
  try {
    const cn = execSync(
      `tasklist /FI "IMAGENAME eq YuanShen.exe" /NH 2>nul`,
      { encoding: "utf8", timeout: 5000, windowsHide: true }
    );
    if (cn.includes("YuanShen.exe")) return true;
    const global = execSync(
      `tasklist /FI "IMAGENAME eq GenshinImpact.exe" /NH 2>nul`,
      { encoding: "utf8", timeout: 5000, windowsHide: true }
    );
    return global.includes("GenshinImpact.exe");
  } catch {
    return false;
  }
}

function queryRegString(key: string, value: string): string | null {
  try {
    const out = execSync(`reg query "${key}" /v ${value}`, {
      encoding: "utf8",
      timeout: 4000,
      windowsHide: true,
    });
    const match = out.match(new RegExp(`${value}\\s+REG_\\w+\\s+(.+)`, "i"));
    return match?.[1]?.trim() || null;
  } catch {
    return null;
  }
}

function ensureWindowedResolution(): void {
  if (isGameRunning()) return;
  const key = 'HKEY_CURRENT_USER\\Software\\miHoYo\\原神';
  const values = [
    ['Screenmanager Resolution Width_h182942802', '1920'],
    ['Screenmanager Resolution Height_h2627697771', '1080'],
    ['Screenmanager Is Fullscreen mode_h3981298716', '0'],
  ];
  for (const [name, value] of values) {
    try {
      execSync(`reg add "${key}" /v ${name} /t REG_DWORD /d ${value} /f`, {
        encoding: 'utf8',
        timeout: 4000,
        windowsHide: true,
      });
    } catch {
      // 注册表写入失败不阻塞启动，BetterGI 仍可尝试用启动参数拉起窗口化游戏
    }
  }
}
function findGameInstallPath(): string {
  const registryKeys = [
    "HKEY_CURRENT_USER\\Software\\miHoYo\\HYP\\1_1\\hk4e_cn",
    "HKEY_CURRENT_USER\\Software\\Cognosphere\\HYP\\1_0\\hk4e_global",
    "HKEY_CURRENT_USER\\Software\\miHoYo\\HYP\\standalone\\14_0\\hk4e_cn\\umfgRO5gh5\\hk4e_cn",
  ];
  for (const key of registryKeys) {
    const dir = queryRegString(key, "GameInstallPath");
    if (!dir) continue;
    for (const exe of ["YuanShen.exe", "GenshinImpact.exe"]) {
      const candidate = path.join(dir, exe);
      if (existsSync(candidate)) return candidate;
    }
  }
  try {
    const out = execSync(
      `powershell -NoProfile -Command "Get-Process -Name YuanShen,GenshinImpact -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Path"`,
      { encoding: "utf8", timeout: 5000, windowsHide: true }
    );
    for (const line of out.split(/\r?\n/)) {
      const candidate = line.trim();
      if (candidate && existsSync(candidate)) return candidate;
    }
  } catch {
    // ignore, registry lookup is the primary path
  }
  return "";
}

function buildOneDragonConfig(name: string, enabledTasks: string[]): Record<string, unknown> {
  const oneDragonDir = path.join(findEngineRoot() || "", "User", "OneDragon");
  const existing = readJsonSafe(path.join(oneDragonDir, `${name}.json`));
  const full = readJsonSafe(path.join(oneDragonDir, "omega_full.json"));
  const source = existing ?? full ?? null;

  const base: Record<string, unknown> = {
    name,
    taskEnabledList: Object.fromEntries(ONE_DRAGON_TASKS.map((task) => [task, enabledTasks.includes(task)])),
    craftingBenchCountry: "枫丹",
    adventurersGuildCountry: "枫丹",
    partyName: "",
    domainName: "",
    weeklyDomainEnabled: false,
    dailyRewardPartyName: "",
    minResinToKeep: 0,
    sundayEverySelectedValue: "0",
    sundayWeeklySelectedValue: "0",
    sereniteaPotTpType: "地图传送",
    secretTreasureObjects: [],
    leyLineOneDragonMode: false,
    leyLineRunMonday: true,
    leyLineRunTuesday: true,
    leyLineRunWednesday: true,
    leyLineRunThursday: true,
    leyLineRunFriday: true,
    leyLineRunSaturday: true,
    leyLineRunSunday: true,
    leyLineMondayType: "",
    leyLineMondayCountry: "",
    leyLineTuesdayType: "",
    leyLineTuesdayCountry: "",
    leyLineWednesdayType: "",
    leyLineWednesdayCountry: "",
    leyLineThursdayType: "",
    leyLineThursdayCountry: "",
    leyLineFridayType: "",
    leyLineFridayCountry: "",
    leyLineSaturdayType: "",
    leyLineSaturdayCountry: "",
    leyLineSundayType: "",
    leyLineSundayCountry: "",
    leyLineRunCount: 0,
    leyLineResinExhaustionMode: false,
    leyLineOpenModeCountMin: false,
    mondayPartyName: "",
    mondayDomainName: "",
    mondaySelectedValue: "0",
    tuesdayPartyName: "",
    tuesdayDomainName: "",
    tuesdaySelectedValue: "0",
    wednesdayPartyName: "",
    wednesdayDomainName: "",
    wednesdaySelectedValue: "0",
    thursdayPartyName: "",
    thursdayDomainName: "",
    thursdaySelectedValue: "0",
    fridayPartyName: "",
    fridayDomainName: "",
    fridaySelectedValue: "0",
    saturdayPartyName: "",
    saturdayDomainName: "",
    saturdaySelectedValue: "0",
    sundayPartyName: "",
    sundayDomainName: "",
    sundaySelectedValue: "0",
    completionAction: "无",
  };

  if (source) {
    return {
      ...source,
      ...base,
      taskEnabledList: base.taskEnabledList,
      name,
    };
  }
  return base;
}

class GameBotService {
  private currentTask: GameBotTaskId | null = null;
  private pid: number | null = null;
  private startedAt: number | null = null;

  private scriptPath(name: string): string {
    return path.join(__dirname, "..", "scripts", name);
  }

  private runPowerShell(
    args: string,
    timeoutMs: number
  ): Promise<{ stdout: string; error?: string }> {
    return new Promise((resolve) => {
      exec(
        `powershell -NoProfile -ExecutionPolicy Bypass ${args}`,
        { timeout: timeoutMs, windowsHide: true, maxBuffer: 1024 * 1024 },
        (error, stdout) => {
          if (error) {
            resolve({ stdout: stdout || "", error: error.message });
          } else {
            resolve({ stdout: stdout || "" });
          }
        }
      );
    });
  }

  isEngineRunning(): boolean {
    try {
      const out = execSync(
        `powershell -NoProfile -Command "Get-Process -Name BetterGI -ErrorAction SilentlyContinue | Measure-Object | Select-Object -ExpandProperty Count"`,
        { encoding: "utf8", timeout: 5000, windowsHide: true }
      );
      return Number(out.trim()) > 0;
    } catch {
      return false;
    }
  }

  private findPid(): number | null {
    try {
      const out = execSync(
        `powershell -NoProfile -Command "Get-Process -Name BetterGI -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Id"`,
        { encoding: "utf8", timeout: 5000, windowsHide: true }
      );
      const pid = Number(out.trim());
      return Number.isFinite(pid) && pid > 0 ? pid : null;
    } catch {
      return null;
    }
  }

  private async setupEngine(): Promise<{ success: boolean; error?: string }> {
    const script = this.scriptPath("setup-bettergi.ps1");
    if (!existsSync(script)) {
      return { success: false, error: "代打助手安装脚本缺失" };
    }
    const result = await this.runPowerShell(`-File "${script}"`, SETUP_TIMEOUT_MS);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return findEngineExe() ? { success: true } : { success: false, error: "代打助手安装失败" };
  }

  private async ensureEngineInstalled(): Promise<{ success: boolean; error?: string }> {
    if (findEngineExe()) return { success: true };
    return this.setupEngine();
  }

  /** 返回游戏不可用时的玩家视角原因；null 表示可以直接开工 */
  private gameUnavailableReason(): string | null {
    if (isGameRunning()) return null;
    const existing = this.readEngineConfig();
    const genshinStartConfig = existing?.genshinStartConfig as Record<string, unknown> | undefined;
    if (typeof genshinStartConfig?.installPath === "string" && genshinStartConfig.installPath) {
      if (existsSync(genshinStartConfig.installPath)) return null;
    }
    if (findGameInstallPath()) return null;
    return "还没有找到原神。先安装原神并启动一次，我才能接管游戏。";
  }

  private engineUserDir(): string {
    return path.join(findEngineRoot() || "", "User");
  }

  private readEngineConfig(): Record<string, unknown> | null {
    return readJsonSafe(path.join(this.engineUserDir(), "config.json"));
  }

  private prepareEngine(): { success: boolean; error?: string } {
    const root = findEngineRoot();
    if (!root) {
      return { success: false, error: "代打助手还没准备好" };
    }

    const userDir = path.join(root, "User");
    mkdirSync(userDir, { recursive: true });
    mkdirSync(path.join(userDir, "OneDragon"), { recursive: true });
    mkdirSync(path.join(userDir, "AutoFight"), { recursive: true });

    const configPath = path.join(userDir, "config.json");
    const existing = this.readEngineConfig() || {};

    const hotkeyPatch: Record<string, string> = {};
    for (const [name, meta] of Object.entries(HOTKEYS)) {
      hotkeyPatch[name] = meta.configKey;
      hotkeyPatch[`${name}Type`] = "KeyboardMonitor";
    }

    const genshinStartConfig = existing.genshinStartConfig as Record<string, unknown> | undefined;
    const installPath =
      findGameInstallPath() ||
      (typeof genshinStartConfig?.installPath === "string" ? genshinStartConfig.installPath : "");

    ensureWindowedResolution();

    const patch = {
      captureMode: "WindowsGraphicsCapture",
      commonConfig: {
        isFirstRun: false,
        runForVersion: "0.62.0",
      },
      scriptConfig: {
        autoUpdateSubscribedScripts: false,
        autoUpdateBeforeCommandLineRun: false,
      },
      maskWindowConfig: {
        maskEnabled: false,
        showLogBox: false,
        showStatus: false,
        displayRecognitionResultsOnMask: false,
        directionsEnabled: false,
      },
      otherConfig: {
        restoreFocusOnLostEnabled: true,
      },
      hotKeyConfig: hotkeyPatch,
      genshinStartConfig: {
        linkedStartEnabled: true,
        autoEnterGameEnabled: true,
        installPath,
        genshinStartArgs: GENSHIN_START_ARGS,
        startGameWithCmd: true,
        recordGameTimeEnabled: false,
        autoDisableGenshinHdrEnabled: false,
      },
      autoFightConfig: {
        strategyName: "根据队伍自动选择",
        teamNames: "",
      },
      selectedOneDragonFlowConfigName: "omega_full",
    };

    const merged = deepMerge(existing, patch as unknown as Record<string, unknown>);
    try {
      writeFileSync(configPath, JSON.stringify(merged, null, 2), "utf8");
    } catch (err) {
      return { success: false, error: String(err) };
    }

    try {
      const oneDragonDir = path.join(userDir, "OneDragon");
      for (const configName of ["omega_full", "omega_resin", "omega_domain", "omega_simple"]) {
        const enabledTasks =
          configName === "omega_resin"
            ? ["合成树脂"]
            : configName === "omega_domain"
              ? ["自动秘境"]
              : configName === "omega_simple"
                ? ["领取邮件", "领取每日奖励", "领取尘歌壶奖励"]
                : [...ONE_DRAGON_TASKS];
        const payload = buildOneDragonConfig(configName, enabledTasks);
        writeFileSync(path.join(oneDragonDir, `${configName}.json`), JSON.stringify(payload, null, 2), "utf8");
      }
    } catch (err) {
      return { success: false, error: `OneDragon 配置写入失败: ${String(err)}` };
    }

    return { success: true };
  }

  private launchEngine(args: string[]): Promise<{ success: boolean; error?: string; pid?: number }> {
    const script = this.scriptPath("launch-bettergi.ps1");
    if (!existsSync(script)) {
      return Promise.resolve({ success: false, error: "engine launch script not found" });
    }
    if (this.isEngineRunning()) {
      return Promise.resolve({ success: false, error: "BetterGI is already running; stop it before relaunching" });
    }
    const argLine = args.map((arg) => `"${arg.replace(/"/g, '\\"')}"`).join(" ");
    return new Promise((resolve) => {
      exec(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${script}" -BetterGIPath "" -Silent ${argLine}`,
        { timeout: 30_000, windowsHide: true, maxBuffer: 1024 * 1024 },
        (error, stdout) => {
          if (error && !this.isEngineRunning()) {
            resolve({ success: false, error: error.message });
            return;
          }
          try {
            const line = stdout
              .trim()
              .split("\n")
              .filter((l) => l.startsWith("{"))
              .pop();
            const parsed = line ? JSON.parse(line) : null;
            if (parsed?.success) {
              resolve({ success: true, pid: parsed.pid ?? undefined });
            } else if (this.isEngineRunning()) {
              resolve({ success: true, pid: this.findPid() ?? undefined });
            } else {
              resolve({ success: false, error: parsed?.error || "engine failed to start" });
            }
          } catch {
            if (this.isEngineRunning()) {
              resolve({ success: true, pid: this.findPid() ?? undefined });
            } else {
              resolve({ success: false, error: "engine failed to start" });
            }
          }
        }
      );
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async waitForEngine(timeoutMs: number, stableMs = 1500): Promise<boolean> {
    const started = Date.now();
    let lastPid: number | null = null;
    let seenAt = 0;
    while (Date.now() - started < timeoutMs) {
      const pid = this.findPid();
      if (pid) {
        if (stableMs <= 0) {
          this.pid = pid;
          return true;
        }
        if (lastPid === pid) {
          if (Date.now() - seenAt >= stableMs) {
            this.pid = pid;
            return true;
          }
        } else {
          lastPid = pid;
          seenAt = Date.now();
        }
      }
      await this.sleep(700);
    }
    return false;
  }

  private hideEngineWindow(): void {
    const script = this.scriptPath("hide-bettergi.ps1");
    if (!existsSync(script)) return;
    try {
      exec(
        `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','${script}' -WindowStyle Hidden"`,
        { timeout: 8000, windowsHide: true }
      );
    } catch {
      // 隐藏失败不影响代打，游戏窗口聚焦后会继续执行
    }
  }

  private focusGame(): { success: boolean; error?: string } {
    const script = this.scriptPath("focus-game.ps1");
    if (!existsSync(script)) {
      return { success: false, error: "focus script not found" };
    }
    try {
      const out = execSync(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${script}"`,
        { encoding: "utf8", timeout: 8000, windowsHide: true }
      );
      const line = out
        .trim()
        .split("\n")
        .filter((l) => l.startsWith("{"))
        .pop();
      const parsed = line ? JSON.parse(line) : null;
      return parsed?.success ? { success: true } : { success: false, error: parsed?.error || "focus failed" };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  private sendHotkey(hotkeyName: keyof typeof HOTKEYS): { success: boolean; error?: string } {
    const script = this.scriptPath("send-hotkey.ps1");
    if (!existsSync(script)) {
      return { success: false, error: "hotkey script not found" };
    }
    const vk = HOTKEYS[hotkeyName].vk;
    try {
      const out = execSync(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${script}" -VkCode ${vk}`,
        { encoding: "utf8", timeout: 8000, windowsHide: true }
      );
      const line = out
        .trim()
        .split("\n")
        .filter((l) => l.startsWith("{"))
        .pop();
      const parsed = line ? JSON.parse(line) : null;
      return parsed?.success ? { success: true } : { success: false, error: "hotkey injection failed" };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  private stopEngineInternal(): { success: boolean; error?: string } {
    try {
      execSync(`taskkill /IM ${ENGINE_IMAGE} /F /T 2>nul`, { timeout: 8000, windowsHide: true });
    } catch {
      // Access denied means Omega lacks admin rights; verification below reports it.
    }
    try {
      execSync(`powershell -NoProfile -Command "Start-Sleep -Milliseconds 800"`, { timeout: 5000, windowsHide: true });
    } catch {
      // Ignore sleep failure; the process check below is authoritative.
    }
    if (!this.isEngineRunning()) {
      this.pid = null;
      this.startedAt = null;
      return { success: true };
    }
    return { success: false, error: "Failed to stop BetterGI. Run Omega as administrator and retry." };
  }

  async start(): Promise<{ success: boolean; error?: string; pid?: number }> {
    const installed = await this.ensureEngineInstalled();
    if (!installed.success) {
      return { success: false, error: installed.error || "代打助手安装失败" };
    }


    const prepared = this.prepareEngine();
    if (!prepared.success) return prepared;

    if (this.isEngineRunning()) {
      this.pid = this.findPid();
      this.startedAt = Date.now();
      return { success: true, pid: this.pid ?? undefined };
    }

    const launch = await this.launchEngine(["start"]);
    if (!launch.success) return launch;
    this.hideEngineWindow();
    this.focusGame();

    const ready = await this.waitForEngine(ENGINE_START_TIMEOUT_MS);
    if (!ready) {
      return { success: false, error: "代打助手启动超时，请确认是否已允许管理员权限" };
    }
    this.pid = this.findPid();
    this.startedAt = Date.now();
    return { success: true, pid: this.pid ?? undefined };
  }

  stop(): { success: boolean; error?: string } {
    this.currentTask = null;
    return this.stopEngineInternal();
  }

  status(): GameBotStatus {
    const running = this.isEngineRunning();
    if (!running && this.currentTask) {
      this.currentTask = null;
    }
    return {
      running,
      engineReady: running,
      currentTask: this.currentTask,
      pid: this.pid,
      startedAt: this.startedAt,
    };
  }

  async runTask(taskId: GameBotTaskId): Promise<GameBotTaskResult> {
    const meta = TASK_META[taskId];
    if (!meta) {
      return { success: false, taskId, message: "Ω 不认识这个指令", error: "unknown task" };
    }
    if (this.currentTask) {
      return {
        success: false,
        taskId,
        message: `Ω 正在处理${TASK_META[this.currentTask].label}`,
        error: "busy",
      };
    }

    const installed = await this.ensureEngineInstalled();
    if (!installed.success) {
      return { success: false, taskId, message: installed.error || "代打助手准备失败", error: installed.error };
    }
    const unavailableReason = this.gameUnavailableReason();
    if (unavailableReason) {
      return {
        success: false,
        taskId,
        message: unavailableReason,
        error: "game unavailable",
      };
    }
    const prepared = this.prepareEngine();
    if (!prepared.success) {
      return { success: false, taskId, message: prepared.error || "代打助手准备失败", error: prepared.error };
    }

    this.currentTask = taskId;

    if (meta.mode === "onedragon") {
      if (this.isEngineRunning()) {
        const stopped = this.stopEngineInternal();
        if (!stopped.success) {
          this.currentTask = null;
          return { success: false, taskId, message: stopped.error || "engine stop failed", error: "engine stop failed" };
        }
      }
      await this.sleep(800);
      const launch = await this.launchEngine(["startOneDragon", meta.oneDragonConfig as string]);
      this.hideEngineWindow();
      this.focusGame();
      if (!launch.success) {
        this.currentTask = null;
        return { success: false, taskId, message: launch.error || "代打助手启动失败", error: launch.error };
      }
      const ready = await this.waitForEngine(ENGINE_START_TIMEOUT_MS);
      if (!ready) {
        this.currentTask = null;
        return { success: false, taskId, message: "代打助手启动超时", error: "engine timeout" };
      }
      this.pid = this.findPid();
      this.startedAt = Date.now();
      return { success: true, taskId, message: `Ω 开始处理${meta.label}` };
    }

    if (!this.isEngineRunning()) {
      const launch = await this.launchEngine(["start"]);
      this.hideEngineWindow();
      this.focusGame();
      if (!launch.success) {
        this.currentTask = null;
        return { success: false, taskId, message: launch.error || "代打助手启动失败", error: launch.error };
      }
      const ready = await this.waitForEngine(ENGINE_START_TIMEOUT_MS);
      if (!ready) {
        this.currentTask = null;
        return { success: false, taskId, message: "代打助手启动超时", error: "engine timeout" };
      }
      this.pid = this.findPid();
      this.startedAt = Date.now();
    }

    // BetterGI keyboard hooks ignore hotkeys unless the game window is focused.
    this.focusGame();

    if (taskId === "auto_pick" || taskId === "auto_skip") {
      const section = taskId === "auto_pick" ? "autoPickConfig" : "autoSkipConfig";
      const cfg = this.readEngineConfig();
      const enabled = (cfg?.[section] as Record<string, unknown> | undefined)?.enabled === true;
      if (enabled) {
        return { success: true, taskId, message: `Ω ${meta.label} is already running` };
      }
    }

    // 等待截图器和快捷键注册完成后，再注入触发键。
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const sent = this.sendHotkey(meta.hotkey as keyof typeof HOTKEYS);
    if (!sent.success) {
      this.currentTask = null;
      return { success: false, taskId, message: sent.error || "代打助手暂时没接到指令", error: sent.error };
    }
    return { success: true, taskId, message: `Ω 开始处理${meta.label}` };
  }

  stopTask(): GameBotTaskResult | null {
    if (!this.currentTask) return null;
    const taskId = this.currentTask;
    const meta = TASK_META[taskId];

    this.focusGame();
    if (meta?.mode === "onedragon") {
      this.sendHotkey("onedragonHotkey");
    } else if (meta?.hotkey) {
      this.sendHotkey(meta.hotkey);
    }

    this.currentTask = null;
    return { success: true, taskId, message: "Ω 停下了手头的工作" };
  }
}

export const gameBot = new GameBotService();
