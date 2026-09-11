/**
 * @fileoverview useUser — primary hook for user profile, daily goal, and stats.
 *
 * Thin façade over useUserStore. Components import this hook, never the store.
 *
 * Usage:
 *   const { user, dailyGoal, stats, addReadingMinutes } = useUser();
 *
 * Constitution refs: §4.2 (hooks as the component-facing API)
 */

import { useUserStore } from '../stores/useUserStore.js';

/**
 * @returns {{
 *   user:                import('../types/user.js').User,
 *   dailyGoal:           import('../types/user.js').DailyGoal,
 *   stats:               import('../types/user.js').ReadingStats,
 *   hasUnreadNotifications: boolean,
 *   updateUser:          (patch: Partial<import('../types/user.js').User>) => void,
 *   incrementStreak:     () => void,
 *   addReadingMinutes:   (minutes: number) => void,
 *   setGoalTarget:       (targetMinutes: number) => void,
 *   clearNotifications:  () => void,
 * }}
 */
export function useUser() {
  const store = useUserStore();

  return {
    user: store.user,
    dailyGoal: store.dailyGoal,
    stats: store.stats,
    badges: store.badges,
    hasUnreadNotifications: store.hasUnreadNotifications,

    updateUser: store.updateUser,
    incrementStreak: store.incrementStreak,
    addReadingMinutes: store.addReadingMinutes,
    setGoalTarget: store.setGoalTarget,
    clearNotifications: store.clearNotifications,
  };
}
