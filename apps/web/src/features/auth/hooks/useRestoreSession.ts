import { useEffect, useState } from 'react';
import { authApi } from '@arcanium/api-client';
import { useAuthStore } from '../store/useAuthStore';
import type { ApiResponse, AuthTokenResponse } from '@arcanium/types';

/**
 * On every app load, silently exchange the httpOnly refresh cookie
 * for a new access token. If the cookie is missing or expired,
 * the user lands on the login page.
 *
 * This is what makes the "stay signed in" experience work without
 * storing anything in localStorage.
 */
export function useRestoreSession() {
  const [isRestoring, setIsRestoring] = useState(true);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);

  useEffect(() => {
    authApi
      .refresh()
      .then((res: ApiResponse<AuthTokenResponse>) => {
        if (!res.error) {
          setAccessToken(res.data.accessToken);
        }
      })
      .catch(() => {
        // No refresh cookie — user is not logged in. That's fine.
      })
      .finally(() => {
        setIsRestoring(false);
      });
  }, [setAccessToken]);

  return { isRestoring };
}
