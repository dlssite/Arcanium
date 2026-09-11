/**
 * @fileoverview Zustand store for the authenticated user profile, daily goal, stats, and badges.
 *
 * Phase 1: seeded from MOCK_USER / MOCK_DAILY_GOAL / MOCK_READING_STATS / MOCK_USER_BADGES.
 * Sprint 2 (real data): setUser(), setStats(), setBadges() are all called by useSyncUser
 *   after GET /api/v1/users/me resolves. Mock values serve as loading placeholders only
 *   and are overwritten as soon as the API responds.
 *
 * Constitution refs: §8.3 (feature-scoped Zustand stores), §8.1 (TanStack Query for server state)
 */

import { create } from 'zustand';
import {
  MOCK_USER,
  MOCK_DAILY_GOAL,
  MOCK_READING_STATS,
  MOCK_USER_BADGES,
  avatarImg,
} from '../mocks/mockData.js';

export const useUserStore = create((set, get) => ({
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /** @type {import('../types/user.js').User} */
  user: { ...MOCK_USER, role: 'USER', creatorApplicationStatus: null },

  /** @type {import('../types/user.js').DailyGoal} */
  dailyGoal: MOCK_DAILY_GOAL,

  /** @type {import('../types/user.js').ReadingStats} */
  stats: MOCK_READING_STATS,

  /**
   * User badges — hydrated from GET /api/v1/users/me.
   * Falls back to MOCK_USER_BADGES while loading so ProfileView never shows empty.
   * @type {import('../types/user.js').UserBadge[]}
   */
  badges: MOCK_USER_BADGES,

  /** Whether the user has any unread notifications (drives the badge dot in BottomNav). */
  hasUnreadNotifications: true,

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  /**
   * Hydrate the store with real user data from GET /api/v1/users/me.
   * Called by useSyncUser once TanStack Query resolves.
   *
   * @param {{ id: string, email: string, displayName: string, avatarUrl: string|null, archiveLevel: number, createdAt: string }} apiUser
   */
  setUser: (apiUser) =>
    set((state) => ({
      user: {
        ...state.user,
        id: apiUser.id,
        email: apiUser.email,
        displayName: apiUser.displayName,
        avatarUrl: apiUser.avatarUrl ?? avatarImg,
        archiveLevel: apiUser.archiveLevel ?? state.user.archiveLevel,
        createdAt: apiUser.createdAt,
        archiveLevelTitle: archiveLevelTitle(apiUser.archiveLevel ?? state.user.archiveLevel),
        role: apiUser.role ?? 'USER',
        creatorApplicationStatus: apiUser.creatorApplicationStatus ?? null,
      },
    })),

  /**
   * Hydrate stats returned by GET /api/v1/users/me.
   * @param {{ manuscriptsRead: number, totalHoursLogged: number, archiveRank: string, readingStreak: number }} apiStats
   */
  setStats: (apiStats) =>
    set((state) => ({
      stats: {
        ...state.stats,
        manuscriptsRead: apiStats.manuscriptsRead ?? state.stats.manuscriptsRead,
        totalHoursLogged: apiStats.totalHoursLogged ?? state.stats.totalHoursLogged,
        archiveRank: apiStats.archiveRank ?? state.stats.archiveRank,
        readingStreak: apiStats.readingStreak ?? state.stats.readingStreak,
      },
      // Sync streak onto user object — only touch readingStreak, never role
      user: {
        ...state.user,
        readingStreak: apiStats.readingStreak ?? state.user.readingStreak,
      },
    })),

  /**
   * Hydrate badges returned by GET /api/v1/users/me.
   * @param {import('../types/user.js').UserBadge[]} apiBadges
   */
  setBadges: (apiBadges) =>
    set({ badges: apiBadges }),

  /**
   * Update display name or avatar URL (e.g. after PATCH /api/v1/users/me).
   * @param {Partial<import('../types/user.js').User>} patch
   */
  updateUser: (patch) =>
    set((state) => ({ user: { ...state.user, ...patch } })),

  /**
   * Increment the reading streak by 1.
   * Phase 2: server computes streak authoritatively; client optimistically increments.
   */
  incrementStreak: () =>
    set((state) => ({
      user:  { ...state.user,  readingStreak: state.user.readingStreak + 1 },
      stats: { ...state.stats, readingStreak: state.stats.readingStreak + 1 },
    })),

  /**
   * Update daily reading goal progress.
   * @param {number} minutesRead
   */
  addReadingMinutes: (minutesRead) =>
    set((state) => {
      const completed = Math.min(
        state.dailyGoal.completedMinutes + minutesRead,
        state.dailyGoal.targetMinutes,
      );
      const progressPercent = Math.round(
        (completed / state.dailyGoal.targetMinutes) * 100,
      );
      return {
        dailyGoal: {
          ...state.dailyGoal,
          completedMinutes: completed,
          progressPercent,
          isCompleted: completed >= state.dailyGoal.targetMinutes,
        },
      };
    }),

  /**
   * Set a new daily reading goal target.
   * @param {number} targetMinutes
   */
  setGoalTarget: (targetMinutes) =>
    set((state) => {
      const progressPercent = Math.round(
        (state.dailyGoal.completedMinutes / targetMinutes) * 100,
      );
      return {
        dailyGoal: {
          ...state.dailyGoal,
          targetMinutes,
          progressPercent,
          isCompleted: state.dailyGoal.completedMinutes >= targetMinutes,
        },
      };
    }),

  /** Mark all notifications as read. */
  clearNotifications: () => set({ hasUnreadNotifications: false }),

  /**
   * Full reset — called on logout to clear real user data and restore mock defaults.
   */
  reset: () =>
    set({
      user: { ...MOCK_USER, role: 'USER', creatorApplicationStatus: null },
      dailyGoal: MOCK_DAILY_GOAL,
      stats: MOCK_READING_STATS,
      badges: MOCK_USER_BADGES,
      hasUnreadNotifications: true,
    }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function archiveLevelTitle(level) {
  const titles = {
    1: 'Level 1 Apprentice Archivist',
    2: 'Level 2 Junior Archivist',
    3: 'Level 3 Archivist',
    4: 'Level 4 Scholar Archivist',
    5: 'Level 5 Master Archivist',
  };
  return titles[level] ?? 'Archivist';
}
