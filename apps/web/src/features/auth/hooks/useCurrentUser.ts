import { useQuery } from '@tanstack/react-query';
import { usersApi, apiClient } from '@arcanium/api-client';
import { useAuthStore } from '../store/useAuthStore';
import type { UserProfile } from '@arcanium/types';

// Wire the token getter into the api-client once, at hook boundary.
// Keeps api-client free of any React/Zustand dependency.
apiClient.setTokenGetter(() => useAuthStore.getState().accessToken);

export const USER_QUERY_KEY = ['users', 'me'] as const;

export function useCurrentUser() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<UserProfile>({
    queryKey: USER_QUERY_KEY,
    queryFn: async () => {
      const res = await usersApi.getMe();
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 10, // 10 minutes — profile data changes rarely
    retry: 1,
  });
}
