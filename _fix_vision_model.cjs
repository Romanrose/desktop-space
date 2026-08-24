const fs = require("fs");

const path = "C:/Users/89682/Desktop/game competition/minigame/omega/game/electron/main.ts";
let content = fs.readFileSync(path, "utf8");

// Replace describeScreenshot to use vision-specific env vars, fallback to existing MIMO config
const oldFunc = `async function describeScreenshot(dataUrl: string): Promise<string> {
  const apiKey = process.env.MIMO_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) return "";
  const baseUrl = (process.env.MIMO_BASE_URL ?? process.env.OPENAI_BASE_URL ?? "https://api.xiaomimimo.com/v1").replace(/\/$/, "");`;

const newFunc = `async function describeScreenshot(dataUrl: string): Promise<string> {
  // 优先使用独立的视觉模型配置（ARK/豆包），否则回退到 MIMO
  const apiKey = process.env.VISION_API_KEY ?? process.env.MIMO_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) return "";
  const baseUrl = (process.env.VISION_BASE_URL ?? process.env.MIMO_BASE_URL ?? process.env.OPENAI_BASE_URL ?? "https://api.xiaomimimo.com/v1").replace(/\/$/, "");
  const visionModel = process.env.VISION_MODEL ?? "mimo-v2.5";`;

content = content.replace(oldFunc, newFunc);

// Update the model field in the body
content = content.replace(
  '        model: "mimo-v2.5",\r\n        messages: [',
  '        model: visionModel,\r\n        messages: ['
);

// Also add the VISION_MODEL to loadLocalEnv so it gets loaded from .env.local
// Actually, loadLocalEnv already loads any env var, so we just need to add to .env.local
// But let me also make sure the env is loaded at the describeScreenshot call site

fs.writeFileSync(path, content, "utf8");
console.log("Done");
