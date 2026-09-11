import OpenAI from 'openai';
import { createAiProvider } from './providers/index.js';
import { ALL_TOOL_DEFINITIONS } from './tools/index.js';
import { executeTool, type ExecutedAction } from './executor.js';
import { assembleSystemPrompt, updateLastContext } from './context.js';
import type { Message } from './providers/index.js';

/** Maximum tool call rounds per request — prevents runaway loops */
const MAX_TOOL_ROUNDS = 5;

const FALLBACK_REPLY =
  "I ran into some trouble completing that. Could you rephrase your request?";

export interface ChatRequest {
  userId: string;
  message: string;
  conversationHistory: Message[];
}

export interface ChatResponse {
  reply: string;
  actions: ExecutedAction[];
  updatedEntities: string[];
}

/**
 * Orchestrates the full agentic loop:
 * 1. Assemble system prompt with user context
 * 2. First AI call — may return text or tool_calls
 * 3. Execute tool(s), feed results back, repeat up to MAX_TOOL_ROUNDS
 * 4. Collect final text reply + all executed actions + affected entities
 * 5. Async: persist last context to AiMemory
 */
export async function chat(req: ChatRequest): Promise<ChatResponse> {
  const { userId, message, conversationHistory } = req;

  const systemPrompt = await assembleSystemPrompt(userId);
  const provider = createAiProvider();

  // Build the message history for this turn
  const history: Message[] = [
    ...conversationHistory,
    { role: 'user', content: message },
  ];

  const allActions: ExecutedAction[] = [];
  const allUpdatedEntities: string[] = [];

  // ── Agentic loop ──────────────────────────────────────────────────────────
  // We maintain a raw OpenAI-format message array for multi-turn tool calls.
  // The provider abstraction handles the first call; subsequent tool-result
  // turns go directly through the OpenRouter adapter's continueWithToolResults.
  const rawMessages: OpenAI.Chat.ChatCompletionMessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let finalReply = FALLBACK_REPLY;
  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++;

    const response =
      rounds === 1
        ? await provider.chat({ systemPrompt, history, tools: ALL_TOOL_DEFINITIONS })
        : await (provider as import('./providers/openrouter.provider.js').OpenRouterProvider)
            .continueWithToolResults({
              systemPrompt,
              messages: rawMessages,
              tools: ALL_TOOL_DEFINITIONS,
            });

    if (response.type === 'text') {
      finalReply = response.content;
      break;
    }

    // Process tool calls
    const assistantMessage: OpenAI.Chat.ChatCompletionMessageParam = {
      role: 'assistant',
      content: null,
      tool_calls: response.calls.map((c) => ({
        id: c.id,
        type: 'function' as const,
        function: { name: c.name, arguments: JSON.stringify(c.arguments) },
      })),
    };
    rawMessages.push(assistantMessage);

    for (const call of response.calls) {
      let toolResult: unknown;
      let action: ExecutedAction;
      let entities: string[] = [];

      try {
        const executed = await executeTool(userId, call);
        toolResult = executed.result;
        action = executed.action;
        entities = executed.updatedEntities;
      } catch (err) {
        toolResult = { error: err instanceof Error ? err.message : 'Tool execution failed' };
        action = { tool: call.name, args: call.arguments, outcome: 'Error' };
      }

      allActions.push(action);
      allUpdatedEntities.push(...entities);

      rawMessages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(toolResult),
      });
    }
  }

  // Deduplicate updated entities
  const uniqueEntities = [...new Set(allUpdatedEntities)];

  // Async: persist last context — non-blocking, don't await
  void updateLastContext(userId, {
    lastMessage: message.slice(0, 200),
    sessionSummary: `Last asked: "${message.slice(0, 100)}"`,
    updatedAt: new Date().toISOString(),
  });

  return {
    reply: finalReply,
    actions: allActions,
    updatedEntities: uniqueEntities,
  };
}
