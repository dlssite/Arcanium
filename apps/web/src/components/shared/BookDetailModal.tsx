import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Play, BookMarked, Sparkles, Clock, Star,
  CheckCircle2, Trash2, BookOpen,
} from 'lucide-react';
import { features } from '../../config/features';

/**
 * BookDetailModal — displays full details for any content item.
 *
 * Accepts books in several shapes (Content, LibraryBook, ExploreBook) as long
 * as they carry the fields used below. The caller is responsible for mapping
 * `coverImageUrl` → `cover` before passing.
 *
 * Props:
 *   book               — book object to display
 *   onClose            — close the modal
 *   onRead             — fallback when no slug is available; receives book
 *   onAddToLibrary     — called when "Add to Shelf" is clicked; receives book
 *   onRemoveFromLibrary — called when "Remove from Library" is clicked; optional
 *   isInLibrary        — when true, shows "In Your Library" state + remove button
 */
interface BookDetailModalProps {
  book:                 Record<string, unknown>;
  onClose:              () => void;
  onRead?:              (book: Record<string, unknown>) => void;
  onAddToLibrary?:      (book: Record<string, unknown>) => void;
  onRemoveFromLibrary?: (book: Record<string, unknown>) => void;
  isInLibrary?:         boolean;
}

export default function BookDetailModal({
  book,
  onClose,
  onRead,
  onAddToLibrary,
  onRemoveFromLibrary,
  isInLibrary = false,
}: BookDetailModalProps) {
  if (!book) return null;

  const navigate = useNavigate();

  const rating       = book['rating']       as string | number | null ?? null;
  const ratingCount  = book['ratingCount']  as number | null ?? null;
  const chapterCount = book['chapterCount'] as number | null ?? null;
  const readTime     = book['readTime']     as string | null ?? null;
  const slug         = book['slug']         as string | undefined;
  const cover        = book['cover']        as string | null ?? null;
  const title        = book['title']        as string ?? '';
  const author       = book['author']       as string | null ?? null;
  const synopsis     = book['synopsis']     as string | null ?? null;
  const level        = book['level']        as string | undefined;
  const badge        = book['badge']        as string | undefined;

  // Determine the chapter to resume at
  const lastChapterRead = book['lastChapterRead'] as number | null ?? null;
  const hasProgress     = lastChapterRead != null && lastChapterRead > 0;
  const resumeChapter   = hasProgress ? lastChapterRead : 1;
  const readLabel       = hasProgress ? 'Continue Reading' : 'Begin Reading';

  const handleRead = () => {
    onClose();
    if (slug) {
      navigate(`/read/${slug}/${resumeChapter}`);
    } else {
      onRead?.(book);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF8F5] dark:bg-[#1C1625] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-[#ECE7DF] dark:border-[#382C48] relative flex flex-col max-h-[90vh] text-[#2D223B] dark:text-[#F1ECF7]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/80 dark:bg-[#251D30]/80 backdrop-blur-md border border-stone-200 dark:border-stone-700 flex items-center justify-center text-[#43335A] dark:text-[#E2D9EC] hover:bg-white dark:hover:bg-[#2F253D] shadow-sm transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto p-6 no-scrollbar">
          {/* ── Cover & Header ─────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
            <div className="w-32 h-44 rounded-2xl overflow-hidden shadow-lg border border-stone-200/80 dark:border-stone-700/80 flex-shrink-0 bg-stone-100 dark:bg-stone-800">
              {cover ? (
                <img
                  src={cover}
                  alt={title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#3D2D55] to-[#28334A]">
                  <BookOpen className="w-10 h-10 text-white/30" />
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5 flex-wrap">
                {level && (
                  <span className="bg-[#51406B] dark:bg-[#684C8B] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    {level}
                  </span>
                )}
                {badge && (
                  <span className="bg-[#DE9B35] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    {badge}
                  </span>
                )}
                {rating != null && (
                  <span className="text-xs text-[#80778B] dark:text-[#A69BB2] flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-[#DE9B35] fill-[#DE9B35]" />
                    {typeof rating === 'number' ? rating.toFixed(1) : rating}
                    {ratingCount != null && (
                      <span className="text-[10px]">({ratingCount.toLocaleString()})</span>
                    )}
                  </span>
                )}
              </div>

              <h2 className="font-serif font-bold text-2xl text-[#2D223B] dark:text-[#F1ECF7] leading-tight">
                {title}
              </h2>
              {author && (
                <p className="text-sm text-[#7A7382] dark:text-[#A498B0] mt-1 font-medium">
                  {author}
                </p>
              )}

              <div className="mt-3 flex items-center justify-center sm:justify-start gap-4 text-xs text-[#80778B] dark:text-[#A69BB2] flex-wrap">
                {readTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {readTime}
                  </span>
                )}
                {readTime && chapterCount && <span>•</span>}
                {chapterCount != null && chapterCount > 0 && (
                  <span>{chapterCount} Chapters</span>
                )}
                {hasProgress && (
                  <span className="text-[#DE9B35] font-semibold">
                    Ch. {lastChapterRead} read
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Synopsis ───────────────────────────────────────────────────── */}
          {synopsis && (
            <div className="mt-6 border-t border-[#EFEAE2] dark:border-[#352B44] pt-4">
              <h4 className="font-serif font-bold text-base text-[#2D223B] dark:text-[#F1ECF7] mb-2">
                Archival Synopsis
              </h4>
              <p className="text-xs leading-relaxed text-[#685F73] dark:text-[#B9ADC5]">
                {synopsis}
              </p>
            </div>
          )}

          {/* ── Actions ────────────────────────────────────────────────────── */}
          <div className="mt-6 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Begin / Continue Reading */}
              {features.reader && (
                <button
                  onClick={handleRead}
                  className="flex-1 bg-[#43335A] hover:bg-[#342647] dark:bg-[#725499] dark:hover:bg-[#604484] text-white py-3 px-5 rounded-2xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 active:scale-98 transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{readLabel}</span>
                </button>
              )}

              {/* Library button — add / already added */}
              {isInLibrary ? (
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 py-3 px-5 rounded-2xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>In Your Library</span>
                  </div>
                </div>
              ) : (
                onAddToLibrary && (
                  <button
                    onClick={() => {
                      onAddToLibrary(book);
                      onClose();
                    }}
                    className="bg-white dark:bg-[#251D30] hover:bg-stone-50 dark:hover:bg-[#2E243A] text-[#43335A] dark:text-[#E2D9EC] border border-[#DDD5C7] dark:border-[#3D2E50] py-3 px-5 rounded-2xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-98 transition-all shadow-sm"
                  >
                    <BookMarked className="w-4 h-4 text-[#DE9B35]" />
                    <span>Add to Shelf</span>
                  </button>
                )
              )}
            </div>

            {/* Remove from library — shown as a separate destructive row */}
            {onRemoveFromLibrary && (
              <button
                onClick={() => {
                  onRemoveFromLibrary(book);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-5 rounded-2xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-950/40 active:scale-95 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove from Library</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
