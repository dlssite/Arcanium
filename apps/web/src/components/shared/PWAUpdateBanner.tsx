import React from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import type { PWAState } from '../../hooks/usePWA';

/**
 * PWAUpdateBanner
 *
 * Shown when a new service worker is waiting to activate.
 * Clicking "Update now" posts SKIP_WAITING → controllerchange → page reload.
 *
 * Light / dark: follows the app's Tailwind `dark:` class strategy.
 * Position: above BottomNav on mobile, bottom-right on desktop.
 */

interface Props {
  pwa: PWAState;
}

export function PWAUpdateBanner({ pwa }: Props) {
  if (!pwa.updateAvailable) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="fixed bottom-20 lg:bottom-6 lg:right-6 left-3 right-3 lg:left-auto lg:w-80 z-[60] animate-slide-up"
    >
      <div className="overflow-hidden rounded-2xl shadow-2xl
        bg-[#FAF8F5] dark:bg-[#1E1829]
        border border-[#ECE7DF] dark:border-[#FFDE88]/30"
      >
        {/* Accent strip */}
        <div
          className="h-0.5 w-full bg-gradient-to-r
            from-[#43335A]/30 via-[#43335A] to-[#43335A]/30
            dark:from-[#FFDE88]/40 dark:via-[#FFDE88] dark:to-[#FFDE88]/40"
          aria-hidden="true"
        />

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon badge */}
            <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
              bg-[#EFEBFA] dark:bg-[#FFDE88]/10
              border border-[#D4CCE8] dark:border-[#FFDE88]/20"
            >
              <Sparkles
                className="w-[18px] h-[18px] text-[#43335A] dark:text-[#FFDE88]"
                aria-hidden="true"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[#2D223B] dark:text-[#F1ECF7] font-semibold text-sm leading-tight">
                  Update available
                </p>
                {!pwa.isUpdating && (
                  <button
                    onClick={pwa.dismissUpdate}
                    aria-label="Dismiss update notification"
                    className="flex-shrink-0 text-[#A79FAF] dark:text-[#6B5D80] hover:text-[#2D223B] dark:hover:text-[#9B8DB0] transition-colors p-0.5 -mt-0.5 -mr-0.5 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[#80778B] dark:text-[#7A6A8A] text-[11px] mt-0.5 leading-relaxed">
                A new version of Arcanium has downloaded and is ready to install.
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            {!pwa.isUpdating && (
              <button
                onClick={pwa.dismissUpdate}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-medium
                  text-[#5D4E6D] dark:text-[#9B8DB0]
                  bg-[#F0EDE8] dark:bg-[#2A2238]
                  hover:bg-[#E8E3DC] dark:hover:bg-[#332A42]
                  transition-colors"
              >
                Later
              </button>
            )}
            <button
              onClick={pwa.applyUpdate}
              disabled={pwa.isUpdating}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold
                text-white dark:text-[#120E18]
                bg-[#43335A] dark:bg-[#FFDE88]
                hover:bg-[#523F71] dark:hover:bg-[#FFE99B]
                disabled:opacity-70 disabled:cursor-wait
                transition-colors flex items-center justify-center gap-1.5"
            >
              {pwa.isUpdating ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-white/30 dark:border-[#120E18]/30 border-t-white dark:border-t-[#120E18]" aria-hidden="true" />
                  <span>Updating…</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Update now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
