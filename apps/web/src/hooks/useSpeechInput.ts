/**
 * useSpeechInput — browser-native speech recognition hook.
 *
 * Uses the Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 * Falls back gracefully when the API is unavailable (Firefox, some mobile browsers).
 *
 * Constitution §4.2: logic hooks must be framework-agnostic enough to port
 * to React Native — this hook only touches browser APIs, not DOM APIs,
 * so it can be shimmed on native.
 *
 * Usage:
 *   const { isListening, isSupported, startListening, stopListening, error } =
 *     useSpeechInput({ onResult: (transcript) => setInput(transcript) });
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Web Speech API type shims
// TypeScript's DOM lib coverage of the Speech API is incomplete across versions.
// We define the minimum interfaces we need rather than relying on lib coverage.
// ---------------------------------------------------------------------------

interface SpeechRecognitionResultItem {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onstart: ((ev: Event) => void) | null;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognition;
}

// ---------------------------------------------------------------------------

interface UseSpeechInputOptions {
  /** Called with the final transcript when recognition ends or a final result fires. */
  onResult: (transcript: string) => void;
  /** Called when a non-fatal error occurs (e.g. no-speech, network). */
  onError?: (errorMessage: string) => void;
  /** BCP-47 language tag. Defaults to the browser language. */
  lang?: string;
  /** Whether to return interim (not yet final) transcripts. Default false. */
  interimResults?: boolean;
}

interface UseSpeechInputReturn {
  isListening: boolean;
  isSupported: boolean;
  /** Interim transcript while recognition is running (empty when interimResults=false). */
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
}

function getSpeechRecognitionConstructor(): ISpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechInput({
  onResult,
  onError,
  lang,
  interimResults = false,
}: UseSpeechInputOptions): UseSpeechInputReturn {
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const SpeechRecognitionImpl = getSpeechRecognitionConstructor();
  const isSupported = SpeechRecognitionImpl !== null;

  // Stable refs so callbacks always see the latest version
  const onResultRef = useRef(onResult);
  const onErrorRef  = useRef(onError);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onErrorRef.current  = onError;  }, [onError]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) {
      const msg = 'Speech recognition is not supported in this browser.';
      setError(msg);
      onErrorRef.current?.(msg);
      return;
    }

    // Abort any in-progress session
    recognitionRef.current?.abort();

    const recognition = new Ctor();
    recognition.continuous      = false;
    recognition.interimResults  = interimResults;
    recognition.maxAlternatives = 1;
    if (lang) recognition.lang  = lang;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setInterimTranscript('');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        if (result.isFinal) {
          finalTranscript += result[0]?.transcript ?? '';
        } else {
          interim += result[0]?.transcript ?? '';
        }
      }

      if (interim) setInterimTranscript(interim);

      if (finalTranscript.trim()) {
        setInterimTranscript('');
        onResultRef.current(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'aborted') return;
      const messages: Record<string, string> = {
        'no-speech':           'No speech detected. Try again.',
        'audio-capture':       'Microphone not accessible.',
        'not-allowed':         'Microphone permission denied.',
        'network':             'Network error during recognition.',
        'service-not-allowed': 'Speech service not available.',
      };
      const msg = messages[event.error] ?? `Recognition error: ${event.error}`;
      setError(msg);
      onErrorRef.current?.(msg);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [interimResults, lang]);

  // Clean up on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  return { isListening, isSupported, interimTranscript, error, startListening, stopListening };
}
