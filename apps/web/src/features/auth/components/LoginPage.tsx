import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { authApi, resolveBaseUrl } from '@arcanium/api-client';
import { useAuthStore } from '../store/useAuthStore';
import arcaniumLogo from '../../../assets/arcanium.png';

const API_BASE = resolveBaseUrl();

type Mode = 'login' | 'register';

export function LoginPage() {
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const handleGoogleSignIn = () => {
    // Full-page redirect — backend handles the OAuth flow end-to-end
    window.location.href = `${API_BASE}/api/v1/auth/google`;
  };

  // ── Email / Password ──────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res =
        mode === 'register'
          ? await authApi.register({ email, password, displayName })
          : await authApi.login({ email, password });

      if (res.error) {
        setError(res.error.message);
        return;
      }

      setAccessToken(res.data.accessToken);
      navigate('/', { replace: true });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#120E18] px-4 text-[#F1ECF7]">
      {/* Brand */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl overflow-hidden border border-[#DE9B35]/30 shadow-[0_8px_32px_rgba(67,50,88,0.35)]">
          <img
            src={arcaniumLogo}
            alt="Arcanium logo"
            className="h-full w-full object-cover"
          />
        </div>
        <h1 className="font-serif text-4xl font-bold tracking-tight">ARCANIUM</h1>
        <p className="text-sm text-[#9F94AC]">The Living Archive</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-3xl border border-[#2C2237] bg-[#1D1726] p-7 shadow-xl">

        {/* Google Sign-In */}
        <button
          onClick={handleGoogleSignIn}
          type="button"
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#352B44] bg-[#251D30] px-4 py-3 text-sm font-semibold transition hover:bg-[#2F253D] active:scale-[0.98]"
        >
          {/* Inline Google SVG — no external asset needed */}
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#2C2237]" />
          <span className="text-xs text-[#6B6177]">or</span>
          <div className="h-px flex-1 bg-[#2C2237]" />
        </div>

        {/* Email / Password Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full rounded-xl border border-[#352B44] bg-[#120E18] px-4 py-2.5 text-sm outline-none placeholder-[#6B6177] focus:border-[#725499] focus:ring-2 focus:ring-purple-900/20 transition"
            />
          )}

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-xl border border-[#352B44] bg-[#120E18] px-4 py-2.5 text-sm outline-none placeholder-[#6B6177] focus:border-[#725499] focus:ring-2 focus:ring-purple-900/20 transition"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            minLength={8}
            className="w-full rounded-xl border border-[#352B44] bg-[#120E18] px-4 py-2.5 text-sm outline-none placeholder-[#6B6177] focus:border-[#725499] focus:ring-2 focus:ring-purple-900/20 transition"
          />

          {error && (
            <p className="rounded-xl bg-rose-950/40 border border-rose-800/60 px-3 py-2 text-xs text-rose-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-2xl bg-[#43335A] py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#533D6E] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Sparkles className="h-4 w-4 text-[#FFDE88]" />
            )}
            {mode === 'register' ? 'Create Archive Account' : 'Enter the Archive'}
          </button>
        </form>

        {/* Toggle mode */}
        <p className="mt-5 text-center text-xs text-[#6B6177]">
          {mode === 'login' ? (
            <>
              New to Arcanium?{' '}
              <button
                onClick={() => { setMode('register'); setError(null); }}
                className="text-[#D1BEE6] hover:text-white font-medium transition"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => { setMode('login'); setError(null); }}
                className="text-[#D1BEE6] hover:text-white font-medium transition"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
