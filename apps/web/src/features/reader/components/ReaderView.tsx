import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, WifiOff, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReaderToolbar } from './ReaderToolbar';
import { ChapterContent } from './ChapterContent';
import { useReader } from '../useReader';
import { useReaderSettings, readerThemeClasses, READER_THEMES } from '../useReaderSettings';
import { useUser } from '../../../hooks/useUser.js';

/**
 * ReaderView — immersive, responsive reading experience for desktop and mobile.
 *
 * Route: /read/:slug/:chapter
 *
 * Capabilities:
 *   - Immersive distraction-free mode: tap content to toggle header & status bars
 *   - Sleek top scroll progress bar (0–100%)
 *   - Desktop keyboard shortcuts (ArrowLeft/ArrowRight for chapters, F for fullscreen)
 *   - Cohesive theme harmony across loading, reading, and error surfaces
 *   - In-flow end-of-chapter actions replacing intrusive fixed footers
 *   - Offline caching + background prefetching + daily goal tracking
 */
export default function ReaderView() {
  const { slug, chapter: chapterParam } = useParams<{ slug: string; chapter: string }>();
  const navigate    = useNavigate();
  const settings    = useReaderSettings();
  const theme       = READER_THEMES[settings.readerTheme] ?? READER_THEMES.light;
  const themeClass  = readerThemeClasses(settings.readerTheme);

  const chapterNumber = parseFloat(chapterParam ?? '1') || 1;

  // Immersive UI toggle state
  const [showControls, setShowControls] = useState(true);

  // Import useUser for daily goal tracking
  const { addReadingMinutes } = useUser();

  // Track reading time for daily goal
  const readingStartTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // Reset start time when chapter changes
    readingStartTimeRef.current = Date.now();

    // Track reading time when user leaves the page or closes tab
    const trackReadingTime = () => {
      const minutesRead = Math.floor((Date.now() - readingStartTimeRef.current) / 60000);
      if (minutesRead > 0) {
        addReadingMinutes(minutesRead);
      }
    };

    // Save reading time every 2 minutes while reading
    const interval = setInterval(() => {
      const minutesRead = Math.floor((Date.now() - readingStartTimeRef.current) / 60000);
      if (minutesRead > 0) {
        addReadingMinutes(minutesRead);
        readingStartTimeRef.current = Date.now(); // Reset counter
      }
    }, 120000); // 2 minutes

    return () => {
      clearInterval(interval);
      trackReadingTime(); // Save on unmount
    };
  }, [chapterNumber, addReadingMinutes]);

  const {
    chapter,
    isLoading,
    isFetchingBody,
    error,
    scrollPosition,
    setScrollPosition,
    markCompleted,
  } = useReader({
    slug: slug ?? '',
    chapterNumber,
  });

  const handleNavigate = useCallback(
    (num: number) => {
      navigate(`/read/${slug}/${num}`, { replace: false });
    },
    [navigate, slug],
  );

  // Toggle immersive controls
  const toggleControls = useCallback(() => {
    setShowControls((prev) => !prev);
  }, []);

  // ── Desktop Keyboard Navigation ───────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === ']') {
        if (chapter?.nextChapter != null) {
          e.preventDefault();
          handleNavigate(chapter.nextChapter);
        }
      } else if (e.key === 'ArrowLeft' || e.key === '[') {
        if (chapter?.prevChapter != null) {
          e.preventDefault();
          handleNavigate(chapter.prevChapter);
        }
      } else if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chapter?.nextChapter, chapter?.prevChapter, handleNavigate]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className={`fixed inset-0 flex flex-col items-center justify-center transition-colors ${themeClass}`}
        style={{ backgroundColor: theme.bg }}
      >
        <Loader2
          className="w-9 h-9 animate-spin mb-3"
          style={{ color: theme.accent }}
        />
        <p className="text-sm font-medium" style={{ color: theme.textMuted }}>
          Loading chapter {chapterNumber}...
        </p>
      </div>
    );
  }

  // ── Scraper still fetching body text (202 response) ───────────────────────
  if (isFetchingBody) {
    return (
      <div
        className={`fixed inset-0 flex flex-col items-center justify-center p-6 text-center transition-colors ${themeClass}`}
        style={{ backgroundColor: theme.bg }}
      >
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 shadow-sm"
          style={{ backgroundColor: theme.surface, color: theme.accent }}
        >
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="font-serif text-xl font-bold mb-2" style={{ color: theme.text }}>
          Preparing Chapter {chapterNumber}
        </h2>
        <p className="text-sm max-w-sm mb-4" style={{ color: theme.textMuted }}>
          The archive is retrieving and formatting this chapter for the first time.
        </p>
        <div className="flex items-center gap-2 text-xs font-mono" style={{ color: theme.accent }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Refreshing automatically...</span>
        </div>
      </div>
    );
  }

  // ── Error / missing chapter ───────────────────────────────────────────────
  if (error || !chapter) {
    return (
      <div
        className={`fixed inset-0 flex flex-col items-center justify-center p-6 text-center gap-4 transition-colors ${themeClass}`}
        style={{ backgroundColor: theme.bg }}
      >
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-sm"
          style={{ backgroundColor: theme.surface, color: theme.textMuted }}
        >
          <WifiOff className="w-8 h-8" />
        </div>
        <div>
          <h2 className="font-serif text-xl font-bold mb-1" style={{ color: theme.text }}>
            Chapter Unavailable
          </h2>
          <p className="text-sm max-w-sm mx-auto" style={{ color: theme.textMuted }}>
            {error ?? 'This chapter could not be loaded.'}
          </p>
          {!navigator.onLine && (
            <p className="text-xs text-amber-500 mt-2">
              You appear to be offline. Only cached chapters can be read.
            </p>
          )}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold shadow-md transition-transform active:scale-95"
          style={{
            backgroundColor: theme.accent,
            color:           theme.accentText,
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  // ── Main Reader View ──────────────────────────────────────────────────────
  const progressPercent = Math.round(scrollPosition * 100);

  return (
    <div
      className={`fixed inset-0 flex flex-col overflow-hidden transition-colors ${themeClass}`}
      style={{ backgroundColor: theme.bg }}
    >
      {/* ── Top Reading Progress Bar (always subtle & visible) ───────────────── */}
      <div
        className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-transparent pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="h-full transition-all duration-150 ease-out"
          style={{
            width:           `${progressPercent}%`,
            backgroundColor: theme.progressBar,
          }}
        />
      </div>

      {/* ── Top Toolbar (toggles with showControls) ─────────────────────────── */}
      <ReaderToolbar
        contentSlug={slug ?? ''}
        contentTitle={chapter.content.title}
        chapterNumber={chapter.number}
        chapterTitle={chapter.title}
        totalChapters={chapter.content.chapterCount}
        prevChapter={chapter.prevChapter}
        nextChapter={chapter.nextChapter}
        onNavigate={handleNavigate}
        isVisible={showControls}
      />

      {/* ── Scrollable Reading Body ─────────────────────────────────────────── */}
      <main className="flex-1 min-h-0 relative">
        <ChapterContent
          bodyText={chapter.bodyText ?? ''}
          contentMode={chapter.contentMode}
          chapterTitle={chapter.title}
          chapterNumber={chapter.number}
          totalChapters={chapter.content.chapterCount}
          prevChapter={chapter.prevChapter}
          nextChapter={chapter.nextChapter}
          contentSlug={slug}
          contentTitle={chapter.content.title}
          onNavigate={handleNavigate}
          onScrollProgress={setScrollPosition}
          onReachedEnd={markCompleted}
          onToggleControls={toggleControls}
        />
      </main>

      {/* ── Floating Bottom Quick Bar (auto-hides in immersive mode) ─────────── */}
      <footer
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 pointer-events-auto ${
          showControls
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8 pointer-events-none'
        }`}
      >
        <div
          className="px-4 py-2 rounded-full border shadow-lg backdrop-blur-md flex items-center gap-3 text-xs font-medium"
          style={{
            backgroundColor: `${theme.surface}EE`,
            borderColor:     theme.border,
            color:           theme.text,
          }}
        >
          {chapter.prevChapter != null && (
            <button
              onClick={() => handleNavigate(chapter.prevChapter!)}
              className="p-1 rounded-full hover:opacity-80 active:scale-95 transition-transform"
              aria-label="Previous chapter"
              title="Previous chapter"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2 px-1">
            <span className="font-mono text-[11px] opacity-75">
              Ch. {chapter.number}
            </span>
            <span className="opacity-30">•</span>
            <span className="font-mono text-[11px] font-semibold" style={{ color: theme.accent }}>
              {progressPercent}%
            </span>
          </div>

          {chapter.nextChapter != null && (
            <button
              onClick={() => handleNavigate(chapter.nextChapter!)}
              className="p-1 rounded-full hover:opacity-80 active:scale-95 transition-transform"
              aria-label="Next chapter"
              title="Next chapter"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
