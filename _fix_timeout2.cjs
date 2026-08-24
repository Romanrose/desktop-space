const fs = require("fs");
const path = "C:/Users/89682/Desktop/game competition/minigame/omega/game/electron/main.ts";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  '    const response = await fetch(\${baseUrl}/chat/completions\, {\r\n      method: "POST",\r\n      headers: {',
  '    const controller = new AbortController();\r\n    const timeout = setTimeout(() => controller.abort(), 30000);\r\n    const response = await fetch(\${baseUrl}/chat/completions\, {\r\n      signal: controller.signal,\r\n      method: "POST",\r\n      headers: {'
);

content = content.replace(
  '    return normalizeAIResponse(parseJsonResponse(raw), text);\r\n  } catch {\r\n    return null;\r\n  }',
  '    clearTimeout(timeout);\r\n    return normalizeAIResponse(parseJsonResponse(raw), text);\r\n  } catch {\r\n    clearTimeout(timeout);\r\n    return null;\r\n  }'
);

fs.writeFileSync(path, content, "utf8");
console.log("Done, new size:", content.length);
