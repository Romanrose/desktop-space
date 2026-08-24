const fs = require("fs");

// 1. main.ts - add omega-thinking event
const mainPath = "C:/Users/89682/Desktop/game competition/minigame/omega/game/electron/main.ts";
let mc = fs.readFileSync(mainPath, "utf8");

mc = mc.replace(
  "  if (screenshot) {\r\n    // 1. visionAgent：识图概括画面（带 12s 超时，超时则用窗口标题兜底）\r\n    const visionPromise = describeScreenshot(screenshot);\r\n    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(\"TIMEOUT\"), 12000));",
  "  if (screenshot) {\r\n    // 发送「思考中」提示给窗口\r\n    floatingWindow?.webContents?.send(\"omega-thinking\", \"\\u561F\\u2026\\u2026\\u6211\\u5F97\\u8C03\\u8BD5\\u4E00\\u4E0B\\u6211\\u8FD9\\u8FB9\\u7684\\u63A5\\u6536\\u5668\\uFF0C\\u5B83\\u6709\\u70B9\\u6162\\u3002\");\r\n    // 1. visionAgent：识图概括画面（带 12s 超时，超时则用窗口标题兜底）\r\n    const visionPromise = describeScreenshot(screenshot);\r\n    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(\"TIMEOUT\"), 12000));"
);

fs.writeFileSync(mainPath, mc, "utf8");
console.log("main.ts done");

// 2. preload.ts
const pp = "C:/Users/89682/Desktop/game competition/minigame/omega/game/electron/preload.ts";
let pc = fs.readFileSync(pp, "utf8");
pc = pc.replace(
  "  onShowContextMenu: (callback: () => void) => {",
  "  onOmegaThinking: (callback: (msg: string) => void) => {\r\n    ipcRenderer.on(\"omega-thinking\", (_event, msg) => callback(msg));\r\n    return () => { ipcRenderer.removeAllListeners(\"omega-thinking\"); };\r\n  },\r\n  onShowContextMenu: (callback: () => void) => {"
);
fs.writeFileSync(pp, pc, "utf8");
console.log("preload.ts done");

// 3. types.ts
const tp = "C:/Users/89682/Desktop/game competition/minigame/omega/game/src/types.ts";
let tc = fs.readFileSync(tp, "utf8");
tc = tc.replace(
  "      options?: {\r\n        generate: (omegaText: string, history?: ChatLine[]) => Promise<string[]>;\r\n      };",
  "      options?: {\r\n        generate: (omegaText: string, history?: ChatLine[]) => Promise<string[]>;\r\n      };\r\n      /** vision 思考中提示 */\r\n      onOmegaThinking?: (callback: (msg: string) => void) => () => void;"
);
fs.writeFileSync(tp, tc, "utf8");
console.log("types.ts done");

// 4. FloatingWindow.tsx
const fp = "C:/Users/89682/Desktop/game competition/minigame/omega/game/src/components/FloatingWindow.tsx";
let fc = fs.readFileSync(fp, "utf8");
fc = fc.replace(
  "  // ---------- Typewriter effect for omega bubble ----------",
  "  // ---------- 监听 vision 思考中提示 ----------\r\n  useEffect(() => {\r\n    const omega = (window as any).omega;\r\n    if (omega?.onOmegaThinking) {\r\n      const cleanup = omega.onOmegaThinking((msg: string) => {\r\n        setOmegaBubbleText(msg);\r\n      });\r\n      return cleanup;\r\n    }\r\n  }, []);\r\n\r\n  // ---------- Typewriter effect for omega bubble ----------"
);
fs.writeFileSync(fp, fc, "utf8");
console.log("FloatingWindow.tsx done");

console.log("All done");
