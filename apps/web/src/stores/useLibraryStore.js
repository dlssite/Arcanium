/**
 * @fileoverview Zustand store for library UI state.
 *
 * Track A: all book/progress data has moved to TanStack Query (useLibraryQuery).
 * This store now holds ONLY the activeFilter tab — the one piece of client-only
 * UI state that survives between renders and must be shared between
 * LibraryView and ProfileView without a network round-trip.
 *
 * Constitution refs: §8.3 (feature-scoped stores), §8.1 (TanStack Query for server state)
 */

import { create } from 'zustand';

export const useLibraryStore = create((set) => ({
  // ── UI state ───────────────────────────────────────────────────────────────
  /** Active filter tab — shared between LibraryView and ProfileView. */
  activeFilter: 'All',

  // ── Actions ────────────────────────────────────────────────────────────────
  /** @param {'All'|'Reading'|'Completed'|'Saved'} tab */
  setActiveFilter: (tab) => set({ activeFilter: tab }),
}));
