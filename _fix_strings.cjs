const fs = require("fs");
const path = "C:/Users/89682/Desktop/game competition/minigame/omega/game/electron/main.ts";
let content = fs.readFileSync(path, "utf8");

// Fix the broken return statements and string
content = content.replace(
  '  if (!apiKey) return ";',
  '  if (!apiKey) return "";'
);

content = content.replace(
  "const baseUrl = (process.env.MIMO_BASE_URL ?? process.env.OPENAI_BASE_URL ?? \"https://api.xiaomimimo.com/v1\").replace(/\\/$/, \");",
  'const baseUrl = (process.env.MIMO_BASE_URL ?? process.env.OPENAI_BASE_URL ?? "https://api.xiaomimimo.com/v1").replace(/\\/$/, "");'
);

content = content.replace(
  '      return ";\r\n    }\r\n\r\n    const data',
  '      return "";\r\n    }\r\n\r\n    const data'
);

content = content.replace(
  '    if (desc) return desc;\r\n    return ";\r\n  } catch (e) {',
  '    if (desc) return desc;\r\n    return "";\r\n  } catch (e) {'
);

content = content.replace(
  '    return ";\r\n  }\r\n}\r\n\r\nfunction parseJsonResponse',
  '    return "";\r\n  }\r\n}\r\n\r\nfunction parseJsonResponse'
);

// Also fix the handler section
content = content.replace(
  '  let screenDescription = ";\r\n  if (screenshot)',
  '  let screenDescription = "";\r\n  if (screenshot)'
);

fs.writeFileSync(path, content, "utf8");
console.log("Fixed strings");
