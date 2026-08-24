const fs = require("fs");
const path = "C:/Users/89682/Desktop/game competition/minigame/omega/game/electron/main.ts";
let content = fs.readFileSync(path, "utf8");

// 1. Reduce screenshot resolution and quality
content = content.replace("thumbnailSize: { width: 640, height: 360 }", "thumbnailSize: { width: 320, height: 180 }");
content = content.replace("const jpegBuf = thumb.toJPEG(60);", "const jpegBuf = thumb.toJPEG(40);");

// 2. Reduce max_tokens
content = content.replace("max_tokens: 150", "max_tokens: 80");

// 3. Add timeout to describeScreenshot fetch
content = content.replace(
  '      body: JSON.stringify({\r\n        model: "mimo-v2.5",',
  '      signal: controller2.signal,\r\n      body: JSON.stringify({\r\n        model: "mimo-v2.5",'
);

content = content.replace(
  '  try {\r\n    const response = await fetch(`${baseUrl}/chat/completions`, {\r\n      method: "POST",',
  '  try {\r\n    const controller2 = new AbortController();\r\n    const timeoutId = setTimeout(() => controller2.abort(), 10000);\r\n    const response = await fetch(`${baseUrl}/chat/completions`, {\r\n      signal: controller2.signal,\r\n      method: "POST",'
);

// 4. Add clearTimeout to return paths in describeScreenshot
// After HTTP error check
content = content.replace(
  '    if (!response.ok) {\r\n      console.error("[describeScreenshot] HTTP", response.status);\r\n      return "";\r\n    }\r\n\r\n    const data = await response.json() as any;\r\n    const desc = data?.choices?.[0]?.message?.content?.trim();\r\n    if (desc) return desc;\r\n    return "";\r\n  } catch (e) {\r\n    console.error("[describeScreenshot] error:", e);\r\n    return "";\r\n  }',
  '    clearTimeout(timeoutId);\r\n    if (!response.ok) {\r\n      console.error("[describeScreenshot] HTTP", response.status);\r\n      return "";\r\n    }\r\n\r\n    const data = await response.json() as any;\r\n    const desc = data?.choices?.[0]?.message?.content?.trim();\r\n    clearTimeout(timeoutId);\r\n    if (desc) return desc;\r\n    return "";\r\n  } catch (e) {\r\n    clearTimeout(timeoutId);\r\n    console.error("[describeScreenshot] error:", e);\r\n    return "";\r\n  }'
);

fs.writeFileSync(path, content, "utf8");
console.log("Done");
