import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Handles the redirect from the backend after Google OAuth.
 * The backend redirects to /auth/callback#token=<JWT>
 *
 * The fragment (#token=...) is NEVER sent to the server — it stays in the
 * browser only. We read it once, store it in Zustand (memory only), and
 * immediately strip it from the URL so it doesn't sit in browser history.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const token = fragment.get('token');

    if (token) {
      setAccessToken(token);
      // Remove the token from the URL bar immediately
      window.history.replaceState(null, '', '/');
    }

    navigate('/', { replace: true });
  }, [navigate, setAccessToken]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#120E18] text-[#F1ECF7]">
      <p className="text-sm text-[#9F94AC]">Signing you in…</p>
    </div>
  );
}
