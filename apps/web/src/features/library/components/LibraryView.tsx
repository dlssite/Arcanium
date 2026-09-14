import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { useLibrary } from '../../../hooks/useLibrary.js';
import { useUser } from '../../../hooks/useUser.js';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { LIBRARY_FILTER_TABS } from '../../../mocks/mockData.js';
import BookDetailModal from '../../../components/shared/BookDetailModal';
import type { LibraryBook } from '../useLibraryQuery';

export default function LibraryView() {
  const {
    filteredBooks, filterCounts, activeFilter, setFilter,
    libraryBooks, isLoading, removeBook, isInLibrary,
  } = useLibrary();

  const { user } = useUser();
  const { isAuthenticated } = useAuthStore();

  const [selectedBook, setSelectedBook] = useState<LibraryBook | null>(null);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading && libraryBooks.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] pb-28 lg:pb-12 pt-2 px-4 sm:px-6 lg:px-0 w-full">
        <div className="mb-6 h-10 w-64 bg-stone-200 dark:bg-stone-700 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#1D1726] rounded-2xl p-4 border border-[#ECE7DF] dark:border-[#352B44] animate-pulse flex gap-4">
              <div className="w-20 h-28 rounded-xl bg-stone-200 dark:bg-stone-700 flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-3/4" />
                <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-1/2" />
                <div className="h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full mt-4" />
                <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-1/3 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] pb-28 lg:pb-12 pt-2 px-4 sm:px-6 lg:px-0 text-[#2D223B] dark:text-[#F1ECF7] select-none w-full transition-colors duration-200">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
        <div>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#342646] dark:text-[#F1ECF7]">
            Living Archive Vault
          </h1>
          <p className="text-xs sm:text-sm text-[#80778B] dark:text-[#9F94AC] mt-1">
            {libraryBooks.length} preserved manuscript{libraryBooks.length !== 1 ? 's' : ''} active in your personal library
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-[#1D1726] p-1 rounded-2xl border border-[#ECE7DF] dark:border-[#352B44] shadow-2xs">
          {LIBRARY_FILTER_TABS.map((tab: string) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeFilter === tab
                  ? 'bg-[#43335A] dark:bg-[#725499] text-white shadow-xs'
                  : 'text-[#80778B] dark:text-[#9F94AC] hover:text-[#43335A] dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* ── Books Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 w-full">
        {filteredBooks.length === 0 ? (
          <div className="col-span-full text-center py-16 text-[#80778B] dark:text-[#9F94AC]">
            <p className="font-serif text-lg">No manuscripts in this section yet.</p>
            <p className="text-sm mt-1">Head to Discover to add titles to your archive.</p>
          </div>
        ) : (
          (filteredBooks as LibraryBook[]).map((b) => (
            <div
              key={b.id}
              onClick={() => setSelectedBook(b)}
              className="bg-white dark:bg-[#1D1726] rounded-2xl p-4 border border-[#ECE7DF] dark:border-[#352B44] shadow-[0_2px_14px_rgba(0,0,0,0.03)] dark:shadow-dark-card hover:shadow-md transition-all flex gap-4 group cursor-pointer"
            >
              {/* Cover */}
              <div className="w-20 h-28 rounded-xl overflow-hidden flex-shrink-0 shadow-xs border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800">
                {b.cover ? (
                  <img
                    src={b.cover}
                    alt={b.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#3D2D55] to-[#28334A]" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${
                      b.progress === 100
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-[#DE9B35]'
                    }`}>
                      {b.status}
                    </span>
                    <span className="text-[9px] font-bold bg-[#F2EDFA] dark:bg-[#2B2138] text-[#554271] dark:text-[#D1BEE6] px-2 py-0.5 rounded-full">
                      {b.level}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-sm text-[#2D223B] dark:text-[#F1ECF7] leading-snug mt-1 truncate">
                    {b.title}
                  </h3>
                  <p className="text-xs text-[#80778B] dark:text-[#9F94AC] truncate">
                    {b.author}
                  </p>
                </div>

                <div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 bg-[#EFEAF5] dark:bg-[#2B2138] rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          b.progress === 100 ? 'bg-emerald-500' : 'bg-[#43335A] dark:bg-[#8E72B8]'
                        }`}
                        style={{ width: `${b.progress}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-[#80778B] dark:text-[#9F94AC]">
                      {b.progress}%
                    </span>
                  </div>

                  <p className="text-[10px] text-[#A39AAA] dark:text-[#7A6F87] mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {b.time}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Book Detail Modal ─────────────────────────────────────────────── */}
      {selectedBook && (
        <BookDetailModal
          book={{
            ...selectedBook,
            // cover is already the right field name on LibraryBook
            cover: selectedBook.cover,
            // slug is now present — handleRead will navigate correctly
            slug:  selectedBook.slug,
          }}
          onClose={() => setSelectedBook(null)}
          isInLibrary={false}          // suppress "In Your Library" badge — user is already in library view
          onRemoveFromLibrary={() => {
            removeBook(String(selectedBook.id));
            setSelectedBook(null);
          }}
          isAuthenticated={isAuthenticated}
          userId={user.id}
        />
      )}
    </div>
  );
}
