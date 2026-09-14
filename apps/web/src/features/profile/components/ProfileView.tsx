// @ts-nocheck
// TODO: Full TypeScript typing — tracked as M5 in web-app-audit.md.
// File was converted from .jsx during the M1 view relocation sprint.
// Proper prop interfaces and return types to be added in the Phase 4 TS pass.
import React, { useState } from 'react';
import {
  Flame,
  Award,
  BookOpen,
  Clock,
  Shield,
  Sparkles,
  Compass,
  Moon,
  Scroll,
  BookMarked,
  Play,
  X,
  Lock,
  ChevronRight,
  Check,
  LogOut,
} from 'lucide-react';
import BookDetailModal from '../../../components/shared/BookDetailModal.tsx';
import { useUser } from '../../../hooks/useUser.js';
import { useLibrary } from '../../../hooks/useLibrary.js';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { LIBRARY_FILTER_TABS } from '../../../mocks/mockData.js';
import { useLogout } from '../../../AppRouter.tsx';

/**
 * Icon lookup so badge.iconName strings resolve to lucide components.
 * Keeps badge data free of React imports.
 */
const BADGE_ICONS = { Moon, Sparkles, BookOpen, Compass, Scroll, Clock, Shield, Award };

export default function ProfileView() {
  const [showBadgesModal, setShowBadgesModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  const { user, stats, badges } = useUser();
  const { filteredBooks, filterCounts, activeFilter, setFilter, libraryBooks, addBook, removeBook, isInLibrary, isLoading } = useLibrary();
  const { isAuthenticated } = useAuthStore();
  const logout = useLogout();

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading && libraryBooks.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] pb-28 lg:pb-12 pt-2 px-4 sm:px-6 lg:px-0 w-full">
        <div className="bg-white dark:bg-[#1D1726] rounded-3xl p-5 sm:p-7 border border-[#ECE7DF] dark:border-[#352B44] animate-pulse mb-6">
          <div className="flex gap-5">
            <div className="w-20 h-20 rounded-full bg-stone-200 dark:bg-stone-700 flex-shrink-0" />
            <div className="flex-1 space-y-3 pt-2">
              <div className="h-6 bg-stone-200 dark:bg-stone-700 rounded w-1/3" />
              <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-1/2" />
              <div className="grid grid-cols-3 gap-2 pt-2">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-stone-200 dark:bg-stone-700 rounded-2xl" />)}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#1D1726] rounded-2xl p-4 border border-[#ECE7DF] dark:border-[#352B44] animate-pulse flex gap-4">
              <div className="w-20 h-28 rounded-xl bg-stone-200 dark:bg-stone-700 flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-3/4" />
                <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-1/2" />
                <div className="h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full mt-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] pb-28 lg:pb-12 pt-2 px-4 sm:px-6 lg:px-0 text-[#2D223B] dark:text-[#F1ECF7] select-none w-full max-w-full overflow-x-hidden transition-colors duration-200">

      {/* 1. Profile Header Card */}
      <div className="bg-white dark:bg-[#1D1726] rounded-3xl p-5 sm:p-7 border border-[#ECE7DF] dark:border-[#352B44] shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-dark-card flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 mb-6 w-full">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-white dark:border-[#2C2237] ring-4 ring-[#43335A]/15 shadow-md flex-shrink-0">
          <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
        </div>

        <div className="flex-1 text-center sm:text-left min-w-0 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#2D223B] dark:text-[#F1ECF7]">
                {user.displayName}
              </h1>
              <p className="text-xs sm:text-sm text-[#80778B] dark:text-[#9F94AC] mt-0.5">
                Master Reader • {user.archiveLevelTitle}
              </p>
            </div>

            <div className="inline-flex items-center justify-center gap-1.5 bg-[#FAF4E6] dark:bg-[#2B2111] text-[#DE9B35] px-3.5 py-1.5 rounded-full border border-[#F2E4C2] dark:border-[#4B3917] font-bold text-xs self-center sm:self-auto">
              <Flame className="w-3.5 h-3.5 fill-[#DE9B35]" />
              <span>{user.readingStreak} Day Active Streak</span>
            </div>
          </div>

          {/* Streak Calendar - Last 7 Days */}
          <div className="mt-3 flex items-center justify-center sm:justify-start gap-1.5">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
              // Get actual current day (0 = Sunday, 1 = Monday, etc.)
              const today = new Date().getDay();
              // Convert idx to match JavaScript's day numbering (0=Sun, 1=Mon...)
              const dayIndex = idx === 6 ? 0 : idx + 1; // S=0, M=1, T=2, W=3, T=4, F=5, S=6
              
              // Calculate days from today going backwards
              let daysAgo = (today - dayIndex + 7) % 7;
              if (daysAgo === 0) daysAgo = 0; // Today
              
              const hasCheck = daysAgo < user.readingStreak;
              const isToday = dayIndex === today;
              
              return (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
                      hasCheck && isToday
                        ? 'bg-[#DE9B35] text-white ring-2 ring-[#FFDE88]/30 scale-110'
                        : hasCheck
                        ? 'bg-[#43335A] dark:bg-[#8E72B8] text-white shadow-2xs'
                        : 'bg-stone-200 dark:bg-[#2A2136] text-stone-400 dark:text-stone-600'
                    }`}
                    title={hasCheck ? `Day ${daysAgo + 1}${isToday ? ' (Today)' : ''}` : 'No reading'}
                  >
                    {hasCheck ? <Check className="w-3.5 h-3.5" /> : '·'}
                  </div>
                  <span className="text-[10px] text-[#9D93A5] dark:text-[#7A6F87] font-medium">{day}</span>
                </div>
              );
            })}
          </div>

          {/* Core Stats */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mt-4">
            <div className="bg-[#FAF8F5] dark:bg-[#251D30] rounded-2xl p-2.5 sm:p-3 text-center border border-[#ECE7DF] dark:border-[#382C48]">
              <span className="text-lg sm:text-xl font-bold font-serif text-[#43335A] dark:text-[#D1BEE6]">
                {stats.manuscriptsRead}
              </span>
              <span className="block text-[9.5px] sm:text-[10px] text-[#80778B] dark:text-[#9F94AC] uppercase font-semibold mt-0.5">
                Manuscripts
              </span>
            </div>
            <div className="bg-[#FAF8F5] dark:bg-[#251D30] rounded-2xl p-2.5 sm:p-3 text-center border border-[#ECE7DF] dark:border-[#382C48]">
              <span className="text-lg sm:text-xl font-bold font-serif text-[#DE9B35]">
                {stats.totalHoursLogged}h
              </span>
              <span className="block text-[9.5px] sm:text-[10px] text-[#80778B] dark:text-[#9F94AC] uppercase font-semibold mt-0.5">
                Time Logged
              </span>
            </div>
            <div className="bg-[#FAF8F5] dark:bg-[#251D30] rounded-2xl p-2.5 sm:p-3 text-center border border-[#ECE7DF] dark:border-[#382C48]">
              <span className="text-lg sm:text-xl font-bold font-serif text-[#43335A] dark:text-[#FFDE88]">
                {stats.archiveRank}
              </span>
              <span className="block text-[9.5px] sm:text-[10px] text-[#80778B] dark:text-[#9F94AC] uppercase font-semibold mt-0.5">
                Archive Rank
              </span>
            </div>
          </div>

          {/* Sign out — visible on mobile where sidebar isn't shown */}
          <div className="mt-4 pt-4 border-t border-[#ECE7DF] dark:border-[#352B44] lg:hidden">
            <button
              onClick={logout}
              className="flex items-center gap-2 text-xs font-semibold text-[#8A8296] dark:text-[#7A6F87] hover:text-rose-600 dark:hover:text-rose-400 active:scale-95 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* 2. Honors & Milestone Badges Card */}
      <div className="bg-white dark:bg-[#1D1726] rounded-3xl p-4 sm:p-5 border border-[#ECE7DF] dark:border-[#352B44] shadow-xs mb-6 sm:mb-8 w-full">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#DE9B35]" />
            <h3 className="font-serif font-bold text-base sm:text-lg text-[#2D223B] dark:text-[#F1ECF7]">
              Archival Honors & Milestone Badges
            </h3>
          </div>
          <button
            onClick={() => setShowBadgesModal(true)}
            className="text-xs font-semibold text-[#51406B] dark:text-[#FFDE88] hover:underline flex items-center gap-1 group active:scale-95 transition-transform"
          >
            <span>View All ({badges.length})</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Mobile: 4 badges + "+N More" button */}
        <div className="flex lg:hidden items-center justify-between gap-2.5 sm:gap-3">
          {badges.slice(0, 4).map((b) => {
            const Icon = BADGE_ICONS[b.iconName];
            return (
              <button
                key={b.id}
                onClick={() => setShowBadgesModal(true)}
                title={`${b.title} — ${b.desc}`}
                className={`relative flex flex-col items-center justify-center flex-1 h-14 sm:h-16 rounded-2xl border ${b.colorClasses} shadow-2xs active:scale-95 transition-all`}
              >
                {Icon && <Icon className="w-5 h-5 sm:w-6 sm:h-6" />}
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#DE9B35] rounded-full ring-2 ring-white dark:ring-[#1D1726]" />
                <span className="text-[9px] font-medium text-[#736A7D] dark:text-[#A89EB3] truncate mt-1 max-w-[54px] px-0.5">
                  {b.title.split(' ')[0]}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setShowBadgesModal(true)}
            className="flex flex-col items-center justify-center flex-1 h-14 sm:h-16 rounded-2xl border-2 border-dashed border-[#51406B]/30 dark:border-[#8E72B8]/40 bg-[#FAF8F5] dark:bg-[#251D30] hover:bg-[#F3EFEA] dark:hover:bg-[#2C2138] text-[#51406B] dark:text-[#FFDE88] active:scale-95 transition-all group"
          >
            <span className="text-xs font-bold leading-none">+{badges.length - 4}</span>
            <span className="text-[9px] font-semibold text-[#80778B] dark:text-[#A095AC] group-hover:text-[#43335A] dark:group-hover:text-white mt-1">
              More
            </span>
          </button>
        </div>

        {/* Desktop: Full badges gallery */}
        <div className="hidden lg:flex flex-wrap gap-3.5 items-center">
          {badges.map((b) => {
            const Icon = BADGE_ICONS[b.iconName];
            return (
              <div
                key={b.id}
                onClick={() => setShowBadgesModal(true)}
                title={`${b.title} — ${b.desc} (${b.unlocked ? 'Unlocked' : 'Locked'})`}
                className={`relative group flex flex-col items-center justify-center w-14 h-14 rounded-2xl border ${b.colorClasses} shadow-xs transition-all hover:scale-110 cursor-pointer`}
              >
                {Icon && <Icon className={`w-6 h-6 ${b.unlocked ? '' : 'opacity-40'}`} />}
                {b.unlocked ? (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#DE9B35] rounded-full ring-2 ring-white dark:ring-[#1D1726]" />
                ) : (
                  <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1 text-stone-400 dark:text-stone-500" />
                )}
                <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-black/85 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap z-30 font-medium shadow-md">
                  {b.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Archival Library Shelf */}
      <div className="w-full">
        {/* Sticky Filter Bar */}
        <div className="sticky top-0 lg:top-[65px] z-30 bg-[#FAF8F5]/95 dark:bg-[#120E18]/95 backdrop-blur-md -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 py-3 mb-4 border-b border-[#ECE7DF]/80 dark:border-[#2C2237]/80 shadow-[0_4px_16px_rgba(0,0,0,0.02)] transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif font-bold text-lg sm:text-2xl text-[#2D223B] dark:text-[#F1ECF7] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-[#43335A] dark:text-[#DE9B35]" />
                  <span>My Archival Library</span>
                </h2>
                <p className="text-[11px] sm:text-xs text-[#80778B] dark:text-[#9F94AC]">
                  {libraryBooks.length} manuscripts in your personal collection
                </p>
              </div>
              <span className="sm:hidden text-[11px] font-bold text-[#DE9B35] bg-[#FAF4E6] dark:bg-[#2B2111] px-2.5 py-0.5 rounded-full border border-[#F2E4C2] dark:border-[#4B3917]">
                {filteredBooks.length} Tomes
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full sm:w-auto -mx-1 px-1">
              {LIBRARY_FILTER_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`whitespace-nowrap px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeFilter === tab
                      ? 'bg-[#43335A] dark:bg-[#725499] text-white shadow-xs'
                      : 'bg-white dark:bg-[#1D1726] border border-[#ECE7DF] dark:border-[#352B44] text-[#80778B] dark:text-[#9F94AC] hover:text-[#43335A] dark:hover:text-white'
                  }`}
                >
                  <span>{tab}</span>
                  <span className={`text-[10px] px-1.5 rounded-full font-mono ${
                    activeFilter === tab
                      ? 'bg-white/20 text-white'
                      : 'bg-stone-100 dark:bg-[#2B2138] text-[#80778B] dark:text-[#9F94AC]'
                  }`}>
                    {filterCounts[tab] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Manuscripts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5 w-full">
          {filteredBooks.length === 0 ? (
            <div className="col-span-full text-center py-16 text-[#80778B] dark:text-[#9F94AC]">
              <p className="font-serif text-lg">No manuscripts in this section yet.</p>
            </div>
          ) : (
            filteredBooks.map((b) => (
              <div
                key={b.id}
                onClick={() => setSelectedBook(b)}
                className="bg-white dark:bg-[#1D1726] rounded-2xl p-3.5 sm:p-4 border border-[#ECE7DF] dark:border-[#352B44] shadow-[0_2px_14px_rgba(0,0,0,0.03)] dark:shadow-dark-card hover:shadow-md transition-all flex gap-3.5 sm:gap-4 group cursor-pointer active:scale-[0.99] overflow-hidden min-w-0"
              >
                <div className="w-20 h-28 sm:w-20 sm:h-28 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 relative">
                  {b.cover ? (
                    <img
                      src={b.cover}
                      alt={b.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#3D2D55] to-[#28334A] text-white/40">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 text-[8.5px] font-bold bg-black/60 backdrop-blur-xs text-white px-1.5 py-0.5 rounded font-mono z-10">
                    {b.level}
                  </span>
                </div>

                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[9.5px] uppercase font-bold tracking-wider flex items-center gap-1 ${
                        b.progress === 100
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : b.status === 'Saved'
                          ? 'text-[#554271] dark:text-[#D1BEE6]'
                          : 'text-[#DE9B35]'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          b.progress === 100 ? 'bg-emerald-500' : b.status === 'Saved' ? 'bg-purple-500' : 'bg-[#DE9B35] animate-pulse'
                        }`} />
                        {b.status}
                      </span>

                      {b.progress > 0 && b.progress < 100 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#43335A] dark:text-[#FFDE88] bg-[#FAF4E6] dark:bg-[#2B2111] px-2 py-0.5 rounded-full">
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>Resume</span>
                        </span>
                      ) : b.progress === 100 ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                          <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                          <span>Done</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#554271] dark:text-[#D1BEE6] bg-[#F2EDFA] dark:bg-[#2B2138] px-2 py-0.5 rounded-full">
                          <BookMarked className="w-2.5 h-2.5" />
                          <span>Queue</span>
                        </span>
                      )}
                    </div>

                    <h4 className="font-serif font-bold text-sm sm:text-base text-[#2D223B] dark:text-[#F1ECF7] leading-snug mt-1 truncate group-hover:text-[#43335A] dark:group-hover:text-[#DE9B35] transition-colors">
                      {b.title}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-[#80778B] dark:text-[#9F94AC] truncate mt-0.5">
                      {b.author}
                    </p>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#EFEAF5] dark:bg-[#2B2138] rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            b.progress === 100 ? 'bg-emerald-500' : 'bg-[#43335A] dark:bg-[#8E72B8]'
                          }`}
                          style={{ width: `${b.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-[#80778B] dark:text-[#9F94AC]">
                        {b.progress}%
                      </span>
                    </div>
                    <p className="text-[10px] text-[#A39AAA] dark:text-[#7A6F87] mt-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#A39AAA] dark:text-[#7A6F87]" />
                      <span>{b.time}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Badges Modal */}
      {showBadgesModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowBadgesModal(false)}
        >
          <div
            className="bg-[#FAF8F5] dark:bg-[#1A1422] w-full max-w-xl rounded-3xl p-5 sm:p-6 border border-[#ECE7DF] dark:border-[#382C48] shadow-2xl flex flex-col max-h-[85vh] text-[#2D223B] dark:text-[#F1ECF7] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-4 border-b border-stone-200/80 dark:border-[#2E243A]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FAF4E6] dark:bg-[#2B2111] border border-[#F2E4C2] dark:border-[#4B3917] flex items-center justify-center text-[#DE9B35]">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg sm:text-xl text-[#2D223B] dark:text-[#F1ECF7]">
                    Archival Honors & Milestone Badges
                  </h3>
                  <p className="text-xs text-[#80778B] dark:text-[#9F94AC] mt-0.5">
                    {unlockedCount} of {badges.length} Unlocked • {user.displayName} ({user.archiveLevelTitle})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBadgesModal(false)}
                className="w-8 h-8 rounded-full bg-white dark:bg-[#251D30] border border-stone-200 dark:border-stone-700 flex items-center justify-center text-[#80778B] dark:text-[#A69BB2] hover:bg-stone-100 dark:hover:bg-[#322642] active:scale-90 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto no-scrollbar py-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {badges.map((b) => {
                  const Icon = BADGE_ICONS[b.iconName];
                  return (
                    <div
                      key={b.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        b.unlocked
                          ? 'bg-white dark:bg-[#211A2C] border-[#ECE7DF] dark:border-[#352B44] shadow-xs'
                          : 'bg-stone-50/70 dark:bg-[#15101C]/60 border-stone-200/60 dark:border-stone-800 opacity-75'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center border ${b.colorClasses} relative`}>
                          {Icon && <Icon className="w-5 h-5" />}
                          {b.unlocked ? (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#DE9B35] rounded-full ring-2 ring-white dark:ring-[#211A2C]" />
                          ) : (
                            <Lock className="w-3 h-3 absolute -top-1 -right-1 text-stone-400 dark:text-stone-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-serif font-bold text-xs sm:text-sm text-[#2D223B] dark:text-[#F1ECF7] leading-tight truncate">
                              {b.title}
                            </h4>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                              b.unlocked
                                ? 'bg-[#FAF4E6] dark:bg-[#2B2111] text-[#DE9B35] border border-[#F2E4C2] dark:border-[#4B3917]'
                                : 'bg-stone-100 dark:bg-stone-800 text-stone-400'
                            }`}>
                              {b.tier}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#80778B] dark:text-[#9F94AC] mt-1 leading-snug">
                            {b.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200/80 dark:border-[#2E243A] flex items-center justify-between text-xs text-[#80778B] dark:text-[#9F94AC]">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#DE9B35]" />
                Read daily to discover secret celestial milestones
              </span>
              <button
                onClick={() => setShowBadgesModal(false)}
                className="bg-[#43335A] dark:bg-[#725499] text-white px-4 py-1.5 rounded-xl font-semibold hover:bg-[#322544] dark:hover:bg-[#604484] active:scale-95 transition-all text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Book Detail Modal */}
      {selectedBook && (
        <BookDetailModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onRead={() => {
            setSelectedBook(null);
          }}
          isInLibrary={false}          // suppress "In Your Library" badge — user is viewing their library
          onRemoveFromLibrary={(book) => {
            removeBook(String(book.id));
            setSelectedBook(null);
          }}
          isAuthenticated={isAuthenticated}
          userId={user.id}
        />
      )}
    </div>
  );
}
