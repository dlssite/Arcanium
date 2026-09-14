/**
 * adminStore — client-only UI state for the admin panel.
 *
 * Deliberately slim. This store owns exactly three things that are
 * genuinely client-local and do not belong in TanStack Query:
 *
 *  1. theme           — dark/light preference, persisted to localStorage
 *  2. sidebarCollapsed — nav collapse state
 *  3. playgroundHistory — Liber prompt test results accumulated in-session
 *
 * All domain data (users, content, creators, flags, analytics, etc.) is
 * managed by TanStack Query in the feature hooks. If you find yourself
 * reaching for this store for anything outside these three concerns,
 * put it in a hook instead.
 */

import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Playground types — exported so useLiberAnalytics can reference them
// ---------------------------------------------------------------------------

export interface PlaygroundToolCall {
  name:   string;
  args:   Record<string, unknown>;
  result: Record<string, unknown>;
}

export interface PlaygroundHistoryItem {
  id:         string;
  prompt:     string;
  response:   string;
  toolCall?:  PlaygroundToolCall;
  latencyMs:  number;
  tokensUsed: number;
  timestamp:  string;
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface AdminStoreState {
  // ── Theme ─────────────────────────────────────────────────────────────────
  theme:       'dark' | 'light';
  toggleTheme: () => void;

  // ── Sidebar ───────────────────────────────────────────────────────────────
  sidebarCollapsed: boolean;
  toggleSidebar:    () => void;

  // ── Liber Playground history (accumulates for the session) ────────────────
  playgroundHistory: PlaygroundHistoryItem[];
}

// ---------------------------------------------------------------------------
// Theme bootstrap — read localStorage once at module init
// ---------------------------------------------------------------------------

function getInitialTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('arcanium_admin_theme');
  return saved === 'light' ? 'light' : 'dark';
}

function applyTheme(theme: 'dark' | 'light') {
  if (typeof window === 'undefined') return;
  localStorage.setItem('arcanium_admin_theme', theme);
  document.documentElement.classList.toggle('dark',  theme === 'dark');
  document.documentElement.classList.toggle('light', theme === 'light');
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAdminStore = create<AdminStoreState>((set, get) => ({
  // ── Theme ─────────────────────────────────────────────────────────────────
  theme: getInitialTheme(),

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    set({ theme: next });
  },

  // ── Sidebar ───────────────────────────────────────────────────────────────
  sidebarCollapsed: false,

  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // ── Playground ────────────────────────────────────────────────────────────
  // Seeded with one example entry so the panel doesn't open to a blank slate.
  playgroundHistory: [
    {
      id:         'test_01',
      prompt:     'I feel a profound cosmic loneliness today. Suggest a web novel that mirrors this.',
      response:   'Ah, seeker of the deep stillness. When the stars feel too far and the silence too heavy, few tomes resonate as deeply as *Shadow Slave* or *Lord of the Mysteries*.',
      toolCall: {
        name:   'search_content',
        args:   { mood: 'Eldritch Melancholy', genre: 'Dark Fantasy', limit: 2 },
        result: { matched: ['Shadow Slave', 'Lord of the Mysteries'], relevanceScore: 0.98 },
      },
      latencyMs:  380,
      tokensUsed: 245,
      timestamp:  '10m ago',
    },
  ],
}));
