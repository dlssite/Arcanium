import { create } from 'zustand';
import { apiClient } from '@arcanium/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminUser {
  id:          string;
  displayName: string;
  email:       string;
  avatarUrl:   string | null;
  role:        string;
}

interface AdminAuthState {
  /** The short-lived access JWT kept in memory — never persisted to storage. */
  token: string | null;
  isAuthenticated: boolean;
  /** Logged-in admin user profile — null until first successful login/refresh. */
  user: AdminUser | null;
  /** True while a login or silent-refresh network call is in-flight. */
  isLoading: boolean;
  /** Human-readable login error to surface in the login form. */
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Attempt to exchange the httpOnly refresh cookie for a new access token.
   * Called on app mount so a page reload does not log the admin out.
   * Fails silently — the user will be redirected to /login by the route guard.
   */
  silentRefresh: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helper — fetch /api/v1/users/me and return a minimal AdminUser shape
// ---------------------------------------------------------------------------

async function fetchAdminUser(): Promise<AdminUser | null> {
  try {
    const res = await apiClient.get<{
      id: string; displayName: string; email: string; avatarUrl: string | null; role: string;
    }>('/api/v1/users/me');
    if (res.error || !res.data) return null;
    return {
      id:          res.data.id,
      displayName: res.data.displayName,
      email:       res.data.email,
      avatarUrl:   res.data.avatarUrl,
      role:        res.data.role,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  token: null,
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const res = await apiClient.post<{ accessToken: string }>(
        '/api/v1/auth/login',
        { email, password },
      );

      if (res.error) {
        set({
          isLoading: false,
          error: res.error.message ?? 'Login failed',
          isAuthenticated: false,
        });
        return;
      }

      const accessToken = res.data?.accessToken;
      if (!accessToken) {
        set({ isLoading: false, error: 'No token received', isAuthenticated: false });
        return;
      }

      // Attach the token to all future apiClient requests for this session.
      apiClient.setTokenGetter(() => useAdminAuthStore.getState().token);
      set({ token: accessToken, isAuthenticated: true, isLoading: false, error: null });

      // Fetch the real user profile now that the token is wired up
      const user = await fetchAdminUser();
      set({ user });
    } catch {
      set({
        isLoading: false,
        error: 'Could not reach the server. Check your connection.',
        isAuthenticated: false,
      });
    }
  },

  logout: async () => {
    try {
      await apiClient.post<{ message: string }>('/api/v1/auth/logout');
    } catch {
      // Best-effort — clear local state regardless of network error.
    }
    // Detach the token getter so subsequent requests send no Authorization header.
    apiClient.setTokenGetter(() => null);
    set({ token: null, isAuthenticated: false, user: null, error: null });
  },

  silentRefresh: async () => {
    // Don't show a loading spinner for silent refresh — it runs in the background.
    try {
      const res = await apiClient.post<{ accessToken: string }>('/api/v1/auth/refresh');

      if (res.data?.accessToken) {
        // Wire up the token getter now that we have a valid token.
        apiClient.setTokenGetter(() => useAdminAuthStore.getState().token);
        set({ token: res.data.accessToken, isAuthenticated: true });

        // Fetch the real user profile now that the token is wired up
        const user = await fetchAdminUser();
        set({ user });
      } else {
        set({ isAuthenticated: false });
      }
    } catch {
      // Refresh failed — user will be redirected to /login by the route guard.
      set({ isAuthenticated: false });
    }
  },
}));
