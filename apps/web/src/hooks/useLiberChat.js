/**
 * @fileoverview useLiberChat — primary hook for Liber companion chat interactions.
 *
 * Phase 3: sendMessage/sendAction now call the real AI backend.
 * Sprint 5: mic input wired to useSpeechInput; passage responses spoken via useSpeechOutput.
 *
 * Constitution refs:
 *   §4.2  — hooks as the component-facing API; no direct store imports in components
 *   §7.1  — AI via structured tool calls
 *   §8.1  — TanStack Query invalidation after tool calls that mutate server state
 */

import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLiberStore, setLiberQueryInvalidator } from '../stores/useLiberStore.js';
import { useUserStore } from '../stores/useUserStore.js';
import { LIBRARY_KEYS } from '../features/library/queryKeys.ts';
import { USER_QUERY_KEY } from '../features/auth/hooks/useCurrentUser.ts';
import { useSpeechInput } from './useSpeechInput.ts';
import { useSpeechOutput } from './useSpeechOutput.ts';
import { features } from '../config/features.ts';

export function useLiberChat() {
  const store = useLiberStore();
  const user = useUserStore((s) => s.user);
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState('');

  // ── TanStack Query invalidator ──────────────────────────────────────────────
  // Wire once so the Zustand store can bust caches without importing React.
  useEffect(() => {
    setLiberQueryInvalidator((entityKeys) => {
      entityKeys.forEach((key) => {
        if (key === 'library' || key.startsWith('shelf:') || key.startsWith('progress:')) {
          void queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.all });
        }
        if (key.startsWith('content:')) {
          void queryClient.invalidateQueries({ queryKey: ['content'] });
        }
        if (key === 'user:dailyGoal' || key === 'user') {
          void queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
        }
      });
    });
  }, [queryClient]);

  // ── TTS output ──────────────────────────────────────────────────────────────
  const tts = useSpeechOutput({ rate: 0.92, pitch: 1, volume: 0.9 });

  // ── Speech recognition input ────────────────────────────────────────────────
  const stt = useSpeechInput({
    interimResults: true,
    onResult: (transcript) => {
      // Final transcript → populate input field and auto-send
      setInputValue(transcript);
      void store.sendMessage(transcript);
    },
    onError: (errorMessage) => {
      console.warn('[useLiberChat] speech recognition error:', errorMessage);
    },
  });

  // While listening, echo the interim transcript into the input field
  useEffect(() => {
    if (stt.interimTranscript) {
      setInputValue(stt.interimTranscript);
    }
  }, [stt.interimTranscript]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSend = useCallback(
    (overrideText) => {
      const text = typeof overrideText === 'string' ? overrideText : inputValue;
      if (!text?.trim()) return;
      setInputValue('');
      void store.sendMessage(text.trim());
    },
    [inputValue, store],
  );

  const handleAction = useCallback(
    (action) => { void store.sendAction(action); },
    [store],
  );

  const handleReset = useCallback(() => {
    store.resetChat(user?.displayName ?? 'Scholar');
  }, [store, user]);

  /**
   * Toggle mic — start or stop speech recognition.
   * Respects the voiceInput feature flag (component also hides the button,
   * but this is a second safety layer).
   */
  const handleToggleVoice = useCallback(() => {
    if (!features.voiceInput) return;
    if (stt.isListening) {
      stt.stopListening();
      store.setActiveVoice(false);
    } else {
      stt.startListening();
      store.setActiveVoice(true);
    }
  }, [stt, store]);

  /**
   * Speak a passage aloud using TTS.
   * Called by LiberView when a "Read passage" tool result arrives.
   */
  const speakPassage = useCallback(
    (text) => {
      if (!features.voiceInput) return;
      tts.speak(text);
    },
    [tts],
  );

  return {
    // Chat state
    messages: store.messages,
    isTyping: store.isTyping,
    suggestedPrompts: store.suggestedPrompts,

    // Input field
    inputValue,
    setInputValue,

    // Handlers
    handleSend,
    handleAction,
    handleReset,

    // Voice input
    activeVoice:     stt.isListening,
    voiceSupported:  stt.isSupported,
    voiceError:      stt.error,
    toggleVoice:     handleToggleVoice,

    // TTS output
    isSpeaking:      tts.isSpeaking,
    ttsSupported:    tts.isSupported,
    speakPassage,
    stopSpeaking:    tts.stop,
  };
}
