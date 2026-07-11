// NOTE: keep type definitions in sync with src/types.ts
import type { OmegaEmotion, FeatureIntent, OmegaAIResponse } from "./src/types";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

function loadLocalEnv() {
  for (const fileName of [".env.local", ".env"]) {
    const envPath = path.join(process.cwd(), fileName);
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function readJsonBody(request: IncomingMessage) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
    });
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function inferFeatureIntent(text: string): FeatureIntent {
  if (/太空舱|舱/.test(text)) return "capsule";
  if (/专注|学习|工作/.test(text)) return "focus";
  if (/闹钟|提醒|叫我|计时/.test(text)) return "alarm";
  if (/游戏|原神|每日|体力/.test(text)) return "game";
  return null;
}

function fallbackNarrativeChoices(text: string, featureIntent: FeatureIntent): string[] {
  if (featureIntent === "capsule") {
    return ["陪Ω回太空舱看看", "问她最想先整理哪里", "先留在这里继续聊"];
  }
  if (featureIntent === "focus") {
    return ["请Ω安静陪你一会儿", "问她想在旁边做什么", "先和她说说今天的计划"];
  }
  if (featureIntent === "alarm") {
    return ["告诉Ω具体要提醒的时间", "问她会怎么叫醒你", "暂时不设提醒，继续聊天"];
  }
  if (featureIntent === "game") {
    return ["告诉Ω这是什么游戏", "问她愿不愿意先旁观", "换个轻松的话题"];
  }
  if (/难过|累|烦|孤独|讨厌|哭|sad|tired/i.test(text)) {
    return ["告诉Ω你愿意继续听", "问她最近在担心什么", "安静地陪她一会儿"];
  }
  if (/开心|喜欢|谢谢|太好了|可爱|棒|happy|love/i.test(text)) {
    return ["顺着这份开心继续聊", "问Ω刚才想到了什么", "邀请她分享一个小秘密"];
  }
  return ["问Ω现在在想什么", "聊聊太空舱最近的变化", "告诉Ω你今天发生的事"];
}

function normalizeChoices(value: unknown, fallbackText: string, featureIntent: FeatureIntent): string[] {
  const raw = Array.isArray(value) ? value : [];
  const unique = new Set<string>();
  for (const item of raw) {
    const candidate =
      typeof item === "string"
        ? item
        : item && typeof item === "object" && "text" in item
          ? String((item as { text?: unknown }).text ?? "")
          : "";
    const normalized = candidate.replace(/\s+/g, " ").trim().slice(0, 60);
    if (normalized) unique.add(normalized);
    if (unique.size >= 4) break;
  }
  const choices = [...unique];
  return choices.length >= 2 ? choices : fallbackNarrativeChoices(fallbackText, featureIntent);
}

function parseJsonResponse(raw: string): Partial<OmegaAIResponse> | null {
  try {
    return JSON.parse(raw) as Partial<OmegaAIResponse>;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as Partial<OmegaAIResponse>;
    } catch {
      return null;
    }
  }
}

function normalizeAIResponse(response: Partial<OmegaAIResponse> | null, fallbackText: string): OmegaAIResponse | null {
  if (!response?.reply) return null;
  const allowedEmotions: OmegaEmotion[] = ["calm_positive", "calm_negative", "happy", "shy", "sad", "proud", "excited", "fearful"];
  const allowedIntent: FeatureIntent[] = ["alarm", "focus", "capsule", "game", null];
  const emotion = allowedEmotions.includes(response.emotion as OmegaEmotion)
    ? (response.emotion as OmegaEmotion)
    : "calm_positive";
  const featureIntent = allowedIntent.includes(response.featureIntent as FeatureIntent)
    ? (response.featureIntent as FeatureIntent)
    : inferFeatureIntent(fallbackText);

  return {
    reply: String(response.reply).slice(0, 600),
    emotion,
    moodDelta: Number.isFinite(response.moodDelta) ? Math.max(-5, Math.min(5, Math.round(response.moodDelta ?? 0))) : 0,
    affinityDelta: Number.isFinite(response.affinityDelta)
      ? Math.max(-5, Math.min(5, Math.round(response.affinityDelta ?? 0)))
      : 0,
    choices: normalizeChoices(response.choices, fallbackText, featureIntent),
    memorySummary: response.memorySummary ? String(response.memorySummary).slice(0, 220) : undefined,
    featureIntent
  };
}

async function handleAiRequest(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "POST") {
    response.writeHead(405).end();
    return;
  }

  loadLocalEnv();
  const apiKey = process.env.MIMO_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    response.writeHead(503, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Missing MIMO_API_KEY" }));
    return;
  }

  try {
    const body = await readJsonBody(request);
    const text = String(body.text ?? "");
    const inputMode = body.inputMode === "choice" ? "choice" : "free";
    const memories = Array.isArray(body.memories) ? body.memories.map(String).slice(-8) : [];
    const baseUrl = (process.env.MIMO_BASE_URL ?? process.env.OPENAI_BASE_URL ?? "https://api.xiaomimimo.com/v1").replace(/\/$/, "");
    const model = process.env.MIMO_MODEL ?? process.env.OPENAI_MODEL ?? "mimo-v2-flash";
    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "你是桌面宠互动叙事角色惟。用中文、简短、内向但温柔的语气回应玩家，并自然推进当前情境。不要总是重复同一句话。必须只返回JSON，不要Markdown。字段为 reply, emotion, moodDelta, affinityDelta, memorySummary, featureIntent, choices。choices必须是2到4个不重复的中文字符串，表示玩家下一步可采取的不同态度或行动，每项不超过30字；不要替玩家决定内心感受，也不要把相同意思换词重复。玩家始终可以自由输入。emotion只能是 calm_positive, calm_negative, happy, shy, sad, proud, excited, fearful。featureIntent只能是 alarm, focus, capsule, game, null。"
          },
          {
            role: "user",
            content: `长期记忆：${memories.join(" / ") || "暂无"}\n${inputMode === "choice" ? "玩家选择" : "玩家自由输入"}：${text}`
          }
        ],
        temperature: 0.9,
        response_format: { type: "json_object" }
      })
    });

    if (!aiResponse.ok) {
      response.writeHead(aiResponse.status, { "Content-Type": "application/json" });
      response.end(await aiResponse.text());
      return;
    }

    const data = (await aiResponse.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const normalized = normalizeAIResponse(parseJsonResponse(raw), text);
    if (!normalized) {
      response.writeHead(502, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Invalid model response", raw }));
      return;
    }

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(normalized));
  } catch (error) {
    response.writeHead(500, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }));
  }
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "omega-ai-proxy",
      configureServer(server) {
        server.middlewares.use("/api/ai", handleAiRequest);
      },
      configurePreviewServer(server) {
        server.middlewares.use("/api/ai", handleAiRequest);
      }
    }
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
