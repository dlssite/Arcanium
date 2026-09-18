import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor, AlertCircle } from 'lucide-react';
import type { PWAState } from '../../hooks/usePWA';

/**
 * PWAInstallCard
 *
 * Shown when pwa.showInstallCard is true:
 *   - Not running in standalone mode
 *   - Not dismissed this session
 *   - A service worker is registered (or the device is iOS)
 *
 * "Install" button behaviour:
 *   - canNativeInstall  → triggers browser's built-in install prompt
 *   - isIOS             → shows Share → Add to Home Screen guide
 *   - otherwise         → shows generic browser menu guide
 *
 * Light / dark: follows the app's Tailwind `dark:` class strategy.
 * Layout: slides up above BottomNav on mobile, bottom-right card on desktop.
 */

interface Props {
  pwa: PWAState;
}

export function PWAInstallCard({ pwa }: Props) {
  const [visible, setVisible]     = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isMobile, setIsMobile]   = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!pwa.showInstallCard) {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, [pwa.showInstallCard]);

  if (!visible) return null;

  const handleInstall = async () => {
    if (pwa.canNativeInstall) {
      // Chrome / Edge / Android — native browser dialog
      const outcome = await pwa.promptInstall();
      if (outcome === 'accepted') setVisible(false);
    } else {
      // iOS, macOS Safari, or any other non-Chromium browser → show guide
      setShowGuide(true);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    pwa.dismissInstall();
  };

  const pos = isMobile ? 'bottom-20 left-3 right-3' : 'bottom-6 right-6 w-80';
  const em  = 'text-[#43335A] dark:text-[#F1ECF7]';

  // Detect macOS Safari (not iOS, not Chrome, has AppleWebKit)
  const isMacSafari = !pwa.isIOS &&
    /safari/i.test(navigator.userAgent) &&
    !/chrome|chromium|crios/i.test(navigator.userAgent) &&
    /mac/i.test(navigator.userAgent);

  // ── Step-by-step install guide ────────────────────────────────────────────
  if (showGuide) {
    type Step = React.ReactNode;
    let title: string;
    let steps: Step[];
    let footnote: string;

    if (pwa.isIOS) {
      title    = 'Install on iPhone / iPad';
      footnote = 'Arcanium will appear on your Home Screen and launch full-screen.';
      steps    = [
        <>Tap the <strong className={em}>Share</strong> button at the bottom of Safari (the box with an arrow pointing up).</>,
        <>Scroll down and tap <strong className={em}>Add to Home Screen</strong>.</>,
        <>Tap <strong className={em}>Add</strong> to confirm.</>,
      ];
    } else if (isMacSafari) {
      title    = 'Install on Mac';
      footnote = 'Arcanium will appear in your Dock and Applications folder.';
      steps    = [
        <>In Safari's menu bar, click <strong className={em}>File</strong>.</>,
        <>Select <strong className={em}>Add to Dock…</strong> (macOS Sonoma 14+) or <strong className={em}>Add to Home Screen</strong>.</>,
        <>Click <strong className={em}>Add</strong> to confirm.</>,
      ];
    } else {
      // Generic Chromium that somehow missed beforeinstallprompt
      title    = 'Install Arcanium';
      footnote = 'Arcanium launches full-screen like a native app — no app store required.';
      steps    = [
        <>Click the <strong className={em}>install icon</strong> (⊕) in the address bar, or open the browser menu (⋮).</>,
        <>Select <strong className={em}>Install Arcanium</strong> or <strong className={em}>Add to Home Screen</strong>.</>,
        <>Follow the on-screen prompt to finish.</>,
      ];
    }

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed z-50 ${pos} animate-slide-up
          bg-[#FAF8F5] dark:bg-[#1E1829]
          border border-[#ECE7DF] dark:border-[#43335A]/60
          rounded-2xl shadow-2xl p-4`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <img src="/arcanium.png" alt="" className="w-8 h-8 rounded-lg" aria-hidden="true" />
            <span className="font-semibold text-[#2D223B] dark:text-[#F1ECF7] text-sm">{title}</span>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="text-[#80778B] dark:text-[#9B8DB0] hover:text-[#2D223B] dark:hover:text-[#F1ECF7] transition-colors p-0.5 -mt-0.5 -mr-0.5 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ol className="space-y-2.5 text-xs text-[#5D4E6D] dark:text-[#C4B8D4]">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full bg-[#EFEBFA] dark:bg-[#43335A] text-[#43335A] dark:text-[#FFDE88] text-[10px] font-bold flex items-center justify-center"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <p className="mt-3 text-[10px] text-[#A79FAF] dark:text-[#6B5D80] leading-relaxed">
          {footnote}
        </p>
      </div>
    );
  }

  // ── Main install card ─────────────────────────────────────────────────────
  return (
    <div
      role="complementary"
      aria-label="Install Arcanium"
      className={`fixed z-50 ${pos} animate-slide-up overflow-hidden rounded-2xl shadow-2xl
        bg-[#FAF8F5] dark:bg-[#1E1829]
        border border-[#ECE7DF] dark:border-[#43335A]/60`}
    >
      {/* Accent strip */}
      <div
        className="h-0.5 w-full bg-gradient-to-r from-[#43335A]/30 via-[#43335A] to-[#43335A]/30 dark:from-[#43335A] dark:via-[#FFDE88]/60 dark:to-[#43335A]"
        aria-hidden="true"
      />

      <div className="p-4">
        <div className="flex items-start gap-3">
          <img
            src="/arcanium.png"
            alt="Arcanium"
            className="w-11 h-11 rounded-xl flex-shrink-0 shadow-md"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[#2D223B] dark:text-[#F1ECF7] font-semibold text-sm leading-tight">
                  Install Arcanium
                </p>
                <p className="text-[#80778B] dark:text-[#9B8DB0] text-xs mt-0.5 flex items-center gap-1">
                  {isMobile
                    ? <><Smartphone className="w-3 h-3" aria-hidden="true" />Add to your home screen</>
                    : <><Monitor className="w-3 h-3" aria-hidden="true" />Install as a desktop app</>
                  }
                </p>
              </div>
              <button
                onClick={handleDismiss}
                aria-label="Dismiss install prompt"
                className="flex-shrink-0 text-[#A79FAF] dark:text-[#6B5D80] hover:text-[#2D223B] dark:hover:text-[#9B8DB0] transition-colors p-0.5 -mt-0.5 -mr-0.5 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[#80778B] dark:text-[#7A6A8A] text-[11px] mt-1.5 leading-relaxed">
              Faster loads, offline reading, and a native-feel experience — no app store needed.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleDismiss}
            className="flex-1 py-2 px-3 rounded-xl text-xs font-medium
              text-[#5D4E6D] dark:text-[#9B8DB0]
              bg-[#F0EDE8] dark:bg-[#2A2238]
              hover:bg-[#E8E3DC] dark:hover:bg-[#332A42]
              transition-colors"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            disabled={pwa.isInstalling}
            className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold
              text-white dark:text-[#120E18]
              bg-[#43335A] dark:bg-[#FFDE88]
              hover:bg-[#523F71] dark:hover:bg-[#FFE99B]
              disabled:opacity-60 disabled:cursor-not-allowed
              transition-colors flex items-center justify-center gap-1.5"
          >
            {pwa.isInstalling
              ? <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-white/30 dark:border-[#120E18]/30 border-t-white dark:border-t-[#120E18]" aria-hidden="true" />
              : <Download className="w-3.5 h-3.5" aria-hidden="true" />
            }
            {pwa.isInstalling ? 'Opening…' : pwa.canNativeInstall ? 'Install' : 'How to install'}
          </button>
        </div>
      </div>
    </div>
  );
}
