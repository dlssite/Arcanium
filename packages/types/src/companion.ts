import { z } from 'zod';

// ---------------------------------------------------------------------------
// POST /api/v1/ai/chat — request
// ---------------------------------------------------------------------------

export const CompanionMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const CompanionChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationHistory: z.array(CompanionMessageSchema).max(20).default([]),
});

export type CompanionMessage = z.infer<typeof CompanionMessageSchema>;
export type CompanionChatRequest = z.infer<typeof CompanionChatRequestSchema>;

// ---------------------------------------------------------------------------
// POST /api/v1/ai/chat — response
// ---------------------------------------------------------------------------

export const ExecutedActionSchema = z.object({
  tool: z.string(),
  args: z.record(z.unknown()),
  outcome: z.string(),
});

export const CompanionChatResponseSchema = z.object({
  reply: z.string(),
  actions: z.array(ExecutedActionSchema),
  updatedEntities: z.array(z.string()),
});

export type ExecutedAction = z.infer<typeof ExecutedActionSchema>;
export type CompanionChatResponse = z.infer<typeof CompanionChatResponseSchema>;
