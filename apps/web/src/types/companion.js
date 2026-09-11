/**
 * @fileoverview Domain type definitions for Liber the Librarian companion entities.
 * Maps to the AI-related Prisma models: AiMemory, AiMoodEntry, AiActionLog.
 * When TypeScript is adopted, these become Zod schemas in packages/types/.
 */

/**
 * A single message in the Liber chat conversation.
 * @typedef {Object} ChatMessage
 * @property {number|string} id       - Unique message identifier
 * @property {'user'|'liber'} sender
 * @property {string} text            - The message content
 * @property {string[]|null} actions  - Optional quick-action button labels (Liber messages only)
 */

/**
 * A quick-action button rendered below a Liber message.
 * In Phase 3, each action maps to a specific backend tool call.
 * @typedef {Object} ChatAction
 * @property {string} label           - Display text, e.g. "Tell me more"
 * @property {string} toolName        - Backend tool to invoke: 'fetch_book_details' | 'add_to_shelf' | 'get_chapter_passage' | 'search_content'
 * @property {Object|null} toolArgs   - Pre-filled args for the tool call
 */

/**
 * A suggested prompt shown in the Liber sidebar / discovery panel.
 * @typedef {Object} SuggestedPrompt
 * @property {string} title   - Short display label e.g. "Memory & Space"
 * @property {string} prompt  - Full prompt text sent to Liber when clicked
 */

/**
 * The full state of the Liber companion chat session.
 * This is what useLiberStore holds and useLiberChat exposes.
 * @typedef {Object} LiberChatState
 * @property {ChatMessage[]} messages
 * @property {boolean} isTyping
 * @property {boolean} activeVoice
 * @property {SuggestedPrompt[]} suggestedPrompts
 */

/**
 * Response shape from POST /api/v1/companion/chat (Phase 3).
 * In Phase 1 this is simulated by the mock response handlers.
 * @typedef {Object} CompanionChatResponse
 * @property {string} reply                   - Liber's text reply
 * @property {string[]|null} actions          - Suggested follow-up action labels
 * @property {ToolCallRecord[]|null} toolCallsMade
 */

/**
 * Record of a single AI tool call execution (for cache invalidation + audit).
 * @typedef {Object} ToolCallRecord
 * @property {string} tool    - Tool name e.g. "add_to_shelf"
 * @property {Object} result  - The structured result returned by the tool
 */
