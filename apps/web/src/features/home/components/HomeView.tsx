
import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Menu, Bell, Flame, Play, Pause, Target, Check,
  ChevronRight, ChevronLeft,
  BookOpen, Sun, Moon, Sparkles,
  LayoutGrid, ScrollText, BookText, Library, Rows,
  Feather, ShieldCheck, Clock, ArrowRight,
} from 'lucide-react';
import { contentApi, apiClient } from '@arcanium/api-client';
import type { Content, ContentListResponse, ContentType } from '@arcanium/types';
import type { LibraryBook } from '../../library/useLibraryQuery';
import { EXPLORE_TYPE_FILTERS } from '../../../stores/useExploreStore.js';
import { useCategoriesQuery } from '../../../hooks/useCategoriesQuery';
import { useFeaturedSections } from '../../../hooks/useFeaturedSections';
import { useCreatorApplication } from '../../creator/hooks/useCreatorApplication';
import CreatorOnboardingModal from '../../creator/components/CreatorOnboardingModal';

import BookDetailModal  from '../../../components/shared/BookDetailModal';
import { useUser }      from '../../../hooks/useUser.js';
import { useLibrary }   from '../../../hooks/useLibrary.js';
import { avatarImg }    from '../../../mocks/mockData.js';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useReaderStore } from '../../../stores/useReaderStore';

// Wire the api-client token getter once (idempotent)
apiClient.setTokenGetter(() => useAuthStore.getState().accessToken);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HomeViewProps {
  onOpenLiber: () => void;
  theme:       'light' | 'dark';
  setTheme:    (theme: 'light' | 'dark') => void;
}

// ---------------------------------------------------------------------------
// Icon map for type filter chips — mirrors EXPLORE_TYPE_FILTERS iconNames
// ---------------------------------------------------------------------------

const TYPE_ICON_MAP = {
  LayoutGrid,
  ScrollText,
  BookText,
  BookImage: BookOpen,
  Rows,
  BookOpen,
  Library,
} as const;
type TypeIconName = keyof typeof TYPE_ICON_MAP;

// ---------------------------------------------------------------------------
// Skeleton components — shown while the catalogue query is loading
// ---------------------------------------------------------------------------

function BookCardSkeleton() {
  return (
    <div className="w-[136px] sm:w-[146px] lg:w-full flex-shrink-0 animate-pulse">
      <div className="w-full h-[184px] sm:h-[196px] lg:h-[210px] rounded-2xl bg-stone-200 dark:bg-[#2A2136]" />
      <div className="mt-2.5 space-y-1.5">
        <div className="h-3 w-3/4 rounded bg-stone-200 dark:bg-[#2A2136]" />
        <div className="h-2.5 w-1/2 rounded bg-stone-100 dark:bg-[#241D30]" />
        <div className="h-4 w-10 rounded-full bg-stone-100 dark:bg-[#241D30]" />
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// BookCard — renders a single Content item from the API
// ---------------------------------------------------------------------------

interface BookCardProps {
  book:    Content;
  onClick: (book: Content) => void;
}

function BookCard({ book, onClick }: BookCardProps) {
  const genres = (book.metadata as { genres?: string[] })?.genres ?? [];
  const genre  = genres[0] ?? '';
  const isCreatorUpload = book.source === 'CREATOR_UPLOAD';

  return (
    <div
      onClick={() => onClick(book)}
      className="w-[136px] sm:w-[146px] lg:w-full flex-shrink-0 snap-start group cursor-pointer active:scale-98 transition-transform"
    >
      <div className="w-full h-[184px] sm:h-[196px] lg:h-[210px] rounded-2xl overflow-hidden shadow-xs border border-stone-200/80 dark:border-[#352B44] relative bg-stone-100 dark:bg-[#1D1726] group-hover:shadow-md transition-all duration-300">
        {/* Genre badge — top-left */}
        {genre && (
          <span className="absolute top-2 left-2 bg-[#51406B] dark:bg-[#684C8B] text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-xs z-10">
            {genre}
          </span>
        )}
        {/* Verified Author badge — top-right */}
        {isCreatorUpload && (
          <span className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs z-10 backdrop-blur-sm">
            <Sparkles className="w-2.5 h-2.5" />
            Author
          </span>
        )}
        {book.coverImageUrl ? (
          <img
            src={book.coverImageUrl}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#E8DFF5] to-[#F5EFE6] dark:from-[#2C213B] dark:to-[#2A1E1A]">
            <BookOpen className="w-10 h-10 text-[#9B7BBF] dark:text-[#7A5CA0] opacity-60" />
          </div>
        )}
      </div>
      <div className="mt-2.5">
        <h4 className="font-serif font-bold text-xs sm:text-sm text-[#2D223B] dark:text-[#F1ECF7] leading-snug line-clamp-1 group-hover:text-[#43335A] dark:group-hover:text-[#FFDE88] transition-colors">
          {book.title}
        </h4>
        <p className="text-[11px] text-[#80778B] dark:text-[#A095AC] truncate mt-0.5">
          {book.author ?? 'Unknown Author'}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          <span className="inline-block border border-[#DDD5E3] dark:border-[#3E3150] text-[#7A7285] dark:text-[#A699B4] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
            {book.type.replace('_', ' ')}
          </span>
          {isCreatorUpload && (
            <span className="inline-flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Verified
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HomeView
// ---------------------------------------------------------------------------

export default function HomeView({ onOpenLiber, theme, setTheme }: HomeViewProps) {
  const isPlaying    = useReaderStore((s) => s.isPlaying);
  const setIsPlaying = useReaderStore((s) => s.setIsPlaying);

  // 'All' means no type filter; otherwise a ContentType enum value
  const [activeType,   setActiveType]   = useState<string>('All');
  const [activeGenre,  setActiveGenre]  = useState<string>('All');
  const [selectedBook, setSelectedBook] = useState<Content | null>(null);
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const { user, dailyGoal, hasUnreadNotifications } = useUser();
  const { currentlyReading, addBook, isInLibrary }  = useLibrary();
  const { isAuthenticated } = useAuthStore();
  const nowReading = currentlyReading as LibraryBook | null;

  // Creator application state — drives BecomeAuthorCard behaviour
  const { hasCreatorAccess, isVerifiedWriter, isPrivilegedUser, role, hasPendingApp, wasRejected, isRoleKnown, isLoading: roleLoading } = useCreatorApplication();

  // DB-managed genre categories
  const { data: categories = [] } = useCategoriesQuery();

  // Admin-curated featured books for the home page
  const { homeFeatured } = useFeaturedSections();

  // ── Live catalogue query ──────────────────────────────────────────────────
  const catalogueQuery = useQuery<ContentListResponse>({
    queryKey: ['home', 'catalogue', activeType, activeGenre],
    queryFn: () =>
      contentApi.list({
        limit: 8,
        page:  1,
        ...(activeType  !== 'All' ? { type:  activeType  as ContentType } : {}),
        ...(activeGenre !== 'All' ? { genre: activeGenre }               : {}),
      }).then((res) => {
        if (res.error) throw new Error(res.error.message);
        return res.data;
      }),
    staleTime: 1000 * 60 * 5,
  });

  const catalogueItems: Content[] = catalogueQuery.data?.items ?? [];
  // Dynamic greeting based on time of day
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  })();


  const scrollCarousel = (direction: 'left' | 'right') => {
    carouselRef.current?.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] pb-36 lg:pb-12 pt-0 px-5 sm:px-6 lg:px-0 text-[#2D223B] dark:text-[#F1ECF7] select-none relative overflow-x-clip w-full transition-colors duration-200">
      {/* Background accents */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-radial from-[#F1EDE4] dark:from-[#231833]/40 via-[#F8F5EE]/40 dark:via-transparent to-transparent pointer-events-none -z-10 blur-2xl" />
      <div className="absolute top-10 right-0 w-96 h-96 bg-radial from-[#EDE5D8] dark:from-[#35254A]/30 via-[#FAF6ED]/60 dark:via-transparent to-transparent pointer-events-none -z-10 blur-3xl" />

      {/* ── Top Mobile Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 -mx-5 px-5 py-2.5 bg-[#FAF8F5]/95 dark:bg-[#120E18]/95 backdrop-blur-md border-b border-[#ECE7DF]/80 dark:border-[#2C2237]/80 flex lg:hidden items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all">
        <button
          aria-label="Menu"
          className="w-10 h-10 rounded-full bg-white dark:bg-[#1E1728] shadow-xs border border-[#ECE7DF] dark:border-[#352B44] flex items-center justify-center text-[#43335A] dark:text-[#E2D9EC] transition-all hover:bg-stone-50 active:scale-95"
        >
          <Menu className="w-5 h-5 stroke-[2]" />
        </button>

        <div className="flex items-center gap-2.5">
          {setTheme && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle Theme"
              className="w-10 h-10 rounded-full bg-white dark:bg-[#1E1728] shadow-xs border border-[#ECE7DF] dark:border-[#352B44] flex items-center justify-center text-[#43335A] dark:text-[#FFDE88] transition-all hover:bg-stone-50 active:scale-95"
            >
              {theme === 'dark'
                ? <Sun  className="w-4 h-4 text-[#FFDE88]" />
                : <Moon className="w-4 h-4 text-[#43335A]" />}
            </button>
          )}

          <button
            aria-label="Notifications"
            className="w-10 h-10 rounded-full bg-white dark:bg-[#1E1728] shadow-xs border border-[#ECE7DF] dark:border-[#352B44] flex items-center justify-center text-[#43335A] dark:text-[#E2D9EC] relative transition-all hover:bg-stone-50 active:scale-95"
          >
            <Bell className="w-5 h-5 stroke-[1.8]" />
            {hasUnreadNotifications && (
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#43335A] dark:bg-[#DE9B35] rounded-full ring-2 ring-white dark:ring-[#1E1728]" />
            )}
          </button>

          <button
            aria-label="User Profile"
            className="w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-[#352B44] shadow-xs ring-1 ring-[#ECE7DF] dark:ring-[#47395D] active:scale-95 transition-transform"
          >
            <img
              src={user.avatarUrl ?? avatarImg}
              alt={user.displayName}
              className="w-full h-full object-cover"
            />
          </button>
        </div>
      </header>

      {/* ── Hero Welcome ───────────────────────────────────────────────────── */}
      <section className="relative mt-4 lg:mt-2 mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 w-full">
        <div className="z-10 min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[#5A4E66] dark:text-[#A89DB5] font-medium text-xs sm:text-sm">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 dark:bg-[#1D1726]/80 backdrop-blur-sm border border-[#ECE7DF] dark:border-[#352B44] shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#DE9B35]" />
              <span>{greeting}, {user.displayName.split(' ')[0]}</span>
              <span className="text-[#DE9B35] font-serif leading-none">✦</span>
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight text-[#342646] dark:text-[#F1ECF7] font-bold mt-2 leading-[1.08]">
            ARCANIUM
          </h1>
          <p className="text-xs sm:text-sm text-[#7F768B] dark:text-[#A397B0] font-normal mt-1 tracking-wide">
            Reading without borders — explore archives, discover hidden worlds
          </p>
        </div>

        {/* Hero Quick Stat Badge */}
        <div className="flex items-center gap-2.5 sm:self-auto sm:flex-shrink-0 w-full sm:w-auto">
          <div className="bg-white/80 dark:bg-[#1D1726]/80 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-[#ECE7DF] dark:border-[#352B44] shadow-xs flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-[#FAF4E6] dark:bg-[#2B2111] border border-[#F2E4C2] dark:border-[#4B3917] flex items-center justify-center text-[#DE9B35] flex-shrink-0">
              <Flame className="w-5 h-5 fill-[#DE9B35]" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-base font-bold font-serif text-[#342646] dark:text-[#F1ECF7]">
                  {user.readingStreak}
                </span>
                <span className="text-xs font-semibold text-[#DE9B35]">Days</span>
              </div>
              <p className="text-[10px] text-[#80778B] dark:text-[#9F94AC] uppercase font-semibold tracking-wider">
                {user.archiveLevelTitle ?? 'Active Streak'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Continue Reading + Today's Goal grid ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 w-full">
        {/* Continue Reading */}
        <div className="lg:col-span-7">
          <div className="bg-white dark:bg-[#1D1726] rounded-[26px] p-4 sm:p-5 shadow-[0_4px_24px_rgba(67,50,88,0.05)] dark:shadow-dark-card border border-[#EFEAE2] dark:border-[#352B44] relative overflow-hidden transition-all hover:shadow-[0_8px_30px_rgba(67,50,88,0.08)] h-full flex flex-col justify-between">
            {nowReading ? (
              <div className="flex gap-4">
                <div
                  onClick={() => setSelectedBook(nowReading as unknown as Content)}
                  className="w-[104px] h-[142px] sm:w-[118px] sm:h-[160px] flex-shrink-0 rounded-2xl overflow-hidden shadow-md border border-stone-200/60 dark:border-stone-700/60 bg-[#28334A] cursor-pointer group"
                >
                  {nowReading.cover ? (
                    <img
                      src={nowReading.cover}
                      alt={nowReading.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#3D2D55] to-[#28334A]">
                      <BookOpen className="w-10 h-10 text-white/30" />
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-medium text-[#80778B] dark:text-[#A095AC]">
                      Continue Reading
                    </span>
                    <div className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-[#DE9B35] fill-[#DE9B35]" />
                      <span className="text-xs sm:text-sm font-bold text-[#DE9B35]">
                        {user.readingStreak}
                      </span>
                      <span className="text-[10px] text-[#80778B] dark:text-[#A095AC] leading-none ml-0.5">
                        day streak
                      </span>
                    </div>
                  </div>

                  <div className="my-1">
                    <h3 className="font-serif font-bold text-[18px] sm:text-[21px] text-[#2D223B] dark:text-[#F1ECF7] leading-tight truncate">
                      {nowReading.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#7F768B] dark:text-[#9F93AC] mt-0.5 truncate">
                      {nowReading.author}
                    </p>
                    <div className="mt-1.5">
                      <span className="inline-block bg-[#51406B] dark:bg-[#684C8B] text-white text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full tracking-wide">
                        {nowReading.level}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-end text-[11px] font-semibold text-[#80778B] dark:text-[#A095AC] mb-1">
                        <span>{nowReading.progress}%</span>
                      </div>
                      <div className="w-full bg-[#EFEAF5] dark:bg-[#2C2138] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#43335A] dark:bg-[#9B7BBF] h-full rounded-full transition-all duration-500"
                          style={{ width: `${nowReading.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] sm:text-[11px] text-[#80778B] dark:text-[#A095AC] mt-1.5 block">
                        {nowReading.time}
                      </span>
                    </div>

                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      aria-label={isPlaying ? 'Pause Narration' : 'Continue Reading'}
                      className="w-12 h-12 rounded-full bg-[#43335A] hover:bg-[#342647] dark:bg-[#684C8B] dark:hover:bg-[#563D75] text-white flex items-center justify-center shadow-[0_4px_16px_rgba(67,51,90,0.3)] active:scale-95 transition-all flex-shrink-0"
                    >
                      {isPlaying
                        ? <Pause className="w-4 h-4 fill-white" />
                        : <Play  className="w-4 h-4 fill-white ml-0.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-[#80778B] dark:text-[#9F94AC] text-sm">
                No book in progress. Explore the catalogue to begin.
              </div>
            )}
          </div>
        </div>

        {/* Today's Goal */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-[#1D1726] rounded-[26px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(67,50,88,0.05)] dark:shadow-dark-card border border-[#EFEAE2] dark:border-[#352B44] flex flex-col justify-between h-full relative overflow-hidden transition-all hover:shadow-[0_8px_30px_rgba(67,50,88,0.08)]">
            
            {/* Top header row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FAF4E6] dark:bg-[#2B2111] border border-[#F2E4C2] dark:border-[#4B3917] flex items-center justify-center text-[#DE9B35]">
                  <Target className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#2D223B] dark:text-[#F1ECF7]">
                    Today's Goal
                  </h3>
                  <p className="text-[11px] text-[#80778B] dark:text-[#9F94AC]">
                    Daily Reading Target
                  </p>
                </div>
              </div>

              {dailyGoal.isCompleted ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full shadow-2xs">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Done</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#DE9B35] bg-[#FAF4E6] dark:bg-[#2B2111] border border-[#F2E4C2] dark:border-[#4B3917] px-2.5 py-0.5 rounded-full">
                  <span>{Math.max(0, dailyGoal.targetMinutes - dailyGoal.completedMinutes)}m left</span>
                </span>
              )}
            </div>

            {/* Middle row: Big numbers + Radial circular progress gauge */}
            <div className="flex items-center justify-between gap-4 my-4">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-bold font-serif text-[#342646] dark:text-[#F1ECF7]">
                    {dailyGoal.completedMinutes}
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-[#80778B] dark:text-[#9F94AC]">
                    / {dailyGoal.targetMinutes} min
                  </span>
                </div>
                <p className="text-xs text-[#80778B] dark:text-[#9F94AC] mt-1">
                  {dailyGoal.isCompleted
                    ? '🎉 Goal achieved! Keep reading to earn honors.'
                    : `${dailyGoal.progressPercent}% of your daily target completed.`}
                </p>
              </div>

              {/* Radial Progress Ring */}
              <div className="relative w-16 h-16 sm:w-18 sm:h-18 flex-shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                  {/* Track circle */}
                  <circle
                    cx="22"
                    cy="22"
                    r="17.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    className="text-[#EFEAF5] dark:text-[#2C2138]"
                  />
                  {/* Active progress circle */}
                  <circle
                    cx="22"
                    cy="22"
                    r="17.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray={110}
                    strokeDashoffset={110 - (Math.min(100, Math.max(0, dailyGoal.progressPercent)) / 100) * 110}
                    className="text-[#DE9B35] transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  {dailyGoal.isCompleted ? (
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                  ) : (
                    <span className="text-xs font-mono font-bold text-[#DE9B35]">
                      {dailyGoal.progressPercent}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom progress bar */}
            <div className="w-full">
              <div className="w-full bg-[#EFEAF5] dark:bg-[#2C2138] rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    dailyGoal.isCompleted
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                      : 'bg-gradient-to-r from-[#DE9B35] to-[#F3B759]'
                  }`}
                  style={{ width: `${Math.min(100, dailyGoal.progressPercent)}%` }}
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Featured Books — admin-curated ─────────────────────────────────── */}
      {homeFeatured.length > 0 && (
        <section className="mt-8 w-full">
          <div className="flex items-center gap-2 mb-3.5">
            <Sparkles className="w-4 h-4 text-[#DE9B35] fill-[#DE9B35]" />
            <h2 className="font-serif font-bold text-lg sm:text-xl text-[#2D223B] dark:text-[#F1ECF7]">
              Featured Books
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {homeFeatured.map((pin) => {
              const c = pin.content;
              const inLib = isInLibrary(c.id);
              return (
                <button
                  key={pin.id}
                  onClick={() => setSelectedBook({
                    id: c.id, title: c.title, slug: c.slug,
                    type: c.type as ContentType, status: c.status as 'ONGOING' | 'COMPLETED' | 'HIATUS' | 'CANCELLED' | 'UNKNOWN',
                    synopsis: c.synopsis ?? null, coverImageUrl: c.coverImageUrl ?? null,
                    rating: c.rating ?? 0, chapterCount: c.chapterCount,
                    author: c.author ?? null, sourceSite: c.sourceSite ?? null,
                    sourceUrl: '', metadata: c.metadata,
                  } as Content)}
                  className="bg-white dark:bg-[#1D1726] rounded-2xl p-3 border border-[#ECE7DF] dark:border-[#352B44] shadow-xs hover:shadow-md hover:border-[#D4C8EA] dark:hover:border-[#4A3762] active:scale-95 transition-all text-left group relative"
                >
                  {/* Featured badge */}
                  <span className="absolute top-2 left-2 z-10 flex items-center gap-1 px-1.5 py-0.5 bg-[#DE9B35] text-white text-[9px] font-bold uppercase tracking-wide rounded-full shadow-sm">
                    <Sparkles className="w-2.5 h-2.5" />
                    Featured
                  </span>
                  {/* Cover */}
                  <div className="rounded-xl overflow-hidden bg-stone-100 dark:bg-[#2A2136] aspect-[3/4] mb-2.5">
                    {c.coverImageUrl ? (
                      <img src={c.coverImageUrl} alt={c.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-stone-300 dark:text-stone-600" />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <h3 className="font-semibold text-xs text-[#2D223B] dark:text-[#F1ECF7] line-clamp-2 leading-tight">{c.title}</h3>
                  <p className="text-[10px] text-[#80778B] dark:text-[#9F94AC] mt-0.5 truncate">{c.author ?? 'Unknown'}</p>
                  {c.chapterCount > 0 && (
                    <p className="text-[10px] text-[#A095AC] dark:text-[#7A6F88] mt-0.5">{c.chapterCount} chapters</p>
                  )}
                  {/* Add to library quick-action */}
                  {!inLib && (
                    <button
                      onClick={(e) => { e.stopPropagation(); addBook({ id: c.id, title: c.title, slug: c.slug, type: c.type as ContentType, status: c.status as 'ONGOING' | 'COMPLETED' | 'HIATUS' | 'CANCELLED' | 'UNKNOWN', synopsis: c.synopsis ?? null, coverImageUrl: c.coverImageUrl ?? null, rating: c.rating ?? 0, chapterCount: c.chapterCount, author: c.author ?? null, sourceSite: c.sourceSite ?? null, sourceUrl: '', metadata: c.metadata } as Content); }}
                      className="mt-2 w-full text-[10px] font-semibold text-[#43335A] dark:text-[#C5BACF] bg-[#F2EDFA] dark:bg-[#2C213B] hover:bg-[#E8DFF5] dark:hover:bg-[#352844] rounded-lg py-1.5 transition-colors"
                    >
                      + Add to Library
                    </button>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Explore by Category — filter pills ──────────────────────────────── */}
      {categories.length > 0 && (
        <section className="mt-8 mb-0 w-full">
          <h2 className="font-serif font-bold text-lg sm:text-xl text-[#2D223B] dark:text-[#F1ECF7] mb-3.5">
            Explore by Category
          </h2>
          <div className="flex lg:flex-wrap gap-2.5 pb-2 w-full overflow-x-auto no-scrollbar -mx-1 px-1">
            {/* "All" pill */}
            <button
              onClick={() => setActiveGenre('All')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all active:scale-95 ${
                activeGenre === 'All'
                  ? 'bg-[#F2EDFA] dark:bg-[#2C213B] text-[#5B457D] dark:text-[#D1BEE6] border-[#E3D9F2] dark:border-[#43345A] ring-2 ring-purple-900/10 dark:ring-purple-400/20 shadow-xs'
                  : 'bg-white dark:bg-[#1D1726] text-[#564D62] dark:text-[#C5BACF] border-[#EFEAE2] dark:border-[#352B44] hover:bg-stone-50 dark:hover:bg-[#251E30]'
              }`}
            >
              All Genres
            </button>
            {categories.map((cat) => {
              const isSelected = activeGenre === cat.genre;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveGenre(isSelected ? 'All' : cat.genre)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-[#F2EDFA] dark:bg-[#2C213B] text-[#5B457D] dark:text-[#D1BEE6] border-[#E3D9F2] dark:border-[#43345A] ring-2 ring-purple-900/10 dark:ring-purple-400/20 shadow-xs'
                      : 'bg-white dark:bg-[#1D1726] text-[#564D62] dark:text-[#C5BACF] border-[#EFEAE2] dark:border-[#352B44] hover:bg-stone-50 dark:hover:bg-[#251E30]'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Recommended for You ────────────────────────────────────────────── */}
      <section className="mt-8 w-full">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="font-serif font-bold text-lg sm:text-xl text-[#2D223B] dark:text-[#F1ECF7]">
            {activeType === 'All' && activeGenre === 'All'
              ? 'Recommended for You'
              : activeGenre !== 'All'
                ? activeGenre
                : (EXPLORE_TYPE_FILTERS.find(f => f.value === activeType)?.label ?? activeType)}
          </h2>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => scrollCarousel('left')}
                aria-label="Scroll left"
                className="w-7 h-7 rounded-full bg-white dark:bg-[#1E1728] border border-[#ECE7DF] dark:border-[#352B44] flex items-center justify-center text-[#43335A] dark:text-[#E2D9EC] hover:bg-stone-50 dark:hover:bg-[#281F36] active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => scrollCarousel('right')}
                aria-label="Scroll right"
                className="w-7 h-7 rounded-full bg-white dark:bg-[#1E1728] border border-[#ECE7DF] dark:border-[#352B44] flex items-center justify-center text-[#43335A] dark:text-[#E2D9EC] hover:bg-stone-50 dark:hover:bg-[#281F36] active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <button className="text-xs font-medium text-[#7A7285] dark:text-[#A599B2] flex items-center gap-0.5 hover:text-[#43335A] dark:hover:text-[#DE9B35] transition-colors">
              <span>See all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div
          ref={carouselRef}
          className="flex lg:grid lg:grid-cols-4 gap-3.5 sm:gap-5 overflow-x-auto no-scrollbar pb-3 pt-1 w-full scroll-smooth snap-x snap-mandatory"
        >
          {/* Loading skeletons */}
          {catalogueQuery.isLoading && Array.from({ length: 4 }).map((_, i) => (
            <BookCardSkeleton key={i} />
          ))}

          {/* Error state */}
          {catalogueQuery.isError && !catalogueQuery.isLoading && (
            <div className="col-span-4 flex flex-col items-center justify-center py-10 text-center text-[#80778B] dark:text-[#9F94AC] gap-2">
              <BookOpen className="w-8 h-8 opacity-40" />
              <p className="text-sm">Could not load catalogue.</p>
              <button
                onClick={() => catalogueQuery.refetch()}
                className="text-xs font-medium text-[#43335A] dark:text-[#9B7BBF] underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          )}

          {/* Live data */}
          {!catalogueQuery.isLoading && catalogueItems.map((book) => (
            <BookCard key={book.id} book={book} onClick={setSelectedBook} />
          ))}

          {/* Empty state */}
          {!catalogueQuery.isLoading && !catalogueQuery.isError && catalogueItems.length === 0 && (
            <div className="col-span-4 flex items-center justify-center py-10 text-sm text-[#80778B] dark:text-[#9F94AC]">
              No titles found for this category yet.
            </div>
          )}

          <div className="w-5 sm:w-6 flex-shrink-0 lg:hidden" aria-hidden="true" />
        </div>
      </section>

      {/* ── Become a Verified Author card ───────────────────────────────────── */}
      <section className="mt-8 w-full">
        <button
          onClick={() => {
            // Block until /users/me has resolved — prevents acting on stale mock role
            if (!isRoleKnown) return;
            if (hasCreatorAccess) {
              navigate('/creator');
            } else {
              setShowCreatorModal(true);
            }
          }}
          disabled={roleLoading}
          className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2D1F42] to-[#43335A] dark:from-[#1A1228] dark:to-[#2E2142] border border-[#4A3762] dark:border-[#3A2C53] shadow-md hover:shadow-lg active:scale-[0.99] transition-all text-left disabled:cursor-wait"
          aria-label="Become a Verified Author"
        >
          {/* Decorative background glyph */}
          <div className="absolute -right-4 -top-4 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -right-1 top-6 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />

          <div className="relative z-10 flex items-center gap-4 px-5 py-4">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
              {roleLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
              ) : hasCreatorAccess ? (
                <ShieldCheck className="w-5 h-5 text-emerald-300" />
              ) : hasPendingApp ? (
                <Clock className="w-5 h-5 text-amber-300" />
              ) : (
                <Feather className="w-5 h-5 text-[#FFDE88]" />
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              {roleLoading ? (
                <>
                  <div className="h-2 w-20 rounded bg-white/15 animate-pulse mb-1.5" />
                  <div className="h-3.5 w-36 rounded bg-white/20 animate-pulse" />
                </>
              ) : hasCreatorAccess ? (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-0.5">
                    {isPrivilegedUser ? role.replace('_', ' ') : 'Verified Writer'}
                  </p>
                  <h3 className="text-sm font-bold text-white leading-snug">
                    Open your Creator Studio
                  </h3>
                  <p className="text-[11px] text-white/60 mt-0.5 truncate">
                    Manage works, chapters &amp; analytics
                  </p>
                </>
              ) : hasPendingApp ? (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-0.5">
                    Application Pending
                  </p>
                  <h3 className="text-sm font-bold text-white leading-snug">
                    Under review
                  </h3>
                  <p className="text-[11px] text-white/60 mt-0.5">
                    Our team will get back to you within 3–5 days
                  </p>
                </>
              ) : wasRejected ? (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-0.5">
                    Application Not Accepted
                  </p>
                  <h3 className="text-sm font-bold text-white leading-snug">
                    Apply again as a Verified Author
                  </h3>
                  <p className="text-[11px] text-white/60 mt-0.5">
                    Revise and resubmit your pitch
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#FFDE88] mb-0.5">
                    For Writers
                  </p>
                  <h3 className="text-sm font-bold text-white leading-snug">
                    Become a Verified Author
                  </h3>
                  <p className="text-[11px] text-white/60 mt-0.5">
                    Serialise your stories on Arcanium
                  </p>
                </>
              )}
            </div>

            {/* Arrow — hide while loading or pending */}
            {!roleLoading && !hasPendingApp && (
              <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            )}          </div>
        </button>
      </section>

      {/* ── Mobile Liber Shortcut ────────────────────────────────────────────── */}
      <section className="mt-4 mb-2 lg:hidden w-full">
        <div
          onClick={onOpenLiber}
          className="bg-gradient-to-r from-[#F4EFFB] to-[#FAF5EC] dark:from-[#21182C] dark:to-[#221B24] border border-[#E8DEF2] dark:border-[#3A2C4D] rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:border-[#D1BEE6] transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-[#D1BEE6] dark:border-[#4B3963] flex-shrink-0">
              <img src={user.avatarUrl ?? avatarImg} alt="Liber" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#43335A] dark:text-[#E2D4F3] flex items-center gap-1">
                <span>Liber the Librarian</span>
                <Sparkles className="w-3 h-3 text-[#DE9B35] fill-[#DE9B35]" />
              </p>
              <p className="text-[11px] text-[#7A6E88] dark:text-[#A094AC]">
                Tap for intelligent book curation & discussions
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8C7E9E] group-hover:translate-x-0.5 transition-transform" />
        </div>
      </section>

      {/* ── Book Detail Modal ───────────────────────────────────────────────── */}
      {selectedBook && (
        <BookDetailModal
          book={{
            ...selectedBook,
            cover:  selectedBook.coverImageUrl,
            rating: selectedBook.rating?.toFixed(1) ?? null,
          }}
          onClose={() => setSelectedBook(null)}
          onRead={() => {
            setIsPlaying(true);
            setSelectedBook(null);
          }}
          onAddToLibrary={(book: unknown) => {
            addBook(book as object);
            setSelectedBook(null);
          }}
          isInLibrary={isInLibrary(selectedBook.id)}
          isAuthenticated={isAuthenticated}
          userId={user.id}
        />
      )}

      {/* ── Creator Onboarding Modal ─────────────────────────────────────────── */}
      <CreatorOnboardingModal
        isOpen={showCreatorModal}
        onClose={() => setShowCreatorModal(false)}
      />
    </div>
  );
}
