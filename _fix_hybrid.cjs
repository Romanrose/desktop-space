const fs = require("fs");
const path = "C:/Users/89682/Desktop/game competition/minigame/omega/game/electron/main.ts";
let content = fs.readFileSync(path, "utf8");

// Replace the handler section with hybrid approach
const oldSection = "  const screenshot = payload.includeScreenshot ? await capturePrimaryScreen().catch(() => undefined) : undefined;\r\n  // 图像描述 Agent：用 mimo-v2.5 识别截图内容，转为文字描述\r\n  let screenDescription = \"\";\r\n  if (screenshot) {\r\n    console.log('[describeScreenshot] calling vision model...');\r\n    screenDescription = await describeScreenshot(screenshot);\r\n    console.log('[describeScreenshot] result:', screenDescription?.slice(0, 100));\r\n  }\r\n\r\n  // 构造带屏幕上下文的用户输入\r\n  let enhancedText = payload.text;\r\n  if (screenDescription) {\r\n    enhancedText = payload.text + '\\n\\n[屏幕识别] 根据截图分析，' + screenDescription;\r\n  } else if (screenshot) {\r\n    // 截图已捕获但识别失败，传窗口标题\r\n    const windowTitle = getActiveWindowTitle();\r\n    if (windowTitle) {\r\n      enhancedText = payload.text + '\\n\\n[屏幕识别] 用户当前正在使用：' + windowTitle;\r\n    }\r\n  }\r\n\r\n  // 调用 Ω 主模型（mimo-v2.5-pro），不带图片仅带文字上下文\r\n  let aiResponse = await cloudOmegaResponse(enhancedText, undefined);";

const newSection = "  const screenshot = payload.includeScreenshot ? await capturePrimaryScreen().catch(() => undefined) : undefined;\r\n  // 混合策略：窗口标题即时用（快），图像描述后台跑（不阻塞）\r\n  let screenContext = \"\";\r\n  if (screenshot) {\r\n    // 先拿窗口标题（几毫秒），立即用于本次回复\r\n    const windowTitle = getActiveWindowTitle();\r\n    if (windowTitle) {\r\n      screenContext = `用户当前正在使用：${windowTitle}`;\r\n    }\r\n    // 后台启动视觉识别，为后续对话预热缓存\r\n    describeScreenshot(screenshot).then(desc => {\r\n      if (desc) {\r\n        console.log('[vision] cached description:', desc.slice(0, 100));\r\n      }\r\n    }).catch(() => {});\r\n  }\r\n\r\n  const enhancedText = screenContext\r\n    ? payload.text + '\\n\\n[屏幕识别] ' + screenContext\r\n    : payload.text;\r\n\r\n  let aiResponse = await cloudOmegaResponse(enhancedText, undefined);";

content = content.replace(oldSection, newSection);

fs.writeFileSync(path, content, "utf8");
console.log("Done");
