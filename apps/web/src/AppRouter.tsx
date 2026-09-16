import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { LoginPage } from './features/auth/components/LoginPage';
import { AuthCallback } from './features/auth/components/AuthCallback';
import { useAuthStore } from './features/auth/store/useAuthStore';
import { useRestoreSession } from './features/auth/hooks/useRestoreSession';
import { useSyncUser } from './features/auth/hooks/useSyncUser';
import { useUserStore } from './stores/useUserStore.js';
import { authApi } from '@arcanium/api-client';

// ── Lazy-loaded view routes — each is a separate JS chunk (Constitution §4.2) ─
const AppShell      = lazy(() => import('./App'));
const HomeView      = lazy(() => import('./features/home/components/HomeView'));
const ExploreView   = lazy(() => import('./features/explore/components/ExploreView'));
const LibraryView   = lazy(() => import('./features/library/components/LibraryView'));
const LiberView     = lazy(() => import('./features/liber/components/LiberView'));
const CommunityView = lazy(() => import('./features/community/components/CommunityView'));
const ProfileView   = lazy(() => import('./features/profile/components/ProfileView'));
const CreatorDashboard = lazy(() => import('./features/creator/components/CreatorDashboard'));
const WorksList        = lazy(() => import('./features/creator/components/WorksList'));
const ChapterManager   = lazy(() => import('./features/creator/components/ChapterManager'));
// Circles — own routes, lazy-loaded separate chunks
const CirclesDirectory = lazy(() => import('./features/circles/components/CirclesDirectory'));
const CircleDetailView = lazy(() => import('./features/circles/components/CircleDetailView'));
// Connect — public facing connect page
const ConnectPage = lazy(() => import('./pages/ConnectPage'));
// Reader — own route outside the AppShell layout (full-screen, no nav chrome)
const ReaderView    = lazy(() => import('./features/reader/components/ReaderView'));

// ── Loading screen ────────────────────────────────────────────────────────────

function SessionLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#120E18]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#43335A] border-t-[#FFDE88]" />
    </div>
  );
}

// ── Route guard ───────────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// ── Authenticated shell ───────────────────────────────────────────────────────
// Mounts useSyncUser so it only fires when a valid session exists.
// Wraps every protected route inside the App layout shell.

function AuthenticatedApp() {
  useSyncUser();
  return (
    <Suspense fallback={<SessionLoader />}>
      <AppShell />
    </Suspense>
  );
}

// ── Logout handler ────────────────────────────────────────────────────────────

export function useLogout() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const resetUser = useUserStore((s) => s.reset);

  return async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearAuth();
    resetUser();
    navigate('/login', { replace: true });
  };
}

// ── Root router ───────────────────────────────────────────────────────────────

export function AppRouter() {
  const { isRestoring } = useRestoreSession();
  if (isRestoring) return <SessionLoader />;

  return (
    <Suspense fallback={<SessionLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Reader — full-screen, outside the app shell nav chrome */}
        <Route
          path="/read/:slug/:chapter"
          element={
            <RequireAuth>
              <Suspense fallback={<SessionLoader />}>
                <ReaderView />
              </Suspense>
            </RequireAuth>
          }
        />

        {/* Protected — full SPA shell with all views */}
        <Route
          path="/*"
          element={
            <RequireAuth>
              <AuthenticatedApp />
            </RequireAuth>
          }
        />
      </Routes>
    </Suspense>
  );
}

// ── View routes re-exported so App.jsx can use the same lazy instances ───────
export {
  HomeView,
  ExploreView,
  LibraryView,
  LiberView,
  CommunityView,
  ProfileView,
  CreatorDashboard,
  WorksList,
  ChapterManager,
  CirclesDirectory,
  CircleDetailView,
  ConnectPage,
};
