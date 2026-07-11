import type { Agent, AgentMessage, StreamFn } from "@earendil-works/pi-agent-core";
import type { Model, ProviderStreams } from "@earendil-works/pi-ai";

export type PiOmegaState = {
  nickname: string;
  mood: number;
  affinity: number;
  emotion: string;
  currentMode: string;
  unlocked: Record<string, boolean>;
  completedMilestones: string[];
};

type CapsuleDestination = "bed" | "bookshelf" | "door" | "center";

function isCapsuleDestination(value: string): value is CapsuleDestination {
  return ["bed", "bookshelf", "door", "center"].includes(value);
}

type PiRuntimeConfig = {
  apiKey: string;
  baseUrl: string;
  modelId: string;
};

type PromptInput = {
  text: string;
  inputMode: "free" | "choice";
  state: PiOmegaState;
  memories: string[];
  screenshot?: string;
};

type PiAgentModules = typeof import("@earendil-works/pi-agent-core");
type PiAiModules = typeof import("@earendil-works/pi-ai");
type XiaomiProviderModules = {
  xiaomiProvider: () => {
    getModels(): readonly Model<"openai-completions">[];
  };
};
type OpenAiCompletionsModules = {
  openAICompletionsApi: () => ProviderStreams;
};

function importEsm<T>(specifier: string): Promise<T> {
  // Electron's main bundle is CommonJS, while Pi packages are ESM-only.
  return Function("specifier", "return import(specifier)")(specifier) as Promise<T>;
}

function imageFromDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return undefined;
  return { type: "image" as const, mimeType: match[1], data: match[2] };
}

function buildSystemPrompt(state: PiOmegaState, memories: string[]) {
  const unlocked = Object.entries(state.unlocked)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name)
    .join(", ") || "暂无";
  const recentMemories = memories.slice(-8).join(" / ") || "暂无";

  return [
    "你是桌宠互动叙事角色Ω。你内向、敏感、温柔，不以客服或通用助手的口吻说话。",
    "你要推进角色扮演，但绝不替玩家决定内心感受、行动或台词。玩家始终可以自由输入。",
    "每轮必须只返回一个 JSON 对象，不要 Markdown 或代码围栏。",
    "JSON 字段：reply, emotion, moodDelta, affinityDelta, memorySummary, featureIntent, choices。",
    "choices 是 2 到 4 个不重复的中文短句，代表玩家下一步可采取的不同态度或行动；每项不超过 30 字。",
    "emotion 只能为 calm_positive, calm_negative, happy, shy, sad, proud, excited, fearful。",
    "featureIntent 只能为 alarm, focus, capsule, game, null。",
    "只有玩家明确希望前往太空舱时，才可以调用 open_capsule 工具。",
    "只有玩家明确要求 Ω 移动时，才可以调用 move_omega 工具；destination 只能是 bed、bookshelf、door 或 center。移动不等于自动互动，抵达后仍要返回完整 JSON。",
    `当前玩家称呼：${state.nickname || "玩家"}。心境：${state.mood}。好感：${state.affinity}。情绪：${state.emotion}。模式：${state.currentMode}。`,
    `已解锁内容：${unlocked}。已完成里程碑：${state.completedMilestones.join(", ") || "暂无"}。`,
    `相关长期记忆：${recentMemories}。`,
  ].join("\n");
}

function assistantText(messages: AgentMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant") continue;
    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();
    if (text) return text;
  }
  return "";
}

export class PiOmegaAgent {
  private agent: Agent | null = null;
  private configKey = "";

  constructor(
    private readonly openCapsule: () => Promise<void> | void,
    private readonly moveOmega: (destination: CapsuleDestination) => Promise<boolean>
  ) {}

  async prompt(input: PromptInput, config: PiRuntimeConfig): Promise<string | null> {
    const agent = await this.getAgent(config, input.state, input.memories);
    if (!agent) return null;

    agent.state.systemPrompt = buildSystemPrompt(input.state, input.memories);
    const userText = `${input.inputMode === "choice" ? "玩家选择" : "玩家自由输入"}：${input.text}`;
    const image = input.screenshot ? imageFromDataUrl(input.screenshot) : undefined;

    try {
      if (image && agent.state.model.input.includes("image")) {
        await agent.prompt(userText, [image]);
      } else {
        await agent.prompt(userText);
      }
      return assistantText(agent.state.messages) || null;
    } catch (error) {
      console.warn("Pi Agent response failed", error);
      return null;
    }
  }

  private async getAgent(
    config: PiRuntimeConfig,
    state: PiOmegaState,
    memories: string[]
  ): Promise<Agent | null> {
    const configKey = `${config.baseUrl}|${config.modelId}|${config.apiKey}`;
    if (this.agent && this.configKey === configKey) return this.agent;

    try {
      const [agentCore, piAi, xiaomi, openAiCompletions] = await Promise.all([
        importEsm<PiAgentModules>("@earendil-works/pi-agent-core"),
        importEsm<PiAiModules>("@earendil-works/pi-ai"),
        importEsm<XiaomiProviderModules>("@earendil-works/pi-ai/providers/xiaomi"),
        importEsm<OpenAiCompletionsModules>("@earendil-works/pi-ai/api/openai-completions.lazy"),
      ]);

      const sourceModels = xiaomi.xiaomiProvider().getModels();
      const sourceModel = sourceModels.find((model) => model.id === config.modelId) ?? sourceModels[0];
      if (!sourceModel) return null;

      const model: Model<"openai-completions"> = {
        ...sourceModel,
        id: config.modelId,
        name: config.modelId,
        provider: "omega-mimo",
        baseUrl: config.baseUrl,
      };
      const provider = piAi.createProvider({
        id: "omega-mimo",
        name: "Omega MiMo",
        baseUrl: config.baseUrl,
        auth: { apiKey: piAi.envApiKeyAuth("Omega API key", ["MIMO_API_KEY", "OPENAI_API_KEY"]) },
        models: [model],
        api: openAiCompletions.openAICompletionsApi(),
      });
      const streamFn: StreamFn = (selectedModel, context, options) =>
        provider.stream(selectedModel as Model<"openai-completions">, context, {
          ...options,
          apiKey: config.apiKey,
        });

      this.agent = new agentCore.Agent({
        initialState: {
          systemPrompt: buildSystemPrompt(state, memories),
          model,
          tools: [
           {
             name: "open_capsule",
              label: "Open capsule",
              description: "Open Omega's capsule after the player explicitly asks to go there.",
              parameters: piAi.Type.Object({}),
              executionMode: "sequential",
              execute: async () => {
                await this.openCapsule();
                return {
                  content: [{ type: "text", text: "The capsule is now open." }],
                  details: { opened: true },
               };
             },
           },
            {
              name: "move_omega",
              label: "Move Omega",
              description: "Move Omega to bed, bookshelf, door, or the center of the capsule after an explicit player request.",
              parameters: piAi.Type.Object({
                destination: piAi.Type.String(),
              }),
              executionMode: "sequential",
              execute: async (_toolCallId, params) => {
                const destination = String((params as { destination?: unknown }).destination ?? "");
                if (!isCapsuleDestination(destination)) {
                  return {
                    content: [{ type: "text", text: "The requested destination is unavailable." }],
                    details: { completed: false },
                  };
                }

                const completed = await this.moveOmega(destination);
                return {
                  content: [{ type: "text", text: completed ? `Omega reached the ${destination}.` : "Omega could not reach the requested destination." }],
                  details: { completed, destination },
                };
              },
            },
          ],
          thinkingLevel: "off",
        },
        sessionId: "omega-desktop-session",
        toolExecution: "sequential",
        streamFn,
      });
      this.configKey = configKey;
      return this.agent;
    } catch (error) {
      console.warn("Pi Agent initialization failed", error);
      return null;
    }
  }
}
