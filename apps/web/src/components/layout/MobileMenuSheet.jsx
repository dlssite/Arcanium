import React, { useEffect, useRef } from 'react';
import {
  Home,
  Compass,
  Library,
  Sparkles,
  Users,
  User,
  ChevronRight,
  Scroll,
  X,
  CircleDot,
  Link2,
} from 'lucide-react';
import { useCollections } from '../../hooks/useCollections.ts';
import { features } from '../../config/features.ts';
import arcaniumLogo from '../../assets/arcanium.png';

// ── Grimoire Menu Icon ────────────────────────────────────────────────────────
// Exported so the mobile header button (HomeView) can use the same icon.
export function GrimoireIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Spine */}
      <path d="M4 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4" stroke="currentColor" strokeWidth="1.8" />
      <line x1="4" y1="3" x2="4" y2="21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      {/* Page lines */}
      <line x1="9" y1="8"  x2="16" y2="8"  stroke="currentColor" strokeWidth="1.5" />
      <line x1="9" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.5" />
      <line x1="9" y1="16" x2="13" y2="16" stroke="currentColor" strokeWidth="1.5" />
      {/* Ornament */}
      <circle cx="17.5" cy="16" r="0.7" fill="currentColor" />
    </svg>
  );
}

/**
 * MobileMenuSheet
 *
 * A slide-up bottom sheet for mobile that mirrors the desktop sidebar's
 * navigation items and Special Collections list.
 *
 * Props:
 *   open        — boolean
 *   onClose     — () => void
 *   activeTab   — string (current route id)
 *   setActiveTab — (id: string) => void
 */
export default function MobileMenuSheet({ open, onClose, activeTab, setActiveTab }) {
  const { collections } = useCollections();
  const sheetRef = useRef(null);

  // Close on backdrop tap
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Trap body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Navigate and close sheet
  function navigate(tab) {
    setActiveTab(tab);
    onClose();
  }

  const navItems = [
    { id: 'home',      label: 'Home',             icon: Home },
    { id: 'explore',   label: 'Discover',          icon: Compass },
    { id: 'library',   label: 'Library',           icon: Library },
    ...(features.aiHousekeeper
      ? [{ id: 'liber', label: 'Liber Companion', icon: Sparkles, badge: 'AI' }]
      : []),
    ...(features.community
      ? [{ id: 'community', label: 'Community', icon: Users }]
      : []),
    ...(features.circles
      ? [{ id: 'circles', label: 'Reading Circles', icon: CircleDot }]
      : []),
    { id: 'profile',   label: 'Scholar Profile',   icon: User },
    { id: 'connect',   label: 'Connect',           icon: Link2 },
  ];

  return (
    <>
      {/* ---------- Backdrop ---------- */}
      <div
        aria-hidden="true"
        onClick={handleBackdropClick}
        className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* ---------- Sheet ---------- */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed bottom-0 left-0 right-0 z-[70] max-h-[85vh] flex flex-col
          bg-[#FAF8F5] dark:bg-[#15101C]
          border-t border-[#ECE7DF] dark:border-[#2E243A]
          rounded-t-3xl shadow-[0_-12px_48px_-8px_rgba(40,25,60,0.22)]
          transition-transform duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)]
          ${open ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#D9D3E0] dark:bg-[#3D2D50]" />
        </div>

        {/* Sheet header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#DE9B35]/40 shadow-[0_4px_14px_rgba(67,50,88,0.22)] flex-shrink-0">
              <img src={arcaniumLogo} alt="Arcanium" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-base tracking-[0.13em] text-[#342646] dark:text-[#F1ECF7] leading-none">
                ARCANIUM
              </h2>
              <p className="text-[9px] font-bold tracking-[0.2em] text-[#93889F] dark:text-[#8D819A] uppercase mt-0.5">
                THE LIVING ARCHIVE
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="w-8 h-8 rounded-xl bg-white dark:bg-[#1E1728] border border-[#ECE7DF] dark:border-[#352B44] flex items-center justify-center text-[#8C8296] dark:text-[#9A8FA7] hover:text-[#43335A] dark:hover:text-white transition-colors active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-4 pb-8">

          {/* ── Primary navigation ── */}
          <p className="text-[10px] uppercase font-bold tracking-[0.18em] text-[#A399AE] dark:text-[#7A6F87] px-1 mb-2.5">
            Navigation
          </p>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-[13px] font-semibold transition-all duration-200 active:scale-[0.98] ${
                    isActive
                      ? 'bg-gradient-to-r from-[#43335A] to-[#55406E] text-white shadow-[0_6px_20px_rgba(67,50,88,0.22)] border border-[#685285]/30 font-bold'
                      : 'text-[#645970] dark:text-[#A69CAF] bg-white dark:bg-[#1E1728] border border-[#ECE7DF] dark:border-[#2E243A] hover:border-[#D6CFDF] dark:hover:border-[#53436B] hover:text-[#43335A] dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 flex-shrink-0 ${
                      isActive
                        ? 'text-[#FFDE88]'
                        : 'text-[#8A8096] dark:text-[#8E839C]'
                    }`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge ? (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isActive
                        ? 'bg-[#FFDE88] text-[#43335A]'
                        : 'bg-[#F2EDFA] dark:bg-[#2B2138] text-[#554271] dark:text-[#D1BEE6] border border-[#E1D4F0] dark:border-[#3D3050]'
                    }`}>
                      <Sparkles className="w-2.5 h-2.5" />
                      {item.badge}
                    </span>
                  ) : (
                    <ChevronRight className={`w-4 h-4 transition-opacity ${
                      isActive ? 'text-white/60 opacity-100' : 'text-[#B8AFBF] dark:text-[#645970] opacity-60'
                    }`} />
                  )}
                </button>
              );
            })}
          </nav>

          {/* ── Special Collections ── */}
          {collections.length > 0 && (
            <div className="mt-6 pt-5 border-t border-[#ECE7DF]/80 dark:border-[#2E243A]">
              <p className="text-[10px] uppercase font-bold tracking-[0.18em] text-[#A399AE] dark:text-[#7A6F87] px-1 mb-3 flex items-center justify-between">
                <span>Special Collections</span>
                <Scroll className="w-3 h-3 text-[#B0A6BB] dark:text-[#7A6F87]" />
              </p>

              <div className="grid grid-cols-2 gap-2">
                {collections.map((c, idx) => {
                  const slug = `collection:${c.slug}`;
                  const isActive = activeTab === 'collection' || activeTab === slug;
                  return (
                    <button
                      key={c.id ?? idx}
                      onClick={() => navigate(slug)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all duration-200 active:scale-[0.97] ${
                        isActive
                          ? 'bg-[#43335A] text-white border border-[#685285]/30'
                          : 'bg-white dark:bg-[#1E1728] border border-[#ECE7DF] dark:border-[#2E243A] text-[#70657C] dark:text-[#A69CAF] hover:text-[#43335A] dark:hover:text-white hover:border-[#D6CFDF] dark:hover:border-[#53436B]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.coverColor ?? c.color ?? 'bg-purple-400'} ring-2 ring-white dark:ring-[#1E1728]`} />
                      <span className="truncate">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
