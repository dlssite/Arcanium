/**
 * @fileoverview useReaderStore — Zustand store for the reading experience UI state.
 *
 * Holds the audio narration toggle (isPlaying) which was previously prop-drilled
 * from App.jsx through DesktopHeader → HomeView. Moving it here eliminates the
 * only remaining prop-drill in the app (flagged as M3 in the web-app-audit).
 *
 * Phase 4 will expand this store with: currentBook, currentChapter, scrollPosition,
 * fontScale, readerTheme — all persisted via Zustand persist middleware.
 *
 * Constitution refs: §8.3 (feature-scoped stores)
 */

import { create } from 'zustand';

interface ReaderState {
  /** Whether the audio narration / TTS playback is active. */
  isPlaying: boolean;

  // ── Actions ───────────────────────────────────────────────────────────────

  setIsPlaying: (playing: boolean) => void;
  togglePlaying: () => void;
}

export const useReaderStore = create<ReaderState>((set) => ({
  isPlaying: false,

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
}));
