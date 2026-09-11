import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { lazy } from 'react';

// Layout components
import BottomNav from './components/layout/BottomNav.jsx';
import DesktopSidebar from './components/layout/DesktopSidebar.jsx';
import DesktopHeader from './components/layout/DesktopHeader.jsx';
import LiberCompanionDock from './components/layout/LiberCompanionDock.jsx';
import { features } from './config/features.ts';
import { OfflineBanner } from './components/shared/OfflineBanner.tsx';

const CollectionPage = lazy(() => import('./features/collections/CollectionPage.tsx'));

// Lazy view components (imported from AppRouter to avoid double-chunking)
import {
  HomeView,
  ExploreView,
  LibraryView,
  LiberView,
  CommunityView,
  ProfileView,
  CreatorDashboard,
  WorksList,
  ChapterManager,
} from './AppRouter.tsx';
// ── Loading fallback (shown while a lazy chunk is fetching) ──────────────────

function ViewLoader() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[40vh]">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#43335A]/30 border-t-[#43335A] dark:border-[#725499]/30 dark:border-t-[#FFDE88]" />
    </div>
  );
}

/**
 * App — the persistent layout shell.
 *
 * Manages only one piece of global UI state:
 *   - theme  (light/dark, persisted to localStorage)
 *
 * isPlaying (audio narration) moved to useReaderStore — no prop drilling.
 * Navigation is now handled by React Router URL routes.
 */
export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Theme
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('arcanium_theme') || 'light';
    }
    return 'light';
  });

  // Apply dark class to <html> and persist preference
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('arcanium_theme', theme);
  }, [theme]);

  // Derive the "active tab" string from the URL for nav highlighting
  const activeTab = (() => {
    const p = location.pathname;
    if (p.startsWith('/explore'))    return 'explore';
    if (p.startsWith('/library'))    return 'library';
    if (p.startsWith('/liber'))      return 'liber';
    if (p.startsWith('/community'))  return 'community';
    if (p.startsWith('/profile'))    return 'profile';
    if (p.startsWith('/collection')) return 'collection';
    if (p.startsWith('/creator'))    return 'creator';
    return 'home';
  })();

  // Adapter: nav components call setActiveTab(id) → we navigate to the URL
  const setActiveTab = (tab) => {
    // Special Collections: tab looks like "collection:grimoires-spells"
    if (tab.startsWith('collection:')) {
      navigate(`/collection/${tab.slice('collection:'.length)}`);
      return;
    }
    const routes = {
      home:      '/',
      explore:   '/explore',
      library:   '/library',
      liber:     '/liber',
      community: '/community',
      profile:   '/profile',
      creator:   '/creator',
    };
    navigate(routes[tab] ?? '/');
  };

  const isLiberTab = activeTab === 'liber';
  // Only show dock when AI flag is on AND we're on home/explore
  const showCompanionDock = features.aiHousekeeper && (activeTab === 'home' || activeTab === 'explore');

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] text-[#2D223B] dark:text-[#F1ECF7] flex flex-col font-sans antialiased selection:bg-[#43335A] dark:selection:bg-[#725499] selection:text-white transition-colors duration-200">

      <OfflineBanner />

      {/* ------------------------------------------------------------------ */}
      {/* DESKTOP LAYOUT (>= 1024px)                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="hidden lg:flex min-h-screen w-full bg-[#FAF8F5] dark:bg-[#120E18] transition-colors duration-200">

        {/* Left collapsible sidebar */}
        <DesktopSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />

        {/* Central workspace */}
        <div
          className={`flex-1 flex flex-col min-w-0 h-screen ${
            isLiberTab ? 'overflow-hidden' : 'overflow-y-auto no-scrollbar'
          }`}
        >
          <DesktopHeader
            activeTab={activeTab}
            theme={theme}
            setTheme={setTheme}
          />

          <main
            className={`flex-1 min-w-0 ${
              isLiberTab
                ? 'p-4 lg:p-6 h-[calc(100vh-73px)] overflow-hidden flex flex-col'
                : 'px-6 lg:px-8 py-6 w-full'
            }`}
          >
            <Suspense fallback={<ViewLoader />}>
              <Routes>
                <Route path="/"          element={<HomeView onOpenLiber={() => setActiveTab('liber')} theme={theme} setTheme={setTheme} />} />
                <Route path="/explore"   element={<ExploreView />} />
                <Route path="/library"   element={<LibraryView />} />
                <Route path="/liber"     element={features.aiHousekeeper ? <LiberView onBack={() => setActiveTab('home')} /> : <Navigate to="/" replace />} />
                <Route path="/community" element={features.community ? <CommunityView /> : <Navigate to="/" replace />} />
                <Route path="/profile"   element={<ProfileView />} />
                <Route path="/creator"                             element={<Suspense fallback={<ViewLoader />}><CreatorDashboard /></Suspense>} />
                <Route path="/creator/works"                       element={<Suspense fallback={<ViewLoader />}><WorksList /></Suspense>} />
                <Route path="/creator/works/:contentId/chapters"   element={<Suspense fallback={<ViewLoader />}><ChapterManager /></Suspense>} />
                <Route path="/collection/:slug" element={<Suspense fallback={<ViewLoader />}><CollectionPage /></Suspense>} />
                <Route path="*"          element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>

        {/* Right companion dock — visible on Home and Explore only */}
        {showCompanionDock && (
          <LiberCompanionDock onExpandFull={() => setActiveTab('liber')} />
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MOBILE LAYOUT (< 1024px)                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="lg:hidden flex flex-col min-h-screen w-full bg-[#FAF8F5] dark:bg-[#120E18] relative transition-colors duration-200">
        <div className={`flex-1 w-full relative ${isLiberTab ? 'pb-0' : 'pb-20'}`}>
          <Suspense fallback={<ViewLoader />}>
            <Routes>
              <Route path="/"          element={<HomeView onOpenLiber={() => setActiveTab('liber')} theme={theme} setTheme={setTheme} />} />
              <Route path="/explore"   element={<ExploreView />} />
              <Route path="/library"   element={<LibraryView />} />
              <Route path="/liber"     element={<LiberView onBack={() => setActiveTab('home')} />} />
              <Route path="/community" element={<CommunityView />} />
              <Route path="/profile"   element={<ProfileView />} />
              <Route path="/creator"                             element={<Suspense fallback={<ViewLoader />}><CreatorDashboard /></Suspense>} />
              <Route path="/creator/works"                       element={<Suspense fallback={<ViewLoader />}><WorksList /></Suspense>} />
              <Route path="/creator/works/:contentId/chapters"   element={<Suspense fallback={<ViewLoader />}><ChapterManager /></Suspense>} />
              <Route path="/collection/:slug" element={<Suspense fallback={<ViewLoader />}><CollectionPage /></Suspense>} />
              <Route path="*"          element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>

        {/* Bottom nav hidden on Liber for full-screen companion experience */}
        {!isLiberTab && (
          <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        )}
      </div>
    </div>
  );
}
