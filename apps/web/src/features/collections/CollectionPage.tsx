import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Sparkles, Library } from 'lucide-react';
import { useCollection } from '../../hooks/useCollections';
import { useLibrary } from '../../hooks/useLibrary.js';
import type { ContentType } from '@arcanium/types';
import BookDetailModal from '../../components/shared/BookDetailModal';

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function BookCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#1D1726] rounded-2xl p-3 border border-[#ECE7DF] dark:border-[#352B44] animate-pulse">
      <div className="rounded-xl aspect-[3/4] bg-stone-200 dark:bg-[#2A2136]" />
      <div className="mt-3 space-y-2">
        <div className="h-3 bg-stone-200 dark:bg-[#2A2136] rounded w-3/4" />
        <div className="h-2.5 bg-stone-100 dark:bg-[#241D30] rounded w-1/2" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CollectionPage
// ---------------------------------------------------------------------------
export default function CollectionPage() {
  const { slug }                   = useParams<{ slug: string }>();
  const navigate                   = useNavigate();
  const { data: collection, isLoading, isError } = useCollection(slug ?? null);
  const { addBook, isInLibrary }   = useLibrary();
  const [selected, setSelected]    = useState<null | object>(null);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] px-5 sm:px-6 lg:px-0 pb-32 pt-4 text-[#2D223B] dark:text-[#F1ECF7]">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 mb-6 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-[#2A2136]" />
          <div className="space-y-1.5">
            <div className="h-5 w-48 bg-stone-200 dark:bg-[#2A2136] rounded" />
            <div className="h-3 w-72 bg-stone-100 dark:bg-[#241D30] rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <BookCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (isError || !collection) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] flex flex-col items-center justify-center gap-4 text-[#80778B] dark:text-[#9F94AC]">
        <BookOpen className="w-10 h-10 opacity-40" />
        <p className="text-sm">Collection not found.</p>
        <button onClick={() => navigate(-1)}
          className="text-xs font-medium text-[#43335A] dark:text-[#9B7BBF] underline underline-offset-2">
          Go back
        </button>
      </div>
    );
  }

  const books = collection.entries ?? [];

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] pb-32 lg:pb-12 pt-4 px-5 sm:px-6 lg:px-0 text-[#2D223B] dark:text-[#F1ECF7] select-none">

      {/* ── Back button ─────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-xs font-medium text-[#7A7285] dark:text-[#9F94AC] hover:text-[#43335A] dark:hover:text-white transition-colors mb-5 group"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Back
      </button>

      {/* ── Collection header ────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className={`w-3.5 h-3.5 rounded-full shadow-sm shrink-0 ${collection.coverColor}`} />
          <div className="flex items-center gap-2 text-xs text-[#DE9B35] font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            Special Collection
          </div>
        </div>
        <h1 className="font-serif font-bold text-2xl sm:text-3xl lg:text-4xl text-[#2D223B] dark:text-[#F1ECF7] tracking-wide leading-tight">
          {collection.name}
        </h1>
        {collection.description && (
          <p className="text-sm text-[#6D6579] dark:text-[#A094AC] mt-2 max-w-2xl leading-relaxed">
            {collection.description}
          </p>
        )}
        <p className="text-xs text-[#A099AB] dark:text-[#7A6F87] mt-3 flex items-center gap-1.5">
          <Library className="w-3.5 h-3.5" />
          {books.length} title{books.length !== 1 ? 's' : ''} in this collection
        </p>
      </div>

      {/* ── Books grid ──────────────────────────────────────────────────────── */}
      {books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#80778B] dark:text-[#9F94AC]">
          <BookOpen className="w-10 h-10 opacity-40" />
          <p className="text-sm">No books in this collection yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {books.map(entry => {
            const c = entry.content;
            const inLib = isInLibrary(c.id);
            const bookObj = {
              id: c.id, title: c.title, slug: c.slug,
              type: c.type as ContentType,
              status: c.status as 'ONGOING' | 'COMPLETED' | 'HIATUS' | 'CANCELLED' | 'UNKNOWN',
              synopsis: c.synopsis ?? null, coverImageUrl: c.coverImageUrl ?? null,
              rating: c.rating ?? 0, chapterCount: c.chapterCount,
              author: c.author ?? null, sourceSite: c.sourceSite ?? null,
              sourceUrl: '', metadata: c.metadata,
            };
            return (
              <button
                key={entry.id}
                onClick={() => setSelected(bookObj)}
                className="bg-white dark:bg-[#1D1726] rounded-2xl p-3 border border-[#ECE7DF] dark:border-[#352B44] shadow-xs hover:shadow-md hover:border-[#D4C8EA] dark:hover:border-[#4A3762] active:scale-95 transition-all text-left group"
              >
                {/* Cover */}
                <div className="rounded-xl overflow-hidden bg-stone-100 dark:bg-[#2A2136] aspect-[3/4] mb-3">
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
                <h3 className="font-semibold text-xs text-[#2D223B] dark:text-[#F1ECF7] line-clamp-2 leading-snug">{c.title}</h3>
                <p className="text-[10px] text-[#80778B] dark:text-[#9F94AC] mt-0.5 truncate">{c.author ?? 'Unknown'}</p>
                {c.chapterCount > 0 && (
                  <p className="text-[10px] text-[#A095AC] dark:text-[#7A6F88] mt-0.5">{c.chapterCount} ch</p>
                )}
                {!inLib && (
                  <button
                    onClick={e => { e.stopPropagation(); addBook(bookObj as never); }}
                    className="mt-2 w-full text-[10px] font-semibold text-[#43335A] dark:text-[#C5BACF] bg-[#F2EDFA] dark:bg-[#2C213B] hover:bg-[#E8DFF5] dark:hover:bg-[#352844] rounded-lg py-1.5 transition-colors"
                  >
                    + Add to Library
                  </button>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Book detail modal */}
      {selected && (
        <BookDetailModal
          book={selected as Record<string, unknown>}
          onClose={() => setSelected(null)}
          onAddToLibrary={b => addBook(b as never)}
          isInLibrary={isInLibrary((selected as { id: string }).id)}
        />
      )}
    </div>
  );
}
