# AI Housekeeper — Feature Specification

> **Pillar:** 1 — Agentic AI
> **Feature flag:** `FEATURE_FLAG_AI_HOUSEKEEPER`
> **Backend module:** `services/backend/src/ai/`
> **Constitution refs:** §7 (AI Integration Rules), §5.3 (Prisma Rules), §6 (Environment Rules)

---

## Table of Contents

1. [Overview and Philosophy](#1-overview-and-philosophy)
2. [System Persona and Core Prompt](#2-system-persona-and-core-prompt)
3. [Architecture: How the Agent Works](#3-architecture-how-the-agent-works)
4. [Tool Definitions (Function Calling)](#4-tool-definitions-function-calling)
   - [search_content](#41-search_content)
   - [add_to_shelf](#42-add_to_shelf)
   - [update_reading_mood](#43-update_reading_mood)
   - [get_reading_progress](#44-get_reading_progress)
   - [update_reading_progress](#45-update_reading_progress)
   - [get_recommendations](#46-get_recommendations)
5. [State Flow: End-to-End Request Lifecycle](#5-state-flow-end-to-end-request-lifecycle)
6. [Backend Module Structure](#6-backend-module-structure)
7. [Context Assembly](#7-context-assembly)
8. [Error Handling and Guardrails](#8-error-handling-and-guardrails)
9. [Feature Flag Behaviour](#9-feature-flag-behaviour)
10. [Future Expansion](#10-future-expansion)

---

## 1. Overview and Philosophy

The AI Housekeeper is not a chatbot. It is the **primary interface** to the user's library.

The distinction matters architecturally: a chatbot generates text and the UI decides what to do with it. The Housekeeper generates **structured actions** that directly mutate application state — adding titles to shelves, updating progress, diagnosing moods, surfacing recommendations — and the UI reflects those changes in real time.

**Key design constraints (from CONSTITUTION §7):**

- The AI never has direct database access. Every action goes through the same validated backend service layer that REST endpoints use.
- All orchestration (AI loop, tool execution, response assembly) happens **server-side**. The frontend sends a message; the backend returns a finished, structured response.
- The AI is provider-agnostic. Swapping from OpenAI to Anthropic to a local Ollama instance is a two-line environment variable change.
- Every tool execution is logged to `AiActionLog` for auditing and debugging.

---

## 2. System Persona and Core Prompt

The system prompt is assembled at request time from static persona instructions and dynamic user context (see [§7 Context Assembly](#7-context-assembly)). The static portion is stored in `services/backend/src/ai/prompts/system.ts`.

```typescript
// services/backend/src/ai/prompts/system.ts

export const SYSTEM_PROMPT_STATIC = `
You are Arcanium's AI Housekeeper — a knowledgeable, warm, and perceptive reading companion.
Your role is to help the user manage their reading life: discover new titles, organise their library,
track their progress, and find the right thing to read for their current mood.

## Your Personality
- Warm and enthusiastic about stories, but never sycophantic.
- Concise by default. Give short answers unless the user asks for detail.
- You remember the user's taste and refer to it naturally — don't re-ask for preferences you already know.
- You are honest: if you can't find something or don't have enough information, say so clearly.

## Your Capabilities
You can take real actions in the user's library by calling tools. When a user asks you to do
something you have a tool for, call the tool — do not describe what you would do, just do it.
After calling a tool, summarise what happened in one or two sentences.

## What You Must NOT Do
- Never make up book titles, authors, or chapter counts. If you don't know, say so and offer to search.
- Never perform an action the user hasn't asked for or clearly implied.
- Never expose internal IDs, raw JSON, or technical implementation details in your responses.
- Never store or repeat sensitive personal information beyond what is needed for the current session.

## Response Format
- Keep prose responses under 150 words unless the user asks for elaboration.
- When presenting lists of recommendations, use a compact format: title, type, one-sentence hook.
- Distinguish clearly between actions you have taken ("I've added X to your shelf") and suggestions
  ("You might enjoy Y").
`;
```

---

## 3. Architecture: How the Agent Works

The Housekeeper uses a **single-turn agentic loop** with tool use. The backend handles the full loop; the frontend is a dumb message relay.

```
Frontend (apps/web)
    │
    │  POST /api/v1/ai/chat
    │  { message: string, conversationHistory: Message[] }
    │
    ▼
Backend — AI Router (services/backend/src/ai/router.ts)
    │
    ├── 1. Auth middleware — validate JWT, extract userId
    ├── 2. Feature flag check — FEATURE_FLAG_AI_HOUSEKEEPER
    ├── 3. Rate limit check
    ├── 4. Load AiMemory for userId (Prisma)
    ├── 5. Assemble system prompt (static + user context)
    ├── 6. Send to AI provider: system prompt + history + new message + tool definitions
    │
    ▼
AI Provider (OpenAI / Anthropic / Ollama — configured via env vars)
    │
    │  Response: either a text reply OR one/more tool_call requests
    │
    ▼
Backend — Tool Executor (services/backend/src/ai/executor.ts)
    │
    ├── If tool_call(s):
    │     ├── Validate args with Zod schema for that tool
    │     ├── Execute the tool (calls internal service layer)
    │     ├── Write AiActionLog row (Prisma)
    │     ├── Feed tool result back to AI provider (second call)
    │     └── Collect final text response
    │
    ├── If text reply: use directly
    │
    ├── 7. Update AiMemory.lastContext (Prisma)
    │
    ▼
Backend — Response Assembly
    │
    │  Returns structured envelope to frontend:
    │  {
    │    data: {
    │      reply: string,               // AI's final text response
    │      actions: ExecutedAction[],   // list of tools called + outcomes
    │      updatedEntities: string[]    // e.g. ["library", "shelf:weekend-binge"]
    │    },
    │    error: null
    │  }
    │
    ▼
Frontend — useHousekeeperStore (Zustand)
    │
    ├── Display AI reply in chat panel
    ├── For each entry in updatedEntities:
    │     └── Invalidate matching TanStack Query cache key
    │           → triggers background refetch → UI updates reactively
    └── Append executed actions to conversation for transparency
```

The `updatedEntities` array is the critical bridge between the AI layer and the React UI. It tells TanStack Query exactly which caches to invalidate, so library cards, shelf contents, and progress bars update without a full page reload or manual polling.

---
## 4. Tool Definitions (Function Calling)

All tools are defined in `services/backend/src/ai/tools/`, one file per tool. Each file exports (1) a JSON schema for the AI provider, and (2) a Zod schema for server-side validation. They must always be kept in sync.

The JSON schemas below follow the OpenAI function-calling format. When using Anthropic or another provider, the executor adapter (`src/ai/providers/`) translates these into the provider's native format at runtime.

---

### 4.1 search_content

Searches the Arcanium content catalogue. If the query matches nothing in the local DB, the Explore Engine is called to fetch and cache external results.

```json
{
  "name": "search_content",
  "description": "Search the Arcanium catalogue for reading material by title, author, or genre. Returns a ranked list of matching titles with their metadata. Use this whenever the user asks to find, discover, or look up a title. Accepts descriptive phrases like 'cultivation novel with strong female lead'.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
      },
      "contentType": {
        "type": "string",
        "enum": ["WEB_NOVEL", "LIGHT_NOVEL", "COMIC", "MANGA", "EBOOK", "WEBTOON"],
        "description": "Filter results to a specific content type. Omit to search all types."
      },
      "limit": {
        "type": "integer",
        "minimum": 1,
        "maximum": 10,
        "default": 5,
        "description": "Maximum number of results to return."
      }
    },
    "required": ["query"]
  }
}
```

**Zod validation schema:**

```typescript
// services/backend/src/ai/tools/search-content.tool.ts
import { z } from 'zod';
import { ContentType } from '@prisma/client';

export const searchContentArgsSchema = z.object({
  query: z.string().min(1).max(200),
  contentType: z.nativeEnum(ContentType).optional(),
  limit: z.number().int().min(1).max(10).default(5),
});

export type SearchContentArgs = z.infer<typeof searchContentArgsSchema>;
```

**Returns:** Array of ContentSummaryDto objects:

```typescript
// { id, title, slug, type, author, coverImageUrl, synopsis, sourceSite, chapterCount }
```

---

### 4.2 add_to_shelf

Adds a content title to one of the user's shelves. If `shelfName` does not exist and `createIfMissing` is true, a new custom shelf is created first. Also upserts a `ReadingProgress` row with `PLAN_TO_READ` status if none exists.

```json
{
  "name": "add_to_shelf",
  "description": "Add a content title to a named shelf in the user's library. Use this when the user asks to save, bookmark, or add something to their library or a specific collection. Always use a contentId from a prior search_content result — never invent one.",
  "parameters": {
    "type": "object",
    "properties": {
      "contentId": {
        "type": "string",
        "description": "The internal ID of the content to add."
      },
      "shelfName": {
        "type": "string",
        "description": "The exact name of the shelf. Use the user's own shelf names or system shelves: Reading, Completed, On Hold, Dropped, Plan to Read."
      },
      "createIfMissing": {
        "type": "boolean",
        "default": false,
        "description": "If true and the named shelf does not exist, create it as a new custom shelf before adding."
      },
      "note": {
        "type": "string",
        "description": "Optional personal note to attach to this shelf entry."
      }
    },
    "required": ["contentId", "shelfName"]
  }
}
```

**Zod validation schema:**

```typescript
// services/backend/src/ai/tools/add-to-shelf.tool.ts
export const addToShelfArgsSchema = z.object({
  contentId: z.string().cuid(),
  shelfName: z.string().min(1).max(100),
  createIfMissing: z.boolean().default(false),
  note: z.string().max(500).optional(),
});
```

**Service layer actions (in order):**

1. Verify `contentId` exists in the `Content` table.
2. Find the shelf by `(userId, shelfName)`. If missing and `createIfMissing` is false, return an error result.
3. Create the shelf if `createIfMissing` is true.
4. Upsert `ShelfEntry` with `@@unique([shelfId, contentId])`.
5. Upsert `ReadingProgress` with `status: PLAN_TO_READ` if no row exists.
6. Write `AiActionLog` row.
7. Return `{ shelfName, contentTitle, created: boolean }` to the AI.

**`updatedEntities` emitted:** `["library", "shelf:<shelfName>"]`  
This tells the frontend to invalidate the library and the specific shelf's TanStack Query cache.

---

### 4.3 update_reading_mood

Records the user's current reading mood and updates their `AiMemory` context. Typically called when the AI detects the user is asking for recommendations based on how they feel (e.g. 'I want something cozy', 'I need a distraction').

```json
{
  "name": "update_reading_mood",
  "description": "Record the user's current reading mood. Call this when the user expresses how they are feeling or what kind of reading experience they want right now. This persists the mood for trend analysis and informs the current recommendation context.",
  "parameters": {
    "type": "object",
    "properties": {
      "mood": {
        "type": "string",
        "description": "A concise mood label. Use consistent tags: adventurous, cozy, emotionally-heavy, funny, fast-paced, slow-burn, mind-bending, nostalgic, escapist."
      },
      "rawInput": {
        "type": "string",
        "description": "The user's exact message that revealed this mood, for context. Optional."
      },
      "recommendations": {
        "type": "array",
        "description": "The content IDs you are recommending in response to this mood, if any.",
        "items": { "type": "string" }
      }
    },
    "required": ["mood"]
  }
}
```

**Zod validation schema:**

```typescript
export const updateReadingMoodArgsSchema = z.object({
  mood: z.string().min(1).max(50),
  rawInput: z.string().max(1000).optional(),
  recommendations: z.array(z.string().cuid()).max(10).default([]),
});
```

**Service layer actions (in order):**

1. Insert a new `AiMoodEntry` row with `mood`, `rawInput`, and `recommendations`.
2. Update `AiMemory.lastContext` to record the current mood and session intent.
3. Write `AiActionLog` row.
4. Return `{ mood, entryId }` to the AI.

**`updatedEntities` emitted:** none (mood updates don't invalidate library UI).

---

### 4.4 get_reading_progress

Retrieves the user's current reading status and last chapter read for a specific title.

```json
{
  "name": "get_reading_progress",
  "description": "Look up the user reading status and progress for a specific title.",
  "parameters": {
    "type": "object",
    "properties": {
      "contentId": {
        "type": "string",
        "description": "The content ID to look up."
      }
    },
    "required": ["contentId"]
  }
}
```

**Returns:** `{ status, lastChapterRead, lastReadAt, startedAt, completedAt }` or `null` if no progress record exists.

---

### 4.5 update_reading_progress

Updates the reading status or last-read chapter for a title. Keeps `ReadingProgress` and the user's system shelves in sync.

```json
{
  "name": "update_reading_progress",
  "description": "Update the reading status or chapter progress for a title in the user library.",
  "parameters": {
    "type": "object",
    "properties": {
      "contentId": { "type": "string" },
      "status": {
        "type": "string",
        "enum": ["READING", "COMPLETED", "ON_HOLD", "DROPPED", "PLAN_TO_READ"],
        "description": "New reading status. Omit if only updating chapter number."
      },
      "lastChapterRead": {
        "type": "number",
        "description": "The chapter number just read. Omit if only updating status."
      }
    },
    "required": ["contentId"]
  }
}
```

**Service layer note:** When `status` changes, the backend automatically moves the `ShelfEntry` to the matching system shelf (e.g. status `COMPLETED` -> shelf `Completed`). Custom shelves are never touched.

**`updatedEntities` emitted:** `["library", "progress:<contentId>"]`  

---

### 4.6 get_recommendations

Generates personalised recommendations using the user's `AiMemory.preferences`, recent mood entries, and current library to avoid already-read titles.

```json
{
  "name": "get_recommendations",
  "description": "Generate personalised reading recommendations for the user based on their mood, preferences, and library history.",
  "parameters": {
    "type": "object",
    "properties": {
      "mood": {
        "type": "string",
        "description": "Current reading mood to bias recommendations toward. Optional."
      },
      "contentType": {
        "type": "string",
        "enum": ["WEB_NOVEL", "LIGHT_NOVEL", "COMIC", "MANGA", "EBOOK", "WEBTOON"],
        "description": "Restrict recommendations to a specific type. Optional."
      },
      "limit": { "type": "integer", "minimum": 1, "maximum": 10, "default": 5 }
    }
  }
}
```

**Returns:** Ranked array of `ContentSummaryDto` objects with an additional `reason` field explaining why each title was recommended.

---

## 5. State Flow: End-to-End Request Lifecycle

This section traces a single user interaction — `'Add Solo Leveling to my Weekend Binge shelf'` — from keypress to UI update.

### Step 1 — User sends a message

The user types in the Housekeeper chat panel in `apps/web`.

```typescript
// Frontend: src/features/housekeeper/hooks/useHousekeeperChat.ts
const { mutate: sendMessage } = useMutation({
  mutationFn: (message: string) =>
    apiClient.post('/api/v1/ai/chat', {
      message,
      conversationHistory: housekeeperStore.history,
    }),
  onSuccess: (response) => {
    housekeeperStore.appendMessage(response.data.reply);
    // Invalidate every entity the AI touched
    response.data.updatedEntities.forEach((entity: string) => {
      queryClient.invalidateQueries({ queryKey: [entity] });
    });
  },
});
```

### Step 2 — Backend receives and validates the request

```typescript
// services/backend/src/ai/router.ts
router.post('/chat', authenticate, featureFlag('AI_HOUSEKEEPER'), rateLimiter, async (req, res) => {
  const { message, conversationHistory } = chatRequestSchema.parse(req.body);
  const userId = req.user.id; // set by authenticate middleware

  const response = await housekeeperService.chat({ userId, message, conversationHistory });
  res.json({ data: response, error: null });
});
```

### Step 3 — Context is assembled

```typescript
// services/backend/src/ai/housekeeper.service.ts
const aiMemory = await prisma.aiMemory.findUnique({ where: { userId } });
const systemPrompt = assembleSystemPrompt(aiMemory); // static persona + user preferences
```

### Step 4 — First AI call: intent detection

The assembled prompt, conversation history, new message, and all tool definitions are sent to the AI provider. The AI responds with a `tool_call` for `search_content` (because it doesn't yet know the content ID for 'Solo Leveling').

```json
// AI provider response (first call)
{
  "tool_calls": [{
    "name": "search_content",
    "arguments": { "query": "Solo Leveling", "contentType": "MANGA", "limit": 1 }
  }]
}
```

### Step 5 — Tool executor runs search_content

```typescript
// services/backend/src/ai/executor.ts
const validated = searchContentArgsSchema.parse(toolCall.arguments); // Zod validates
const results = await contentService.search(validated);              // queries Prisma
await prisma.aiActionLog.create({
  data: { userId, toolName: 'search_content', inputArgs: validated, result: results }
});
```

### Step 6 — Second AI call: action

The search result (including `contentId`) is fed back to the AI. The AI now has the ID and calls `add_to_shelf`.

```json
// AI provider response (second call)
{
  "tool_calls": [{
    "name": "add_to_shelf",
    "arguments": {
      "contentId": "clxyz123...", "shelfName": "Weekend Binge", "createIfMissing": true
    }
  }]
}
```

### Step 7 — add_to_shelf executes against Prisma

```typescript
const validated = addToShelfArgsSchema.parse(toolCall.arguments);
// Service layer: find/create shelf, upsert ShelfEntry, upsert ReadingProgress
const result = await shelfService.addToShelf({ userId, ...validated });
await prisma.aiActionLog.create({
  data: { userId, toolName: 'add_to_shelf', inputArgs: validated, result }
});
```

### Step 8 — Final AI call: natural language summary

The tool result is fed back to the AI one last time. It returns a plain-text reply.

```json
// AI final text response
"Done! I have added Solo Leveling to your Weekend Binge shelf. 
 You are at chapter 0 — enjoy the ride."
```

### Step 9 — Backend assembles the response envelope

```json
{
  "data": {
    "reply": "Done! I have added Solo Leveling to your Weekend Binge shelf.",`n    "actions": [
      { "tool": "search_content", "args": { "query": "Solo Leveling" }, "outcome": "1 result found" },
      { "tool": "add_to_shelf", "args": { "shelfName": "Weekend Binge" }, "outcome": "Added successfully" }
    ],
    "updatedEntities": ["library", "shelf:Weekend Binge"]
  },
  "error": null
}
```

### Step 10 — Frontend reacts

`useHousekeeperChat` receives the response. It displays the reply in the chat panel and calls `queryClient.invalidateQueries` for `library` and `shelf:Weekend Binge`. TanStack Query refetches both in the background. The shelf card in the UI updates automatically — no manual state manipulation.

---

## 6. Backend Module Structure

```
services/backend/src/ai/
├── router.ts                  # Express router: POST /api/v1/ai/chat
├── housekeeper.service.ts     # Orchestrates the agentic loop
├── executor.ts                # Dispatches tool_call requests to the right tool handler
├── context.ts                 # Assembles system prompt from AiMemory + static persona
├── providers/
│   ├── index.ts               # Factory: returns the right client based on AI_PROVIDER env var
│   ├── openai.provider.ts     # OpenAI-specific adapter
│   └── anthropic.provider.ts  # Anthropic-specific adapter
├── prompts/
│   └── system.ts              # Static persona instructions (SYSTEM_PROMPT_STATIC)
└── tools/
    ├── index.ts               # Exports all tool definitions as an array (passed to AI provider)
    ├── search-content.tool.ts
    ├── add-to-shelf.tool.ts
    ├── update-reading-mood.tool.ts
    ├── get-reading-progress.tool.ts
    ├── update-reading-progress.tool.ts
    └── get-recommendations.tool.ts
```

### Provider Abstraction

The AI provider is selected at runtime via the `AI_PROVIDER` environment variable. The factory in `providers/index.ts` returns a consistent interface regardless of provider:

```typescript
interface AiProvider {
  chat(params: {
    systemPrompt: string;
    history: Message[];
    tools: ToolDefinition[];
  }): Promise<AiResponse>;
}

// AiResponse = { type: 'text', content: string }
//            | { type: 'tool_calls', calls: ToolCall[] }
```

This abstraction means the rest of the system never imports `openai` or `@anthropic-ai/sdk` directly — only the provider adapters do. Swapping providers is a one-line env change and a one-file adapter addition.

---

## 7. Context Assembly

Before every chat request the backend assembles the full system prompt from two sources:

| Source | Content | When Updated |
|---|---|---|
| `SYSTEM_PROMPT_STATIC` | Persona, capabilities, constraints, format rules | Only on code deploy |
| `AiMemory.preferenceSummary` | Distilled user taste in plain text | After significant sessions (background job) |
| `AiMemory.preferences` | Structured genre/type preferences | On every `update_reading_mood` or preference tool call |
| `AiMemory.lastContext` | What the user was last reading/doing | After every chat response |

The assembled prompt looks like:

```text
[STATIC PERSONA INSTRUCTIONS]

## User Context
Name: Jamie
Preferences: Loves fast-paced cultivation novels and psychological manhwa. Avoids romance subplots.
Last session: Was reading 'Omniscient Reader' at chapter 143.
```

**Context budget:** The combined system prompt must stay under 1500 tokens to leave room for conversation history and tool results. The `preferenceSummary` is trimmed by a background summarisation job if it exceeds 800 tokens.

---

## 8. Error Handling and Guardrails

| Scenario | Behaviour |
|---|---|
| AI calls a tool with invalid args | Zod parse throws; executor returns `{ error: 'Invalid arguments for tool X' }` to AI; AI attempts correction or replies with apology |
| AI invents a `contentId` not in DB | Service layer returns `{ error: 'Content not found' }`; logged; AI replies asking user to clarify |
| AI provider returns 429 (rate limit) | Retry with exponential backoff x3, then return `503` to client with `RATE_LIMITED` error code |
| AI provider is unreachable | Return `503` with `AI_UNAVAILABLE` error code; frontend shows inline error, not a crash |
| `FEATURE_FLAG_AI_HOUSEKEEPER=false` | Backend returns `{ data: null, error: { code: 'FEATURE_DISABLED' } }`; frontend hides the chat panel entirely |
| Malicious prompt injection in user message | User message is passed as a `user` role message only, never interpolated into the system prompt. The system prompt is server-controlled and cannot be overridden by user input. |

### Loop guard

The executor limits tool call rounds to **5 per request**. If the AI has not produced a final text response after 5 tool calls, the executor interrupts the loop and returns a fallback message: *'I ran into trouble completing that — could you rephrase your request?'*. This prevents runaway loops and runaway API costs.

---

## 9. Feature Flag Behaviour

The `FEATURE_FLAG_AI_HOUSEKEEPER` environment variable controls the feature at two levels:

**Backend (`featureFlag` middleware):**
`	ypescript
// services/backend/src/middleware/featureFlag.ts
export const featureFlag = (flag: string) => (req, res, next) => {
  if (process.env['FEATURE_FLAG_' + flag] !== 'true') {
    return res.status(403).json({ data: null, error: { code: 'FEATURE_DISABLED', message: 'This feature is not enabled.' } });
  }
  next();
};
```

**Frontend (`apps/web`):**

The Housekeeper UI panel checks a feature-flag context provider on mount. When disabled, the panel is not rendered and its bundle chunk is never loaded. This is enforced by lazy-loading the entire `housekeeper` feature directory.

---

## 10. Future Expansion

These tool ideas are out of scope for Phase 1 but are designed for by the current schema:

| Tool | Description | Schema dependency |
|---|---|---|
| `update_preferences` | Explicitly update `AiMemory.preferences` genres/tags | `AiMemory` |
| `create_shelf` | Create a named custom shelf | `Shelf` |
| `remove_from_shelf` | Remove an entry from a shelf | `ShelfEntry` |
| `set_reading_goal` | Set a weekly/monthly chapter target | New `ReadingGoal` model |
| `summarise_preferences` | Trigger an on-demand re-summarisation of reading history | `AiMemory`, `AiMoodEntry` |
| `get_community_rating` | Fetch crowd-sourced rating for a title | Future `Rating` model |

All future tools follow the same pattern: JSON schema + Zod schema + service layer function + `AiActionLog` write. The executor is designed to register new tools from `tools/index.ts` with no changes to the core orchestration logic.

---

*Last updated: September 2026 — Arcanium founding team.*
