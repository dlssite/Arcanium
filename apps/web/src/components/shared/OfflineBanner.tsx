import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * OfflineBanner — shown when navigator.onLine === false.
 * Wired into App.jsx via window online/offline events.
 * Constitution §8.2: "offline indicator — navigator.onLine + SW fetch event"
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const onOnline  = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);

    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 lg:bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-stone-800 dark:bg-stone-700 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg border border-stone-700 dark:border-stone-600 animate-fade-in"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
      <span>You're offline — reading from cached chapters only</span>
    </div>
  );
}
