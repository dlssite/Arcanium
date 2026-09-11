
import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Sparkles, Star, Search, X,
  LayoutGrid, ScrollText, BookText, BookOpen, Library, Rows,
} from 'lucide-react';
import type { ContentType } from '@arcanium/types';
import { useExploreStore } from '../../../stores/useExploreStore.js';
import { useLibrary } from '../../../hooks/useLibrary.js';
import { useContentQuery, useCatalogueCountsQuery, useFeaturedQuery } from '../useContentQuery';
import { useCategoriesQuery } from '../../../hooks/useCategoriesQuery';
import { useFeaturedSections } from '../../../hooks/useFeaturedSections';
import BookDetailModal from '../../../components/shared/BookDetailModal';

const ICON_MAP = {
  LayoutGrid, ScrollText, BookText,
  BookImage: BookOpen,
  Rows, BookOpen, Library,
} as const;
type IconName = keyof typeof ICON_MAP;

const TYPE_LABELS: Record<string, string> = {
  WEB_NOVEL:   'Web Novel',
  LIGHT_NOVEL: 'Light Novel',
  MANGA:       'Manga',
  WEBTOON:     'Webtoon',
  COMIC:       'Comic',
  EBOOK:       'Book',
};

function BookCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#1D1726] rounded-2xl p-3 sm:p-4 border border-[#ECE7DF] dark:border-[#352B44] animate-pulse">
      <div className="rounded-xl h-44 sm:h-56 bg-stone-200 dark:bg-[#2A2136]" />
      <div className="mt-3 space-y-2">
        <div className="h-3 bg-stone-200 dark:bg-[#2A2136] rounded w-3/4" />
        <div className="h-3 bg-stone-100 dark:bg-[#241D30] rounded w-1/2" />
      </div>
    </div>
  );
}

export default function ExploreView() {
  const explore  = useExploreStore();
  const { addBook, isInLibrary } = useLibrary();
  const [activeGenre, setActiveGenre] = React.useState('All');

  // ── Search state ─────────────────────────────────────────────────────────
  // Read the store value (set by the desktop header omnibar) as the initial
  // value so typing in the header and arriving here shows results immediately.
  const setStoreSearch = useExploreStore((s) => s.setSearchQuery);
  const storeSearch    = useExploreStore((s) => s.searchQuery);
  const [localSearch, setLocalSearch] = useState(storeSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(storeSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local input in sync when store changes from outside (header omnibar)
  useEffect(() => {
    setLocalSearch(storeSearch);
    setDebouncedSearch(storeSearch);
  }, [storeSearch]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setLocalSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setStoreSearch(val);
    }, 350);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setDebouncedSearch(localSearch);
      setStoreSearch(localSearch);
    }
    if (e.key === 'Escape') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setLocalSearch('');
      setDebouncedSearch('');
      setStoreSearch('');
    }
  }

  function clearSearch() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLocalSearch('');
    setDebouncedSearch('');
    setStoreSearch('');
  }

  // DB-managed genre categories
  const { data: categories = [] } = useCategoriesQuery();

  // Admin-curated featured sections
  const { exploreSpotlight } = useFeaturedSections();

  // Filtered grid — re-runs when selectedType, activeGenre, or search changes
  const { data: contentData, isLoading, isError, refetch } = useContentQuery({
    type:  explore.selectedType as ContentType | 'All',
    limit: 50,
    ...(activeGenre !== 'All' ? { genre: activeGenre } : {}),
    ...(debouncedSearch.trim() ? { q: debouncedSearch.trim() } : {}),
  });

  // Unfiltered catalogue — used only for pill counts, never shown in the grid
  const { data: countsData } = useCatalogueCountsQuery();

  // Spotlight: admin-pinned first; fall back to highest-rated from catalogue
  const { data: featuredData } = useFeaturedQuery();

  const filteredBooks = contentData?.items ?? [];
  const featuredBook = (() => {
    if (exploreSpotlight.length > 0) {
      // Convert FeaturedContentItem.content to the shape ExploreView expects
      const pin = exploreSpotlight[0]!;
      return {
        id:           pin.content.id,
        title:        pin.content.title,
        slug:         pin.content.slug,
        type:         pin.content.type as ContentType,
        status:       pin.content.status as 'ONGOING' | 'COMPLETED' | 'HIATUS' | 'CANCELLED' | 'UNKNOWN',
        synopsis:     pin.content.synopsis,
        coverImageUrl:pin.content.coverImageUrl,
        rating:       pin.content.rating ?? 0,
        chapterCount: pin.content.chapterCount,
        author:       pin.content.author ?? null,
        sourceSite:   pin.content.sourceSite ?? null,
        sourceUrl:    '',
        metadata:     pin.content.metadata,
      };
    }
    return featuredData?.items[0] ?? null;
  })();

  // Derive per-type counts from the unfiltered catalogue
  const typeCounts = useMemo(() => {
    const all = countsData?.items ?? [];
    const total = countsData?.total ?? all.length;
    const counts: Record<string, number> = { All: total };
    for (const item of all) {
      counts[item.type] = (counts[item.type] ?? 0) + 1;
    }
    return counts;
  }, [countsData]);

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] pb-28 lg:pb-12 pt-2 px-4 sm:px-6 lg:px-0 text-[#2D223B] dark:text-[#F1ECF7] select-none w-full transition-colors duration-200">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="mb-4 w-full">
        <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#342646] dark:text-[#F1ECF7]">
          Manuscript Discovery
        </h1>
        <p className="text-xs sm:text-sm text-[#80778B] dark:text-[#9F94AC] mt-1">
          Explore rare texts, grimoires, and living archives charted by ancient scholars
        </p>
      </header>

      {/* ── Search bar — visible on all viewports ───────────────────────────── */}
      <div className="mb-5 w-full">
        <div className="flex items-center gap-2.5 bg-white dark:bg-[#1D1726] rounded-2xl border border-[#ECE7DF] dark:border-[#352B44] px-4 py-3 shadow-xs focus-within:border-[#51406B] dark:focus-within:border-[#8E72B8] focus-within:ring-2 focus-within:ring-purple-900/10 transition-all">
          <Search className="w-4 h-4 text-[#8C8296] dark:text-[#9A8FA7] flex-shrink-0" />
          <input
            type="text"
            value={localSearch}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search titles, authors, or topics…"
            aria-label="Search catalogue"
            className="flex-1 bg-transparent text-sm text-[#2D223B] dark:text-[#F1ECF7] outline-none placeholder-[#A096AA] dark:placeholder-[#7E748B]"
            autoComplete="off"
          />
          {localSearch && (
            <button
              onClick={clearSearch}
              aria-label="Clear search"
              className="text-[#8C8296] dark:text-[#9A8FA7] hover:text-[#43335A] dark:hover:text-white transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* Active search label */}
        {debouncedSearch.trim() && (
          <p className="mt-2 text-xs text-[#80778B] dark:text-[#9F94AC]">
            Results for{' '}
            <span className="font-semibold text-[#43335A] dark:text-[#D1BEE6]">
              &ldquo;{debouncedSearch.trim()}&rdquo;
            </span>
            {contentData && (
              <> — {contentData.total} title{contentData.total !== 1 ? 's' : ''}</>
            )}
            <button
              onClick={clearSearch}
              className="ml-2 underline underline-offset-2 hover:text-[#43335A] dark:hover:text-[#D1BEE6] transition-colors"
            >
              Clear
            </button>
          </p>
        )}
      </div>

      {/* ── Featured Banner ─────────────────────────────────────────────────── */}
      {featuredBook && (
        <div className="bg-gradient-to-tr from-[#312344] via-[#43335A] to-[#604482] dark:from-[#1D1429] dark:via-[#2F2142] dark:to-[#4C3369] rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden mb-6 w-full border border-transparent dark:border-[#38284E]">
          <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 text-xs text-[#FFDE88] font-semibold mb-2">
              <Sparkles className="w-4 h-4 fill-[#FFDE88]" />
              <span className="uppercase tracking-wider">Archival Spotlight</span>
            </div>
            <h2 className="font-serif font-bold text-2xl sm:text-4xl leading-tight">
              {featuredBook.title}
            </h2>
            <p className="text-xs sm:text-sm text-stone-200 mt-2 leading-relaxed line-clamp-3">
              {featuredBook.synopsis ?? 'No synopsis available.'}
            </p>
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => explore.selectBook(featuredBook)}
                className="bg-white text-[#43335A] text-xs sm:text-sm font-bold px-5 py-2.5 rounded-full shadow-sm hover:bg-stone-50 active:scale-95 transition-all"
              >
                Inspect Codex
              </button>
              {featuredBook.chapterCount > 0 && (
                <span className="text-xs text-stone-300">
                  {featuredBook.chapterCount} chapters
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Type Filter Pills ────────────────────────────────────────────────── */}
      <div className="sticky top-0 lg:top-[65px] z-30 bg-[#FAF8F5]/95 dark:bg-[#120E18]/95 backdrop-blur-md -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 py-3 mb-5 border-b border-[#ECE7DF]/80 dark:border-[#2C2237]/80 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
          {explore.typeFilters.map((filter: { value: string; label: string; iconName: string }) => {
            const Icon     = ICON_MAP[filter.iconName as IconName] ?? BookOpen;
            const count    = typeCounts[filter.value] ?? 0;
            const isActive = explore.selectedType === filter.value;

            return (
              <button
                key={filter.value}
                onClick={() => explore.setType(filter.value)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                  isActive
                    ? 'bg-[#43335A] dark:bg-[#725499] text-white shadow-sm'
                    : 'bg-white dark:bg-[#1D1726] text-[#685F75] dark:text-[#C5BACF] border border-[#ECE7DF] dark:border-[#352B44] hover:bg-stone-50 dark:hover:bg-[#251E30]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="whitespace-nowrap">{filter.label}</span>
                {/* Only show count badge once catalogue data has loaded */}
                {countsData && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono leading-none ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-stone-100 dark:bg-[#2B2138] text-[#80778B] dark:text-[#9F94AC]'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Genre Filter Row — from DB categories ───────────────────────────── */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 pb-4 mb-1">
          <button
            onClick={() => setActiveGenre('All')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
              activeGenre === 'All'
                ? 'bg-[#43335A] dark:bg-[#725499] text-white shadow-sm'
                : 'bg-white dark:bg-[#1D1726] text-[#685F75] dark:text-[#C5BACF] border border-[#ECE7DF] dark:border-[#352B44] hover:bg-stone-50 dark:hover:bg-[#251E30]'
            }`}
          >
            All Genres
          </button>
          {categories.map((cat) => {
            const isActive = activeGenre === cat.genre;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveGenre(isActive ? 'All' : cat.genre)}
                className={`flex-shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                  isActive
                    ? 'bg-[#43335A] dark:bg-[#725499] text-white shadow-sm'
                    : 'bg-white dark:bg-[#1D1726] text-[#685F75] dark:text-[#C5BACF] border border-[#ECE7DF] dark:border-[#352B44] hover:bg-stone-50 dark:hover:bg-[#251E30]'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Section heading — changes with active filter ─────────────────────── */}
      {(explore.selectedType !== 'All' || activeGenre !== 'All') && !debouncedSearch.trim() && (
        <p className="text-xs text-[#80778B] dark:text-[#9F94AC] mb-4 font-medium">
          Showing{' '}
          <span className="text-[#43335A] dark:text-[#D1BEE6] font-semibold">
            {activeGenre !== 'All' ? activeGenre : (TYPE_LABELS[explore.selectedType] ?? explore.selectedType)}
          </span>
          {contentData && ` — ${contentData.total} title${contentData.total !== 1 ? 's' : ''}`}
          {activeGenre !== 'All' && explore.selectedType !== 'All' && (
            <> in <span className="text-[#43335A] dark:text-[#D1BEE6] font-semibold">{TYPE_LABELS[explore.selectedType] ?? explore.selectedType}</span></>
          )}
        </p>
      )}

      {/* ── Grid ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5 w-full">

        {isLoading && Array.from({ length: 8 }).map((_, i) => (
          <BookCardSkeleton key={i} />
        ))}

        {isError && !isLoading && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 gap-3 text-[#80778B] dark:text-[#9F94AC]">
            <p className="font-serif text-lg">Could not load catalogue.</p>
            <button
              onClick={() => refetch()}
              className="text-xs font-medium text-[#43335A] dark:text-[#9B7BBF] underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !isError && filteredBooks.length === 0 && (
          <div className="col-span-full text-center py-16 text-[#80778B] dark:text-[#9F94AC]">
            <p className="font-serif text-lg">No manuscripts found.</p>
            <p className="text-sm mt-1">
              {explore.selectedType !== 'All' || activeGenre !== 'All'
                ? 'No titles match this filter combination yet.'
                : 'The catalogue is empty.'}
            </p>
            {(explore.selectedType !== 'All' || activeGenre !== 'All' || debouncedSearch.trim()) && (
              <button
                onClick={() => { explore.setType('All'); setActiveGenre('All'); clearSearch(); }}
                className="mt-3 text-xs font-medium text-[#43335A] dark:text-[#9B7BBF] underline underline-offset-2"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {!isLoading && filteredBooks.map((item) => {
          const typeLabel = TYPE_LABELS[item.type] ?? item.type;
          const genres    = (item.metadata as { genres?: string[] } | null)?.genres ?? [];

          return (
            <div
              key={item.id}
              onClick={() => explore.selectBook(item)}
              className="bg-white dark:bg-[#1D1726] rounded-2xl p-3 sm:p-4 border border-[#ECE7DF] dark:border-[#352B44] shadow-xs group cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
            >
              {/* Cover */}
              <div className="rounded-xl overflow-hidden h-44 sm:h-56 bg-stone-100 dark:bg-stone-800 shadow-2xs relative">
                {item.coverImageUrl ? (
                  <img
                    src={item.coverImageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#80778B] dark:text-[#9F94AC] text-xs font-medium px-3 text-center">
                    {item.title}
                  </div>
                )}
                {/* Type badge — always visible, bottom-left */}
                <span className="absolute bottom-2 left-2 text-[9px] font-bold uppercase tracking-wide bg-black/50 text-white px-2 py-0.5 rounded-md backdrop-blur-sm">
                  {typeLabel}
                </span>
              </div>

              {/* Meta */}
              <div className="mt-3">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] text-[#80778B] dark:text-[#9F94AC] flex items-center gap-1 font-medium">
                    {item.rating != null && (
                      <>
                        <Star className="w-3 h-3 text-[#DE9B35] fill-[#DE9B35]" />
                        {item.rating.toFixed(1)}
                      </>
                    )}
                  </span>
                  {genres[0] && (
                    <span className="text-[9px] font-semibold text-[#554271] dark:text-[#D1BEE6] bg-[#F2EDFA] dark:bg-[#2B2138] px-2 py-0.5 rounded-full truncate max-w-[90px]">
                      {genres[0]}
                    </span>
                  )}
                </div>

                <h4 className="font-serif font-bold text-xs sm:text-sm text-[#2D223B] dark:text-[#F1ECF7] mt-1.5 truncate group-hover:text-[#43335A] dark:group-hover:text-[#FFDE88] transition-colors">
                  {item.title}
                </h4>
                <p className="text-[11px] text-[#80778B] dark:text-[#9F94AC] truncate mt-0.5">
                  {item.author ?? 'Unknown Author'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Book Detail Modal ─────────────────────────────────────────────────── */}
      {explore.selectedBook && (
        <BookDetailModal
          book={{
            ...explore.selectedBook,
            cover:  explore.selectedBook.coverImageUrl,
            rating: explore.selectedBook.rating?.toFixed(1) ?? null,
          }}
          onClose={explore.clearSelection}
          onRead={() => explore.clearSelection()}
          onAddToLibrary={(book: unknown) => { addBook(book as object); explore.clearSelection(); }}
          isInLibrary={isInLibrary(explore.selectedBook.id)}
        />
      )}
    </div>
  );
}
