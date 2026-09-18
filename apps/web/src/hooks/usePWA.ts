import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * usePWA — central hook for all PWA lifecycle events.
 *
 * Install card visibility strategy:
 *   We do NOT wait for `beforeinstallprompt` to decide whether to show the
 *   card. That event is unreliable: it doesn't fire on iOS at all, and on
 *   Chrome it only fires after the SW has been controlling the page for at
 *   least one navigation (so never on the very first visit).
 *
 *   Instead we show the card whenever the app is "PWA-eligible":
 *     - Not already running in standalone mode
 *     - Not previously dismissed (sessionStorage)
 *     - A service worker registration exists (SW is at least registered)
 *
 *   When the user clicks "Install":
 *     - If `beforeinstallprompt` arrived (Chrome/Edge/Android): trigger it
 *     - If on iOS: show the Share → Add to Home Screen guide
 *     - Otherwise (Firefox, Samsung Internet, etc.): show generic guide
 *
 * Update flow:
 *   main.tsx sets window.__pwaEvents and window.__pwaWaitingSW.
 *   This hook listens for the 'updateavailable' event and exposes applyUpdate().
 */

// ── Types ────────────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export interface PWAState {
  /** True when we should show the install card (eligible + not dismissed). */
  showInstallCard: boolean;
  /** True when `beforeinstallprompt` has been captured — native prompt available. */
  canNativeInstall: boolean;
  /** True when running on iOS Safari (must use manual Share guide). */
  isIOS: boolean;
  /** True when running on Firefox desktop, which has no PWA install support. */
  isFirefoxDesktop: boolean;
  /** True when the app is already running in standalone / installed PWA mode. */
  isInstalled: boolean;
  /** True while the native install prompt dialog is open. */
  isInstalling: boolean;
  /** True when a new service worker is waiting to take over (update available). */
  updateAvailable: boolean;
  /** True after user triggered update, while page is reloading. */
  isUpdating: boolean;
  /** Trigger native prompt if available, otherwise returns 'unavailable'. */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  /** Hide the install card for this session. */
  dismissInstall: () => void;
  /** Tell the waiting SW to activate, then reload. */
  applyUpdate: () => void;
  /** Hide the update banner without reloading. */
  dismissUpdate: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DISMISSED_KEY = 'arcanium_pwa_install_dismissed';
const DISMISSED_EXPIRY_MS = 1000 * 60 * 60 * 24; // 24 hours

/**
 * Check if install was dismissed AND the dismissal hasn't expired.
 * Clears expired dismissals automatically.
 */
function wasDismissedRecently(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  const raw = sessionStorage.getItem(DISMISSED_KEY);
  if (!raw) return false;

  const timestamp = parseInt(raw, 10);
  if (isNaN(timestamp)) {
    // Malformed — clear and treat as not dismissed
    sessionStorage.removeItem(DISMISSED_KEY);
    return false;
  }

  const elapsed = Date.now() - timestamp;
  if (elapsed > DISMISSED_EXPIRY_MS) {
    // Expired — clear and allow re-showing
    sessionStorage.removeItem(DISMISSED_KEY);
    return false;
  }

  return true;
}

function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream
  );
}

/**
 * Firefox on desktop has no PWA install support (removed in 2021, not returning).
 * Firefox on Android has limited support — we still try there.
 * We detect desktop Firefox so we can suppress the card entirely rather than
 * showing misleading instructions.
 */
function isFirefoxDesktop(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isFirefox = /firefox/i.test(ua) && !/seamonkey/i.test(ua);
  const isMobile  = /android|mobile/i.test(ua);
  return isFirefox && !isMobile;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

async function hasSWRegistration(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.length > 0;
  } catch {
    return false;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePWA(): PWAState {
  const isIOS             = isIOSDevice();   // synchronous, stable
  const firefoxDesktop    = isFirefoxDesktop();
  const [isInstalled, setIsInstalled]   = useState(isStandalone);
  const [swReady, setSwReady]           = useState(false);   // SW registered?
  const [dismissed, setDismissed]       = useState(() => wasDismissedRecently());

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canNativeInstall, setCanNativeInstall] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating]           = useState(false);

  // ── Detect SW registration ────────────────────────────────────────────────
  useEffect(() => {
    // Check immediately (SW may already be registered from a prior page load)
    hasSWRegistration().then(setSwReady);

    // Also listen for the first registration in the current load
    if (!('serviceWorker' in navigator)) return;
    const onControllerChange = () => setSwReady(true);
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);

  // Also set swReady when registration resolves (main.tsx registers on 'load')
  useEffect(() => {
    if (swReady) return;
    const onLoad = () => hasSWRegistration().then(setSwReady);
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, [swReady]);

  // ── beforeinstallprompt (Chrome/Edge/Android) ─────────────────────────────
  useEffect(() => {
    if (isInstalled || dismissed) return;
    const handler = (e: Event) => {
      e.preventDefault();   // prevent default mini-infobar
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanNativeInstall(true);
      setSwReady(true);     // if we got this event, SW is definitely ready
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isInstalled, dismissed]);

  // ── Standalone transition (post-install) ──────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) { setIsInstalled(true); setCanNativeInstall(false); }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // ── SW update events from main.tsx ────────────────────────────────────────
  useEffect(() => {
    const pwaEvents = (window as Window & { __pwaEvents?: EventTarget }).__pwaEvents;
    if (!pwaEvents) return;
    const onUpdate = () => setUpdateAvailable(true);
    pwaEvents.addEventListener('updateavailable', onUpdate);
    return () => pwaEvents.removeEventListener('updateavailable', onUpdate);
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setCanNativeInstall(false);
        setDeferredPrompt(null);
      }
      return outcome;
    } finally {
      setIsInstalling(false);
    }
  }, [deferredPrompt]);

  const dismissInstall = useCallback(() => {
    const now = Date.now().toString();
    sessionStorage.setItem(DISMISSED_KEY, now);
    setDismissed(true);
    setCanNativeInstall(false);
    setDeferredPrompt(null);
  }, []);

  const applyUpdate = useCallback(() => {
    setIsUpdating(true);
    const waitingSW = (window as Window & { __pwaWaitingSW?: ServiceWorker }).__pwaWaitingSW;
    if (waitingSW) {
      waitingSW.postMessage({ type: 'SKIP_WAITING' });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      }, { once: true });
    } else {
      window.location.reload();
    }
  }, []);

  const dismissUpdate = useCallback(() => setUpdateAvailable(false), []);

  // ── Derived: should the install card render? ──────────────────────────────
  // Chromium browsers (Chrome, Edge, Brave, etc.): wait for beforeinstallprompt
  // iOS: show immediately (no beforeinstallprompt event exists)
  // Firefox desktop: never show
  // 
  // Hide when: installed, dismissed, or Firefox desktop
  // Show when: 
  //   - iOS: always (if not installed/dismissed)
  //   - Chromium: only after beforeinstallprompt fired (canNativeInstall)
  const showInstallCard = !isInstalled && !dismissed && !firefoxDesktop && (isIOS || canNativeInstall);

  return {
    showInstallCard,
    canNativeInstall,
    isIOS,
    isFirefoxDesktop: firefoxDesktop,
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
