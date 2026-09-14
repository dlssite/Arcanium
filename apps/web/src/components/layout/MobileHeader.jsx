import React, { useState } from 'react';
import { Sun, Moon, Bell } from 'lucide-react';
import { GrimoireIcon } from './MobileMenuSheet.jsx';
import MobileMenuSheet from './MobileMenuSheet.jsx';
import { useUser } from '../../hooks/useUser.js';

/**
 * MobileHeader
 *
 * Sticky top bar rendered on every mobile route except /liber.
 * Owns the menuOpen state so MobileMenuSheet is mounted here — not
 * duplicated inside individual view components.
 *
 * Props:
 *   activeTab    — string  current route id (for sheet nav highlighting)
 *   setActiveTab — (id: string) => void
 *   theme        — 'light' | 'dark'
 *   setTheme     — (t: 'light' | 'dark') => void
 *   pageTitle    — optional string override; defaults to a title map lookup
 */

const PAGE_TITLES = {
  home:       'Arcanium',
  explore:    'Discover',
  library:    'My Library',
  community:  'Community',
  profile:    'My Profile',
  collection: 'Collection',
  creator:    'Creator Studio',
};

export default function MobileHeader({ activeTab, setActiveTab, theme, setTheme, pageTitle }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { hasUnreadNotifications } = useUser();

  const title = pageTitle ?? PAGE_TITLES[activeTab] ?? 'Arcanium';

  return (
    <>
      {/* ── Slide-up navigation sheet ── */}
      <MobileMenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* ── Sticky header bar ── */}
      <header className="sticky top-0 z-40 px-4 sm:px-5 py-2.5 bg-[#FAF8F5]/95 dark:bg-[#120E18]/95 backdrop-blur-md border-b border-[#ECE7DF]/80 dark:border-[#2C2237]/80 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-colors duration-200">

        {/* Left — grimoire menu button */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
          className="relative w-10 h-10 rounded-full bg-white dark:bg-[#1E1728] shadow-xs border border-[#ECE7DF] dark:border-[#352B44] flex items-center justify-center transition-all active:scale-95 focus:outline-none group overflow-visible flex-shrink-0"
        >
          {/* Glow halo when open */}
          <span
            className={`absolute inset-0 rounded-full transition-all duration-300 pointer-events-none ${
              menuOpen
                ? 'shadow-[0_0_0_3px_rgba(67,50,88,0.2),0_0_18px_6px_rgba(67,50,88,0.25)] dark:shadow-[0_0_0_3px_rgba(114,84,153,0.28),0_0_22px_8px_rgba(114,84,153,0.32)] bg-[#43335A]/8 dark:bg-[#2B1F3D]/40'
                : 'shadow-none bg-transparent'
            }`}
          />
          {/* Idle ambient pulse ring */}
          {!menuOpen && (
            <span className="absolute inset-[-3px] rounded-full border border-[#43335A]/12 dark:border-[#725499]/18 animate-ping pointer-events-none" />
          )}
          <GrimoireIcon
            className={`w-5 h-5 relative z-10 transition-all duration-200 ${
              menuOpen
                ? 'text-[#43335A] dark:text-[#FFDE88] scale-110'
                : 'text-[#43335A] dark:text-[#E2D9EC]'
            }`}
          />
        </button>

        {/* Centre — page title */}
        <p className="absolute left-1/2 -translate-x-1/2 font-serif font-bold text-[15px] tracking-[0.1em] text-[#342646] dark:text-[#F1ECF7] pointer-events-none select-none truncate max-w-[40vw]">
          {title}
        </p>

        {/* Right — theme toggle + notifications */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Theme toggle */}
          {setTheme && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
              className="w-10 h-10 rounded-full bg-white dark:bg-[#1E1728] shadow-xs border border-[#ECE7DF] dark:border-[#352B44] flex items-center justify-center text-[#43335A] dark:text-[#FFDE88] transition-all active:scale-95"
            >
              {theme === 'dark'
                ? <Sun  className="w-4 h-4 text-[#FFDE88]" />
                : <Moon className="w-4 h-4 text-[#43335A]" />}
            </button>
          )}

          {/* Notifications */}
          <button
            aria-label="Notifications"
            className="relative w-10 h-10 rounded-full bg-white dark:bg-[#1E1728] shadow-xs border border-[#ECE7DF] dark:border-[#352B44] flex items-center justify-center text-[#43335A] dark:text-[#E2D9EC] transition-all active:scale-95"
          >
            <Bell className="w-5 h-5 stroke-[1.8]" />
            {hasUnreadNotifications && (
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#43335A] dark:bg-[#DE9B35] rounded-full ring-2 ring-white dark:ring-[#1E1728]" />
            )}
          </button>
        </div>
      </header>
    </>
  );
}
