import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor } from 'lucide-react';
import type { PWAState } from '../../hooks/usePWA';

/**
 * PWAInstallCard
 *
 * Shown at the bottom of the screen when `canInstall` is true (native
 * `beforeinstallprompt`) or on iOS where the prompt API is unavailable
 * (we show manual "Share → Add to Home Screen" instructions instead).
 *
 * Mobile: slides up from the bottom above the BottomNav.
 * Desktop: appears as a compact card in the bottom-right corner.
 */

interface Props {
  pwa: PWAState;
}

function useIsIOS() {
  const [ios, setIos] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent;
    setIos(/iphone|ipad|ipod/i.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream);
  }, []);
  return ios;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    setMobile(window.innerWidth < 1024);
    const handler = () => setMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}

export function PWAInstallCard({ pwa }: Props) {
  const isIOS = useIsIOS();
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Animate in after a short delay so it doesn't immediately fight for attention
  useEffect(() => {
    if (!pwa.canInstall && !isIOS) return;
    if (pwa.isInstalled) return;

    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, [pwa.canInstall, pwa.isInstalled, isIOS]);

  if (pwa.isInstalled) return null;
  if (!visible) return null;
  // On non-iOS we require the native prompt to be available
  if (!isIOS && !pwa.canInstall) return null;

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    const outcome = await pwa.promptInstall();
    if (outcome === 'accepted') setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
    pwa.dismissInstall();
  };

  // ── iOS manual guide ────────────────────────────────────────────────────
  if (showIOSGuide) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Install Arcanium on iOS"
        className={`fixed z-50 ${
          isMobile
            ? 'bottom-20 left-3 right-3'
            : 'bottom-6 right-6 w-80'
        } bg-[#1E1829] border border-[#43335A]/60 rounded-2xl shadow-2xl p-4 animate-slide-up`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <img src="/arcanium.png" alt="Arcanium" className="w-8 h-8 rounded-lg" />
            <span className="font-semibold text-[#F1ECF7] text-sm">Install on iPhone / iPad</span>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="text-[#9B8DB0] hover:text-[#F1ECF7] transition-colors p-0.5 -mt-0.5 -mr-0.5 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ol className="space-y-2.5 text-[#C4B8D4] text-xs">
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#43335A] text-[#FFDE88] text-[10px] font-bold flex items-center justify-center">1</span>
            <span>Tap the <strong className="text-[#F1ECF7]">Share</strong> button at the bottom of Safari (the box with an arrow pointing up).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#43335A] text-[#FFDE88] text-[10px] font-bold flex items-center justify-center">2</span>
            <span>Scroll down and tap <strong className="text-[#F1ECF7]">Add to Home Screen</strong>.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#43335A] text-[#FFDE88] text-[10px] font-bold flex items-center justify-center">3</span>
            <span>Tap <strong className="text-[#F1ECF7]">Add</strong> to confirm.</span>
          </li>
        </ol>

        <p className="mt-3 text-[10px] text-[#6B5D80] leading-relaxed">
          Arcanium will appear on your home screen and launch in full-screen like a native app.
        </p>
      </div>
    );
  }

  // ── Native prompt card ──────────────────────────────────────────────────
  return (
    <div
      role="complementary"
      aria-label="Install Arcanium"
      className={`fixed z-50 ${
        isMobile
          ? 'bottom-20 left-3 right-3'
          : 'bottom-6 right-6 w-80'
      } bg-[#1E1829] border border-[#43335A]/60 rounded-2xl shadow-2xl overflow-hidden animate-slide-up`}
    >
      {/* Subtle gradient accent strip */}
      <div className="h-0.5 w-full bg-gradient-to-r from-[#43335A] via-[#FFDE88]/60 to-[#43335A]" />

      <div className="p-4">
        <div className="flex items-start gap-3">
          <img
            src="/arcanium.png"
            alt="Arcanium"
            className="w-11 h-11 rounded-xl flex-shrink-0 shadow-md"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[#F1ECF7] font-semibold text-sm leading-tight">Install Arcanium</p>
                <p className="text-[#9B8DB0] text-xs mt-0.5">
                  {isMobile ? (
                    <span className="flex items-center gap-1">
                      <Smartphone className="w-3 h-3" /> Add to your home screen
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Monitor className="w-3 h-3" /> Install as a desktop app
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={handleDismiss}
                aria-label="Dismiss install prompt"
                className="text-[#6B5D80] hover:text-[#9B8DB0] transition-colors p-0.5 -mt-0.5 -mr-0.5 rounded flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[#7A6A8A] text-[11px] mt-1.5 leading-relaxed">
              Faster loads, offline reading, and a native-feel experience — no app store needed.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleDismiss}
            className="flex-1 py-2 px-3 rounded-xl text-xs font-medium text-[#9B8DB0] bg-[#2A2238] hover:bg-[#332A42] transition-colors"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            disabled={pwa.isInstalling}
            className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-[#120E18] bg-[#FFDE88] hover:bg-[#FFE99B] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
          >
            {pwa.isInstalling ? (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-[#120E18]/30 border-t-[#120E18]" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {pwa.isInstalling ? 'Opening…' : 'Install'}
          </button>
        </div>
      </div>
    </div>
  );
}
