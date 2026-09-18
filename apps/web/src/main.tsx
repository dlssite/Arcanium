import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from './AppRouter';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found in index.html');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

// ---------------------------------------------------------------------------
// Service Worker registration (Phase 4 — offline-first reader)
// Constitution §8.2: cache static assets + API responses via SW
//
// We also set up two globals consumed by usePWA.ts:
//   window.__pwaEvents     — EventTarget for dispatching 'updateavailable'
//   window.__pwaWaitingSW  — reference to the waiting SW so usePWA can post
//                            the SKIP_WAITING message without re-querying
// ---------------------------------------------------------------------------

// Shared event bus for PWA lifecycle events (install available, update ready)
const pwaEvents = new EventTarget();
(window as Window & { __pwaEvents?: EventTarget }).__pwaEvents = pwaEvents;

// Register in both PROD and DEV so that:
//  - beforeinstallprompt fires during local testing
//  - The update banner can be tested without a full production build
// The SW itself uses Cache-Control passthrough in dev so it never interferes
// with Vite's HMR or module serving.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.info('[SW] Registered');

        // Helper: stash a waiting SW and fire the updateavailable event so the
        // PWAUpdateBanner knows to show itself.
        const notifyWaiting = (sw: ServiceWorker) => {
          (window as Window & { __pwaWaitingSW?: ServiceWorker }).__pwaWaitingSW = sw;
          pwaEvents.dispatchEvent(new Event('updateavailable'));
        };

        // Already waiting on first load (e.g. hard-refresh over a previous version)
        if (registration.waiting) {
          notifyWaiting(registration.waiting);
        }

        // A new SW finishes installing while the page is open
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              // There is already an active SW controlling the page — this is an update
              notifyWaiting(installing);
            }
          });
        });

        // Poll for updates every 60s, but only when the tab is visible to avoid
        // wasteful bandwidth usage when multiple tabs are open.
        const pollForUpdates = () => {
          if (!document.hidden) {
            registration.update();
          }
        };

        const intervalId = setInterval(pollForUpdates, 60_000);

        // Also check immediately when the tab becomes visible after being hidden
        const onVisibilityChange = () => {
          if (!document.hidden) registration.update();
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        // Cleanup on unload (though in practice the page reload will clear this)
        return () => {
          clearInterval(intervalId);
          document.removeEventListener('visibilitychange', onVisibilityChange);
        };
      })
      .catch((err) => console.warn('[SW] Registration failed:', err));
  });
}
