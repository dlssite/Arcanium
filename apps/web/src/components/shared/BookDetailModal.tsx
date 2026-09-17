import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Play, BookMarked, Sparkles, Clock, Star,
  CheckCircle2, Trash2, BookOpen, ChevronDown, ChevronUp,
} from 'lucide-react';
import { features } from '../../config/features';
import { ReviewSection } from '../../features/reviews/index.js';

/**
 * BookDetailModal — displays full details for any content item.
 *
 * Mobile View:
 *   - Native-feeling Slide-Up Bottom Sheet with grab handle and touch-dismiss
 *   - Fixed bottom action bar for instant "Add to Shelf" and "Begin Reading" access
 *   - Fluid scrollable content with ambient book cover presentation and expandable synopsis
 *
 * Desktop View:
 *   - Centered luxury dialog with backdrop blur, polished typography, and fixed actions
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
  onRead?:              ((book: Record<string, unknown>) => void) | undefined;
  onAddToLibrary?:      ((book: Record<string, unknown>) => void) | undefined;
  onRemoveFromLibrary?: ((book?: Record<string, unknown>) => void) | undefined;
  isInLibrary?:         boolean | undefined;
  isAuthenticated?:     boolean | undefined;
  userId?:              string | undefined;
}

export default function BookDetailModal({
  book,
  onClose,
  onRead,
  onAddToLibrary,
  onRemoveFromLibrary,
  isInLibrary = false,
  isAuthenticated = false,
  userId,
}: BookDetailModalProps) {
  if (!book) return null;

  const navigate = useNavigate();
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

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
  const readLabel       = hasProgress
    ? `Continue (Ch. ${lastChapterRead})`
    : 'Begin Reading';

  const handleRead = () => {
    onClose();
    if (slug) {
      navigate(`/read/${slug}/${resumeChapter}`);
    } else {
      onRead?.(book);
    }
  };

  // Touch drag-down gesture for mobile sheet
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      setTouchStartY(touch.clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    if (touchStartY != null && touch) {
      const deltaY = touch.clientY - touchStartY;
      if (deltaY > 100) {
        onClose();
      }
      setTouchStartY(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF8F5] dark:bg-[#1A1324] w-full sm:max-w-xl rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl border-t sm:border border-[#ECE7DF] dark:border-[#382C48] relative flex flex-col h-[90vh] sm:h-auto sm:max-h-[88vh] text-[#2D223B] dark:text-[#F1ECF7] animate-slide-up-sheet sm:animate-scale-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator Handle */}
        <div
          className="sm:hidden w-full pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing flex-shrink-0"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1.5 rounded-full bg-stone-300/80 dark:bg-[#433556]" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-3.5 sm:top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/85 dark:bg-[#251D30]/85 backdrop-blur-md border border-stone-200/80 dark:border-stone-700/80 flex items-center justify-center text-[#43335A] dark:text-[#E2D9EC] hover:bg-white dark:hover:bg-[#2F253D] shadow-sm transition-all active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ── Scrollable Content Area ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 pt-2 sm:pt-6 pb-6 no-scrollbar overscroll-contain">
          {/* Cover & Hero Section */}
          <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
            {/* Book Cover with 3D shadow and ambient glow */}
            <div className="relative flex-shrink-0 group">
              <div className="absolute -inset-1 bg-gradient-to-br from-[#DE9B35]/25 via-[#5D497D]/25 to-transparent rounded-2xl blur-md -z-10 opacity-70" />
              <div className="w-32 h-44 sm:w-36 sm:h-50 rounded-2xl overflow-hidden shadow-[0_10px_25px_-5px_rgba(45,34,59,0.3)] dark:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.6)] border border-stone-200/90 dark:border-stone-700/80 bg-stone-100 dark:bg-stone-800">
                {cover ? (
                  <img
                    src={cover}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#3D2D55] to-[#241A33] text-white/40">
                    <BookOpen className="w-10 h-10 mb-1" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Arcanium</span>
                  </div>
                )}
              </div>
            </div>

            {/* Title, Badges & Stats */}
            <div className="flex-1 text-center sm:text-left min-w-0">
              {/* Badges Row */}
              <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-2 flex-wrap">
                {level && (
                  <span className="bg-[#51406B] dark:bg-[#684C8B] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                    {level}
                  </span>
                )}
                {badge && (
                  <span className="bg-[#DE9B35] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                    {badge}
                  </span>
                )}
                {rating != null && (
                  <span className="text-xs font-semibold text-[#80778B] dark:text-[#A69BB2] flex items-center gap-1 bg-stone-100 dark:bg-[#251C33] px-2.5 py-0.5 rounded-full border border-stone-200/60 dark:border-[#382C48]">
                    <Star className="w-3.5 h-3.5 text-[#DE9B35] fill-[#DE9B35]" />
                    <span>{typeof rating === 'number' ? rating.toFixed(1) : rating}</span>
                    {ratingCount != null && (
                      <span className="text-[10px] font-normal opacity-75">
                        ({ratingCount.toLocaleString()})
                      </span>
                    )}
                  </span>
                )}
              </div>

              {/* Title & Author */}
              <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#2D223B] dark:text-[#F1ECF7] leading-tight tracking-tight">
                {title}
              </h2>
              {author && (
                <p className="text-xs sm:text-sm text-[#7A7382] dark:text-[#A498B0] mt-1 font-medium">
                  by <span className="text-[#43335A] dark:text-[#C5B3DC] font-semibold">{author}</span>
                </p>
              )}

              {/* Quick Metrics Bar */}
              <div className="mt-3.5 flex items-center justify-center sm:justify-start gap-3 text-xs text-[#7A7185] dark:text-[#A69BB2] flex-wrap">
                {readTime && (
                  <div className="flex items-center gap-1 bg-stone-100/80 dark:bg-[#251C33] px-2.5 py-1 rounded-lg border border-stone-200/60 dark:border-[#382C48]">
                    <Clock className="w-3.5 h-3.5 text-[#DE9B35]" />
                    <span>{readTime}</span>
                  </div>
                )}
                {chapterCount != null && chapterCount > 0 && (
                  <div className="flex items-center gap-1 bg-stone-100/80 dark:bg-[#251C33] px-2.5 py-1 rounded-lg border border-stone-200/60 dark:border-[#382C48]">
                    <BookOpen className="w-3.5 h-3.5 text-[#725499]" />
                    <span>{chapterCount} Chapters</span>
                  </div>
                )}
                {hasProgress && (
                  <div className="flex items-center gap-1 bg-[#DE9B35]/15 text-[#DE9B35] px-2.5 py-1 rounded-lg font-semibold border border-[#DE9B35]/30">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ch. {lastChapterRead} read</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Synopsis ───────────────────────────────────────────────────── */}
          {synopsis && (
            <div className="mt-6 border-t border-[#EFEAE2] dark:border-[#352B44] pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-serif font-bold text-sm sm:text-base text-[#2D223B] dark:text-[#F1ECF7] tracking-wide">
                  Archival Synopsis
                </h4>
              </div>
              <div className="relative">
                <p
                  className={`text-xs sm:text-sm leading-relaxed text-[#5E536B] dark:text-[#BDB2CB] ${
                    !isSynopsisExpanded && synopsis.length > 220 ? 'line-clamp-3' : ''
                  }`}
                >
                  {synopsis}
                </p>
                {synopsis.length > 220 && (
                  <button
                    onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                    className="mt-1 text-xs font-semibold text-[#DE9B35] hover:text-[#C88626] dark:text-[#E8AA4C] flex items-center gap-1 transition-colors"
                  >
                    <span>{isSynopsisExpanded ? 'Show less' : 'Read more'}</span>
                    {isSynopsisExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Reviews Section ────────────────────────────────────────────── */}
          {features.reader && slug && (
            <ReviewSection
              slug={slug}
              contentId={book.id as string}
              isAuthenticated={isAuthenticated}
              {...(userId && { userId })}
            />
          )}
        </div>

        {/* ── Fixed Bottom Actions Bar ────────────────────────────────────── */}
        <div className="flex-shrink-0 border-t border-[#ECE7DF] dark:border-[#352B44] bg-[#FAF8F5]/95 dark:bg-[#1A1324]/95 backdrop-blur-md px-5 sm:px-6 pt-3 pb-safe pb-5 sm:pb-4 z-20 shadow-[0_-8px_20px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              {/* Add / In Library Action Button */}
              {isInLibrary ? (
                <div className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 py-3 px-4 rounded-2xl font-semibold text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>In Your Shelf</span>
                </div>
              ) : (
                onAddToLibrary && (
                  <button
                    onClick={() => {
                      onAddToLibrary(book);
                      onClose();
                    }}
                    className="flex-1 bg-white dark:bg-[#251D30] hover:bg-stone-50 dark:hover:bg-[#2E243A] text-[#43335A] dark:text-[#E2D9EC] border border-[#DDD5C7] dark:border-[#3D2E50] py-3 px-4 rounded-2xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-98 transition-all shadow-xs"
                  >
                    <BookMarked className="w-4 h-4 text-[#DE9B35]" />
                    <span>Add to Shelf</span>
                  </button>
                )
              )}

              {/* Begin / Continue Reading Primary Button */}
              {features.reader && (
                <button
                  onClick={handleRead}
                  className="flex-[1.4] bg-gradient-to-r from-[#43335A] to-[#513D6B] hover:from-[#352748] hover:to-[#433159] dark:from-[#725499] dark:to-[#8363AC] dark:hover:from-[#624784] dark:hover:to-[#725499] text-white py-3 px-5 rounded-2xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-950/20 active:scale-98 transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span className="truncate">{readLabel}</span>
                </button>
              )}
            </div>

            {/* Remove from Library button — always shown if onRemoveFromLibrary is provided */}
            {onRemoveFromLibrary && (
              <button
                onClick={() => {
                  onRemoveFromLibrary(book);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/25 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-950/50 active:scale-98 transition-all shadow-xs"
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
