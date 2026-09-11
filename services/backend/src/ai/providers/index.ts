/**
 * Provider abstraction — the rest of the AI module never imports OpenAI directly.
 * Swapping providers is a one-line env change + one adapter file.
 */

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export type AiResponse =
  | { type: 'text'; content: string }
  | { type: 'tool_calls'; calls: ToolCall[] };

export interface AiProvider {
  chat(params: {
    systemPrompt: string;
    history: Message[];
    tools: ToolDefinition[];
  }): Promise<AiResponse>;
}

// Factory — returns the correct provider based on AI_PROVIDER_BASE_URL
// Currently only OpenRouter/OpenAI-compatible is supported.
// To add Anthropic native: add an AnthropicProvider class and switch here.
export function createAiProvider(): AiProvider {
  const { OpenRouterProvider } = require('./openrouter.provider.js') as {
    OpenRouterProvider: new () => AiProvider;
  };
  return new OpenRouterProvider();
}
