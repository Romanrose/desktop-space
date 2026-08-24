const fs = require("fs");
const path = "C:/Users/89682/Desktop/game competition/minigame/omega/game/electron/main.ts";
let content = fs.readFileSync(path, "utf8");

// Restore sequential flow: vision → Ω → options
// Replace the handler section from screenshot capture through aiResponse

const oldSection = '  const screenshot = payload.includeScreenshot ? await capturePrimaryScreen().catch(() => undefined) : undefined;\r\n  // 混合策略：窗口标题即时用（快），图像描述后台跑（不阻塞）\r\n  let screenContext = "";\r\n  if (screenshot) {\r\n    // 先拿窗口标题（几毫秒），立即用于本次回复\r\n    const windowTitle = getActiveWindowTitle();\r\n    if (windowTitle) {\r\n      screenContext = `用户当前正在使用：${windowTitle}`;\r\n    }\r\n    // 后台启动视觉识别，为后续对话预热缓存\r\n    describeScreenshot(screenshot).then(desc => {\r\n      if (desc) {\r\n        console.log(\'[vision] cached description:\', desc.slice(0, 100));\r\n      }\r\n    }).catch(() => {});\r\n  }\r\n\r\n  const enhancedText = screenContext\r\n    ? payload.text + \'\\n\\n[屏幕识别] \' + screenContext\r\n    : payload.text;\r\n\r\n  let aiResponse = await cloudOmegaResponse(enhancedText, undefined);';

const newSection = '  const screenshot = payload.includeScreenshot ? await capturePrimaryScreen().catch(() => undefined) : undefined;\r\n  // visionAgent → Ω → optionsAgent 严格顺序\r\n  let screenContext = "";\r\n  if (screenshot) {\r\n    // 1. visionAgent：识图概括画面（带 12s 超时，超时则用窗口标题兜底）\r\n    const visionPromise = describeScreenshot(screenshot);\r\n    const timeoutPromise = new Promise<string>(resolve => setTimeout(() => resolve("TIMEOUT"), 12000));\r\n    const visionResult = await Promise.race([visionPromise, timeoutPromise]);\r\n    if (visionResult && visionResult !== "TIMEOUT") {\r\n      screenContext = visionResult;\r\n      console.log(\'[vision] description:\', visionResult.slice(0, 100));\r\n    } else {\r\n      if (visionResult === "TIMEOUT") console.log(\'[vision] timed out, fallback to window title\');\r\n      const windowTitle = getActiveWindowTitle();\r\n      if (windowTitle) screenContext = `用户当前正在使用：${windowTitle}`;\r\n    }\r\n  }\r\n\r\n  // 2. Ω 主模型：根据画面描述 + 用户文字回复\r\n  const enhancedText = screenContext\r\n    ? payload.text + \'\\n\\n[屏幕识别] \' + screenContext\r\n    : payload.text;\r\n  let aiResponse = await cloudOmegaResponse(enhancedText, undefined);';

content = content.replace(oldSection, newSection);

// Also reduce screenshot to 320x180 for faster vision processing
content = content.replace("thumbnailSize: { width: 640, height: 360 }", "thumbnailSize: { width: 320, height: 180 }");

fs.writeFileSync(path, content, "utf8");
console.log("Done");
