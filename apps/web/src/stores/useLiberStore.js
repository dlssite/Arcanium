/**
 * @fileoverview Zustand store for Liber the Librarian chat state.
 *
 * Phase 3 upgrade: sendMessage and sendAction now call POST /api/v1/ai/chat
 * through @arcanium/api-client. The setTimeout mock blocks are removed.
 *
 * TanStack Query cache invalidation happens here via a queryClient reference
 * set at app startup by useLiberChat. This keeps the store free of React
 * imports while still triggering UI updates when the AI mutates library state.
 *
 * Constitution refs: §8.3 (feature-scoped stores), §7.1 (AI via structured tool calls)
 */

import { create } from 'zustand';
import {
  MOCK_LIBER_INITIAL_MESSAGES,
  MOCK_SUGGESTED_PROMPTS,
} from '../mocks/mockData.js';
import { companionApi } from '@arcanium/api-client';
import { useAuthStore } from '../features/auth/store/useAuthStore.ts';
import { apiClient } from '@arcanium/api-client';

// Wire token getter once — idempotent
apiClient.setTokenGetter(() => useAuthStore.getState().accessToken);

/** Callback set by useLiberChat to invalidate TanStack Query caches */
let _invalidateQueries = (_keys) => {};

export function setLiberQueryInvalidator(fn) {
  _invalidateQueries = fn;
}

const MOCK_REPLY_DELAY_MS = 800;

export const useLiberStore = create((set, get) => ({
  // ── State ─────────────────────────────────────────────────────────────────

  messages: MOCK_LIBER_INITIAL_MESSAGES,
  isTyping: false,
  activeVoice: false,
  suggestedPrompts: MOCK_SUGGESTED_PROMPTS,

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Send a free-text user message and get a real AI response.
   * @param {string} text
   */
  sendMessage: async (text) => {
    if (!text?.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: text.trim() };
    set((state) => ({
      messages: [...state.messages, userMsg],
      isTyping: true,
    }));

    await get()._callAI(text.trim());
  },

  /**
   * Handle a quick-action button click — echoes as user message, calls AI.
   * @param {string} action
   */
  sendAction: async (action) => {
    const userMsg = { id: Date.now(), sender: 'user', text: action };
    set((state) => ({
      messages: [...state.messages, userMsg],
      isTyping: true,
    }));

    await get()._callAI(action);
  },

  /**
   * Reset the conversation to a personalised greeting.
   * @param {string} [userName]
   */
  resetChat: (userName = 'Scholar') => {
    const greeting = {
      id: Date.now(),
      sender: 'liber',
      text: `Greetings ${userName}. The celestial library is open. What story or subject shall we explore tonight?`,
      actions: ['Recommend a story', 'Continue reading queue', 'Surprise me'],
    };
    set({ messages: [greeting], isTyping: false });
  },

  toggleVoice: () => set((state) => ({ activeVoice: !state.activeVoice })),
  setActiveVoice: (active) => set({ activeVoice: active }),

  reset: () =>
    set({
      messages: MOCK_LIBER_INITIAL_MESSAGES,
      isTyping: false,
      activeVoice: false,
      suggestedPrompts: MOCK_SUGGESTED_PROMPTS,
    }),

  // ── Internal ──────────────────────────────────────────────────────────────

  /**
   * Core API call — builds conversation history, calls companionApi.chat,
   * appends the reply, and invalidates affected TanStack Query caches.
   * Falls back to a mock reply if AI feature is disabled or offline.
   * @param {string} text
   */
  _callAI: async (text) => {
    // Build history from current messages (last 10 to cap tokens)
    const conversationHistory = get()
      .messages.slice(-10)
      .filter((m) => m.sender === 'user' || m.sender === 'liber')
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

    try {
      const res = await companionApi.chat({
        message: text,
        conversationHistory,
      });

      if (res.error) {
        // Feature disabled or server error — show a graceful inline message
        const isDisabled = res.error.code === 'FEATURE_DISABLED';
        get()._appendLiberReply(
          isDisabled
            ? 'The archive is resting. Return soon, scholar.'
            : 'The celestial codex is momentarily unreachable. Please try again.',
          null,
        );
        return;
      }

      get()._appendLiberReply(res.data.reply, null);

      // Invalidate TanStack Query caches for any entities the AI mutated
      if (res.data.updatedEntities.length > 0) {
        _invalidateQueries(res.data.updatedEntities);
      }
    } catch {
      // Network error — graceful fallback
      get()._appendLiberReply(
        'The archive connection was interrupted. Please try again.',
        null,
      );
    }
  },

  _appendLiberReply: (text, actions) => {
    set((state) => ({
      messages: [
        ...state.messages,
        { id: Date.now() + 1, sender: 'liber', text, actions: actions ?? null },
      ],
      isTyping: false,
    }));
  },
}));
