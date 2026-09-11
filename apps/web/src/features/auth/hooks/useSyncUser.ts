import { useEffect } from 'react';
import { useCurrentUser } from './useCurrentUser';
import { useUserStore } from '../../../stores/useUserStore.js';

/**
 * Bridge between TanStack Query (server state) and useUserStore (client state).
 *
 * Whenever useCurrentUser resolves with fresh data from GET /api/v1/users/me,
 * this hook writes it into useUserStore so every component that calls useUser()
 * gets real data without any changes to their own code.
 *
 * Now also hydrates stats and badges returned by the extended /me endpoint.
 * Mount this once inside AppRouter, inside the authenticated subtree.
 */
export function useSyncUser() {
  const { data: apiUser, isSuccess } = useCurrentUser();
  const setUser = useUserStore((s) => s.setUser);
  const setStats = useUserStore((s) => s.setStats);
  const setBadges = useUserStore((s) => s.setBadges);

  useEffect(() => {
    if (isSuccess && apiUser) {
      setUser(apiUser);
      if (apiUser.stats)  setStats(apiUser.stats);
      if (apiUser.badges) setBadges(apiUser.badges);
    }
  }, [isSuccess, apiUser, setUser, setStats, setBadges]);
}
