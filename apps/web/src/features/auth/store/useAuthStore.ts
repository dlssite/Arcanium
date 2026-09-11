import { create } from 'zustand';

/**
 * In-memory JWT store.
 * Constitution §9.1: JWTs MUST NOT be stored in localStorage (XSS risk).
 * The access token lives here — it clears on page reload.
 * The httpOnly refresh cookie is sent automatically by the browser on every
 * request to /api/v1/auth/refresh, so the user is silently re-authenticated.
 */

interface AuthState {
  accessToken: string | null;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  isAuthenticated: false,

  setAccessToken: (token) => set({ accessToken: token, isAuthenticated: true }),
  clearAuth: () => set({ accessToken: null, isAuthenticated: false }),
}));
