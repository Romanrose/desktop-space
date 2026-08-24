const fs = require("fs");
const path = "C:/Users/89682/Desktop/game competition/minigame/omega/game/electron/main.ts";
let content = fs.readFileSync(path, "utf8");

// 1. Add child_process import 
const importLine = 'import { readFile, writeFile } from "node:fs/promises";';
const importNew = 'import { readFile, writeFile } from "node:fs/promises";\r\nimport { execFileSync } from "node:child_process";';
content = content.replace(importLine, importNew);

// 2. Add getActiveWindowTitle function after capturePrimaryScreen
const marker = '}\r\n\r\nfunction parseJsonResponse';
const newFunc = `}\r\n\r\n/**\r\n * 获取当前活动窗口的标题（Windows），用于屏幕识别文字上下文\r\n */\r\nfunction getActiveWindowTitle(): string {\r\n  try {\r\n    const result = execFileSync(\r\n      "powershell.exe",\r\n      [\r\n        "-NoProfile",\r\n        "-Command",\r\n        \'& {Add-Type -Name W -Namespace A -MemberDefinition \' +\r\n          "\\'[DllImport(\\\\\"user32.dll\\\\\")]public static extern IntPtr GetForegroundWindow();" +\r\n          "[DllImport(\\\\\"user32.dll\\\\\")]public static extern int GetWindowText(IntPtr h,System.Text.StringBuilder t,int c);\\' " +\r\n          "|Out-Null;\\'$s=New-Object System.Text.StringBuilder 256;" +\r\n          "[A.W]::GetWindowText([A.W]::GetForegroundWindow(),\\'$s,256)|Out-Null;\\'$s.ToString()"\r\n      ],\r\n      { timeout: 2000, encoding: "utf8" }\r\n    ).trim();\r\n    return result || "";\r\n  } catch {\r\n    return "";\r\n  }\r\n}\r\n\r\nfunction parseJsonResponse`;
content = content.replace(marker, newFunc);

// 3. Update the retry logic in ai:sendMessage to include window title
const oldRetry = "  // 先尝试带截图的 API 请求，失败则回退到带文字提示（告知 AI 有截图），再失败才用本地回复\r\n  let aiResponse = await cloudOmegaResponse(payload.text, screenshot);\r\n  if (!aiResponse && screenshot) {\r\n    console.log('[cloudOmegaResponse] failed with screenshot, retrying with text hint...');\r\n    // 告知 AI 用户开启了屏幕识别，但无法传递图片内容\r\n    const textWithHint = payload.text + '\\n\\n[系统提示：用户已启用屏幕识别功能，但由于模型限制，无法将截图内容传递给 Ω。Ω 可以简单提及看到了屏幕上的光，但不要编造具体的画面细节。]';\r\n    aiResponse = await cloudOmegaResponse(textWithHint, undefined);\r\n  }";

const newRetry = "  // 先尝试带截图的 API 请求，失败则获取窗口标题作为文字上下文\r\n  let aiResponse = await cloudOmegaResponse(payload.text, screenshot);\r\n  if (!aiResponse && screenshot) {\r\n    console.log('[cloudOmegaResponse] failed with screenshot, getting window title as context...');\r\n    // 获取当前活动窗口标题作为文字上下文\r\n    const windowTitle = getActiveWindowTitle();\r\n    const screenContext = windowTitle\r\n      ? '用户当前正在使用：' + windowTitle\r\n      : '用户已启用屏幕识别，但无法获取具体窗口信息';\r\n    const textWithHint = payload.text + '\\n\\n[屏幕识别上下文] ' + screenContext;\r\n    aiResponse = await cloudOmegaResponse(textWithHint, undefined);\r\n  }";

content = content.replace(oldRetry, newRetry);

fs.writeFileSync(path, content, "utf8");
console.log("Done");
