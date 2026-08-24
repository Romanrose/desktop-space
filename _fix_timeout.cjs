const fs = require("fs");
const path = "C:\\Users\\89682\\Desktop\\game competition\\minigame\\omega\\game\\electron\\main.ts";
let content = fs.readFileSync(path, "utf8");

// Add AbortController + timeout before the fetch in cloudOmegaResponse
content = content.replace(
  '    const response = await fetch(`${baseUrl}/chat/completions`, {\n      method: "POST",\n      headers: {',
  '    const controller = new AbortController();\n    const timeout = setTimeout(() => controller.abort(), 30000);\n    const response = await fetch(`${baseUrl}/chat/completions`, {\n      signal: controller.signal,\n      method: "POST",\n      headers: {'
);

// Add clearTimeout before return and in catch
content = content.replace(
  '    return normalizeAIResponse(parseJsonResponse(raw), text);\n  } catch {\n    return null;\n  }',
  '    clearTimeout(timeout);\n    return normalizeAIResponse(parseJsonResponse(raw), text);\n  } catch {\n    clearTimeout(timeout);\n    return null;\n  }'
);

fs.writeFileSync(path, content, "utf8");
console.log("Done, file size:", content.length);
