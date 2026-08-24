const fs = require("fs");
const path = "C:/Users/89682/Desktop/game competition/minigame/omega/game/electron/main.ts";
let content = fs.readFileSync(path, "utf8");

// 1. Fix: move timeoutId outside try, remove duplicate signal
const oldFunc = '  try {\r\n    const controller2 = new AbortController();\r\n    const timeoutId = setTimeout(() => controller2.abort(), 10000);\r\n    const response = await fetch(`${baseUrl}/chat/completions`, {\r\n      signal: controller2.signal,\r\n      method: "POST",\r\n      headers: {\r\n        "Content-Type": "application/json",\r\n        Authorization: `Bearer ${apiKey}`\r\n      },\r\n      signal: controller2.signal,\r\n      body: JSON.stringify({';

const newFunc = '  let timeoutId2;\r\n  try {\r\n    const controller2 = new AbortController();\r\n    timeoutId2 = setTimeout(() => controller2.abort(), 15000);\r\n    const response = await fetch(`${baseUrl}/chat/completions`, {\r\n      signal: controller2.signal,\r\n      method: "POST",\r\n      headers: {\r\n        "Content-Type": "application/json",\r\n        Authorization: `Bearer ${apiKey}`\r\n      },\r\n      body: JSON.stringify({';

content = content.replace(oldFunc, newFunc);

// 2. Rename all clearTimeout(timeoutId) to clearTimeout(timeoutId2)
content = content.replace(/clearTimeout\(timeoutId\)/g, "clearTimeout(timeoutId2)");

fs.writeFileSync(path, content, "utf8");
console.log("Fixed");
