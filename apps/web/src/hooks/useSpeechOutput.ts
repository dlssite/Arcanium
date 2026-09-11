/**
 * useSpeechOutput — browser-native text-to-speech hook.
 *
 * Uses the Web Speech API (SpeechSynthesis).
 * Falls back gracefully when the API is unavailable.
 *
 * Usage:
 *   const { speak, stop, isSpeaking, isSupported } = useSpeechOutput();
 *   speak("The archive is open, scholar.");
 */

import { useState, useCallback, useEffect, useRef } from 'react';

interface UseSpeechOutputOptions {
  /** BCP-47 language tag. Defaults to browser language. */
  lang?: string;
  /** Speech rate. 0.1–10, default 1. */
  rate?: number;
  /** Pitch. 0–2, default 1. */
  pitch?: number;
  /** Volume. 0–1, default 0.9. */
  volume?: number;
  /**
   * Preferred voice name (partial match). If not found the browser default is used.
   * Example: "Google UK English Female"
   */
  preferredVoiceName?: string;
}

interface UseSpeechOutputReturn {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
}

export function useSpeechOutput({
  lang,
  rate = 0.95,
  pitch = 1,
  volume = 0.9,
  preferredVoiceName,
}: UseSpeechOutputOptions = {}): UseSpeechOutputReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Stop any ongoing speech on unmount
  useEffect(() => {
    return () => {
      if (isSupported) window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return;

      // Cancel anything currently playing
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.rate   = rate;
      utterance.pitch  = pitch;
      utterance.volume = volume;
      if (lang) utterance.lang = lang;

      // Try to find the preferred voice
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0 && preferredVoiceName) {
        const preferred = voices.find((v) =>
          v.name.toLowerCase().includes(preferredVoiceName.toLowerCase()),
        );
        if (preferred) utterance.voice = preferred;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend   = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported, rate, pitch, volume, lang, preferredVoiceName],
  );

  return { speak, stop, isSpeaking, isSupported };
}
