import OpenAI from 'openai';
import { env } from '../../lib/env.js';
import { prisma } from '../../lib/prisma.js';
import type { AiProvider, Message, ToolDefinition, AiResponse } from './index.js';

/** Cached model name — refreshed from DB every 60 seconds */
let _cachedModel: string | null = null;
let _cacheExpiry = 0;

async function getActiveModel(): Promise<string> {
  if (_cachedModel && Date.now() < _cacheExpiry) return _cachedModel;
  try {
    const row = await prisma.appConfig.findUnique({ where: { key: 'ai_model' } });
    _cachedModel  = row?.value ?? env.AI_MODEL;
    _cacheExpiry  = Date.now() + 60_000; // 60 s TTL
  } catch {
    _cachedModel = env.AI_MODEL;
  }
  return _cachedModel;
}

/**
 * OpenRouter provider — uses the OpenAI SDK pointed at the OpenRouter base URL.
 * OpenRouter requires two extra headers for routing and abuse prevention.
 */
export class OpenRouterProvider implements AiProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.AI_PROVIDER_API_KEY,
      baseURL: env.AI_PROVIDER_BASE_URL,
      defaultHeaders: {
        'HTTP-Referer': env.AI_SITE_URL,
        'X-Title': env.AI_APP_NAME,
      },
    });
  }

  private buildTools(
    defs: ToolDefinition[],
  ): OpenAI.Chat.ChatCompletionTool[] {
    return defs.map((t) => ({
      type: 'function' as const,
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
  }

  private parseResponse(
    response: OpenAI.Chat.ChatCompletion,
  ): AiResponse {
    const message = response.choices[0]?.message;
    if (!message) throw new Error('AI provider returned no choices');

    if (message.tool_calls && message.tool_calls.length > 0) {
      return {
        type: 'tool_calls',
        calls: message.tool_calls.map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
        })),
      };
    }

    return { type: 'text', content: message.content ?? '' };
  }

  async chat(params: {
    systemPrompt: string;
    history: Message[];
    tools: ToolDefinition[];
  }): Promise<AiResponse> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: params.systemPrompt },
      ...params.history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const tools = this.buildTools(params.tools);
    const model = await getActiveModel();
    const response = await this.client.chat.completions.create({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
      ...(tools.length > 0 ? { tools, tool_choice: 'auto' as const } : {}),
    });

    return this.parseResponse(response);
  }

  /**
   * Continue the conversation after tool results have been appended.
   * Used by the executor for multi-turn tool loops.
   */
  async continueWithToolResults(params: {
    systemPrompt: string;
    messages: OpenAI.Chat.ChatCompletionMessageParam[];
    tools: ToolDefinition[];
  }): Promise<AiResponse> {
    const tools = this.buildTools(params.tools);
    const model = await getActiveModel();
    const response = await this.client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        ...params.messages,
      ],
      max_tokens: 1024,
      temperature: 0.7,
      ...(tools.length > 0 ? { tools, tool_choice: 'auto' as const } : {}),
    });

    return this.parseResponse(response);
  }
}
