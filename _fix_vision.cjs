const fs = require("fs");
const path = "C:/Users/89682/Desktop/game competition/minigame/omega/game/electron/main.ts";
let content = fs.readFileSync(path, "utf8");

const oldRetry = '  // 先尝试带截图的 API 请求，失败则回退到不带截图，再失败才用本地回复\r\n  let aiResponse = await cloudOmegaResponse(payload.text, screenshot);\r\n  if (!aiResponse && screenshot) {\r\n    console.log(\'[cloudOmegaResponse] failed with screenshot, retrying without...\');\r\n    aiResponse = await cloudOmegaResponse(payload.text, undefined);\r\n  }';

const newRetry = '  // 先尝试带截图的 API 请求，失败则回退到带文字提示（告知 AI 有截图），再失败才用本地回复\r\n  let aiResponse = await cloudOmegaResponse(payload.text, screenshot);\r\n  if (!aiResponse && screenshot) {\r\n    console.log(\'[cloudOmegaResponse] failed with screenshot, retrying with text hint...\');\r\n    // 告知 AI 用户开启了屏幕识别，但无法传递图片内容\r\n    const textWithHint = payload.text + \'\\n\\n[系统提示：用户已启用屏幕识别功能，但由于模型限制，无法将截图内容传递给 Ω。Ω 可以简单提及看到了屏幕上的光，但不要编造具体的画面细节。]\';\r\n    aiResponse = await cloudOmegaResponse(textWithHint, undefined);\r\n  }';

content = content.replace(oldRetry, newRetry);

fs.writeFileSync(path, content, "utf8");
console.log("Done");
