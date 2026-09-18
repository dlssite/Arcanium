import { useState, useEffect, useCallback } from 'react';

/**
 * usePWA — central hook for all PWA lifecycle events.
 *
 * Handles:
 *  - Install prompt: captures `beforeinstallprompt`, exposes `promptInstall()`
 *  - Installed state: detects when the app is already running as a PWA
 *  - Update detection: detects a waiting SW and exposes `applyUpdate()`
 *  - Update result: `updateApplied` is set to true after the page reloads
 *    with a fresh SW so the banner can briefly confirm success.
 *
 * Constitution §8.2: SW registration lives in main.tsx. This hook reads the
 * `window.__pwaWaitingSW` reference placed there and listens to events on
 * the shared `window.__pwaEvents` EventTarget.
 */

// ── Types ────────────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export interface PWAState {
  /** True when the native install prompt is available (Android Chrome / Edge desktop). */
  canInstall: boolean;
  /** True when the app is already running in standalone / installed PWA mode. */
  isInstalled: boolean;
  /** True while the install prompt dialog is showing. */
  isInstalling: boolean;
  /** True when a new service worker is waiting to take over (update available). */
  updateAvailable: boolean;
  /** True when the user triggered an update and the page is about to reload. */
  isUpdating: boolean;
  /** Trigger the native install prompt. Resolves to 'accepted' | 'dismissed'. */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  /** Dismiss the install card and suppress it for the rest of the session. */
  dismissInstall: () => void;
  /** Tell the waiting SW to skip waiting, then reload the page. */
  applyUpdate: () => void;
  /** Dismiss the update banner without applying. */
  dismissUpdate: () => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const DISMISSED_KEY = 'arcanium_pwa_install_dismissed';

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePWA(): PWAState {
  // ── Install prompt state ─────────────────────────────────────────────────
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // ── Installed detection ──────────────────────────────────────────────────
  const [isInstalled, setIsInstalled] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari standalone
    (navigator as Navigator & { standalone?: boolean }).standalone === true,
  );

  // ── Update state ─────────────────────────────────────────────────────────
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    // Don't show install prompt if already installed or previously dismissed
    const wasDismissed = sessionStorage.getItem(DISMISSED_KEY) === 'true';
    if (isInstalled || wasDismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isInstalled]);

  useEffect(() => {
    // Track when the app transitions to standalone after install
    const mq = window.matchMedia('(display-mode: standalone)');
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setCanInstall(false);
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    // Listen for SW update events dispatched by main.tsx registration code
    const pwaEvents = (window as Window & { __pwaEvents?: EventTarget }).__pwaEvents;
    if (!pwaEvents) return;

    const onUpdateAvailable = () => setUpdateAvailable(true);
    pwaEvents.addEventListener('updateavailable', onUpdateAvailable);
    return () => pwaEvents.removeEventListener('updateavailable', onUpdateAvailable);
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setCanInstall(false);
        setDeferredPrompt(null);
      }
      return outcome;
    } finally {
      setIsInstalling(false);
    }
  }, [deferredPrompt]);

  const dismissInstall = useCallback(() => {
    sessionStorage.setItem(DISMISSED_KEY, 'true');
    setCanInstall(false);
    setDeferredPrompt(null);
  }, []);

  const applyUpdate = useCallback(() => {
    setIsUpdating(true);
    const waitingSW = (window as Window & { __pwaWaitingSW?: ServiceWorker }).__pwaWaitingSW;
    if (waitingSW) {
      waitingSW.postMessage({ type: 'SKIP_WAITING' });
      // SW will call clients.claim() → controllerchange fires → reload
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      }, { once: true });
    } else {
      // Fallback: hard reload will pick up new assets
      window.location.reload();
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  return {
    canInstall,
    isInstalled,
    isInstalling,
    updateAvailable,
    isUpdating,
    promptInstall,
    dismissInstall,
    applyUpdate,
    dismissUpdate,
  };
}
