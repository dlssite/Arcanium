import React from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import type { PWAState } from '../../hooks/usePWA';

/**
 * PWAUpdateBanner
 *
 * Shown when a new service worker is waiting to activate (i.e. a new
 * version of the app has been downloaded in the background).
 *
 * Clicking "Update" posts SKIP_WAITING to the waiting SW, which triggers
 * a controllerchange event → the page reloads automatically.
 *
 * Positioned above the BottomNav on mobile and at the top-right on desktop
 * so it doesn't overlap other fixed chrome.
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
      <div className="bg-[#1E1829] border border-[#FFDE88]/30 rounded-2xl shadow-2xl overflow-hidden">
        {/* Accent strip */}
        <div className="h-0.5 w-full bg-gradient-to-r from-[#FFDE88]/40 via-[#FFDE88] to-[#FFDE88]/40" />

        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#FFDE88]/10 border border-[#FFDE88]/20 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-[#FFDE88]" aria-hidden="true" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <p className="text-[#F1ECF7] font-semibold text-sm leading-tight">Update available</p>
                {!pwa.isUpdating && (
                  <button
                    onClick={pwa.dismissUpdate}
                    aria-label="Dismiss update notification"
                    className="text-[#6B5D80] hover:text-[#9B8DB0] transition-colors p-0.5 -mt-0.5 -mr-0.5 rounded flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[#7A6A8A] text-[11px] mt-0.5 leading-relaxed">
                A new version of Arcanium has downloaded in the background and is ready to install.
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            {!pwa.isUpdating && (
              <button
                onClick={pwa.dismissUpdate}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-medium text-[#9B8DB0] bg-[#2A2238] hover:bg-[#332A42] transition-colors"
              >
                Later
              </button>
            )}
            <button
              onClick={pwa.applyUpdate}
              disabled={pwa.isUpdating}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-[#120E18] bg-[#FFDE88] hover:bg-[#FFE99B] disabled:opacity-70 disabled:cursor-wait transition-colors flex items-center justify-center gap-1.5"
            >
              {pwa.isUpdating ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-[#120E18]/30 border-t-[#120E18]" />
                  <span>Updating…</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
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
