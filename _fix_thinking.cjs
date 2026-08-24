const fs = require("fs");

const mainPath = "C:/Users/89682/Desktop/game competition/minigame/omega/game/electron/main.ts";
let mainContent = fs.readFileSync(mainPath, "utf8");

// Add omega-thinking IPC event right after vision starts (before Promise.race)
const oldVision = "  if (screenshot) {\r\n    // 1. visionAgent：识图概括画面（带 12s 超时，超时则用窗口标题兜底）\r\n    const visionPromise = describeScreenshot(screenshot);\r\n    const timeoutPromise = new Promise<string>(resolve => setTimeout(() => resolve(\"TIMEOUT\"), 12000));\r\n    const visionResult = await Promise.race([visionPromise, timeoutPromise]);";

const newVision = "  if (screenshot) {\r\n    // 发送"思考中"提示给窗口\r\n    floatingWindow?.webContents.send(\"omega-thinking\", \"嗯……我得调试一下我这边的接收器，它有点慢。\");\r\n    // 1. visionAgent：识图概括画面（带 12s 超时，超时则用窗口标题兜底）\r\n    const visionPromise = describeScreenshot(screenshot);\r\n    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(\"TIMEOUT\"), 12000));\r\n    const visionResult = await Promise.race([visionPromise, timeoutPromise]);";

mainContent = mainContent.replace(oldVision, newVision);

fs.writeFileSync(mainPath, mainContent, "utf8");
console.log("main.ts done");

// 2. preload.ts - add onOmegaThinking
const preloadPath = "C:/Users/89682/Desktop/game competition/minigame/omega/game/electron/preload.ts";
let preloadContent = fs.readFileSync(preloadPath, "utf8");

const oldPreloadEnd = "  onShowContextMenu: (callback: () => void) => {\r\n    ipcRenderer.on(\"show-context-menu\", () => callback());\r\n    return () => { ipcRenderer.removeAllListeners(\"show-context-menu\"); };\r\n  }\r\n};";

const newPreloadEnd = "  onShowContextMenu: (callback: () => void) => {\r\n    ipcRenderer.on(\"show-context-menu\", () => callback());\r\n    return () => { ipcRenderer.removeAllListeners(\"show-context-menu\"); };\r\n  },\r\n  onOmegaThinking: (callback: (msg: string) => void) => {\r\n    ipcRenderer.on(\"omega-thinking\", (_event, msg) => callback(msg));\r\n    return () => { ipcRenderer.removeAllListeners(\"omega-thinking\"); };\r\n  }\r\n};";

preloadContent = preloadContent.replace(oldPreloadEnd, newPreloadEnd);

fs.writeFileSync(preloadPath, preloadContent, "utf8");
console.log("preload.ts done");

// 3. types.ts - add onOmegaThinking to window.omega
const typesPath = "C:/Users/89682/Desktop/game competition/minigame/omega/game/src/types.ts";
let typesContent = fs.readFileSync(typesPath, "utf8");

const oldTypes = "      /** 提词器 Agent：根据 Ω 的发言生成玩家回复选项 */\r\n      options?: {\r\n        generate: (omegaText: string, history?: ChatLine[]) => Promise<string[]>;\r\n      };";

const newTypes = "      /** 提词器 Agent：根据 Ω 的发言生成玩家回复选项 */\r\n      options?: {\r\n        generate: (omegaText: string, history?: ChatLine[]) => Promise<string[]>;\r\n      };\r\n      /** vision 思考中提示 */\r\n      onOmegaThinking?: (callback: (msg: string) => void) => () => void;";

typesContent = typesContent.replace(oldTypes, newTypes);

fs.writeFileSync(typesPath, typesContent, "utf8");
console.log("types.ts done");

// 4. FloatingWindow.tsx - listen for omega-thinking
const fwPath = "C:/Users/89682/Desktop/game competition/minigame/omega/game/src/components/FloatingWindow.tsx";
let fwContent = fs.readFileSync(fwPath, "utf8");

// Add useEffect to listen for omega-thinking after the existing useEffects
const insertAfter = "  // ---------- Typewriter effect for omega bubble ----------";

const thinkingHandler = "  // ---------- 监听 vision 思考中提示 ----------\r\n  useEffect(() => {\r\n    const omega = (window as any).omega;\r\n    if (omega?.onOmegaThinking) {\r\n      const cleanup = omega.onOmegaThinking((msg: string) => {\r\n        setOmegaBubbleText(msg);\r\n      });\r\n      return cleanup;\r\n    }\r\n  }, []);\r\n\r\n  // ---------- Typewriter effect for omega bubble ----------";

fwContent = fwContent.replace(insertAfter, thinkingHandler);

fs.writeFileSync(fwPath, fwContent, "utf8");
console.log("FloatingWindow.tsx done");

console.log("All files updated");
