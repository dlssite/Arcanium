import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ChevronRight, BookOpen, Library, Sparkles } from 'lucide-react';
import type { ContentMode } from '@arcanium/types';
import {
  useReaderSettings,
  readerThemeClasses,
  readerMaxWidthClass,
  READER_THEMES,
} from '../useReaderSettings';

interface ChapterContentProps {
  bodyText:          string;
  contentMode:       ContentMode;
  chapterTitle?:     string | null | undefined;
  chapterNumber?:    number | undefined;
  totalChapters?:    number | undefined;
  prevChapter?:      number | null | undefined;
  nextChapter?:      number | null | undefined;
  contentSlug?:      string | undefined;
  contentTitle?:     string | undefined;
  onNavigate?:       ((chapterNumber: number) => void) | undefined;
  onScrollProgress?: ((progress: number) => void) | undefined;
  onReachedEnd?:     (() => void) | undefined;
  onToggleControls?: (() => void) | undefined;
}

/**
 * ChapterContent — renders chapter body in text (prose) or image (comic/manga) mode.
 *
 * Polished for desktop and mobile reading ergonomics:
 *   - Customizable reading width (compact, normal, wide) for desktop comfort
 *   - Configurable alignment, typography scale, line-height, and theme harmony
 *   - Native text selection enabled
 *   - Tap/click reading area to toggle distraction-free immersive UI
 *   - Mobile edge-to-edge manga scroll with zero side margin
 *   - Beautiful in-flow End-of-Chapter card with next/previous actions
 */
export function ChapterContent({
  bodyText,
  contentMode,
  chapterTitle,
  chapterNumber = 1,
  totalChapters,
  prevChapter = null,
  nextChapter = null,
  contentSlug,
  contentTitle,
  onNavigate,
  onScrollProgress,
  onReachedEnd,
  onToggleControls,
}: ChapterContentProps) {
  const navigate      = useNavigate();
  const settings      = useReaderSettings();
  const containerRef  = useRef<HTMLDivElement>(null);
  const endReportedRef = useRef(false);

  // Active theme configuration
  const theme = READER_THEMES[settings.readerTheme] ?? READER_THEMES.light;

  // ── Scroll progress tracking ──────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const progress =
        scrollHeight <= clientHeight
          ? 1
          : scrollTop / (scrollHeight - clientHeight);
      const clamped = Math.min(1, Math.max(0, progress));
      onScrollProgress?.(clamped);

      if (clamped >= 0.95 && !endReportedRef.current) {
        endReportedRef.current = true;
        onReachedEnd?.();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [onScrollProgress, onReachedEnd]);

  // Reset end-reported flag when chapter changes and scroll to top
  useEffect(() => {
    endReportedRef.current = false;
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [bodyText, chapterNumber]);

  // Click handler to toggle controls without interfering with text selection or link clicks
  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't toggle if user clicked a button, link, input, or is selecting text
    if (target.closest('button, a, input, select, textarea')) return;
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;

    onToggleControls?.();
  };

  const themeClass   = readerThemeClasses(settings.readerTheme);
  const fontClass    = settings.fontFamily === 'serif' ? 'font-serif' : 'font-sans';
  const widthClass   = readerMaxWidthClass(settings.maxWidth);
  const alignClass   = settings.textAlign === 'justify' ? 'reader-text-justify' : 'reader-text-left';

  const containerStyle = {
    fontSize:   `${settings.fontScale}rem`,
    lineHeight: settings.lineHeight,
  };

  // ── End-of-Chapter Card Component ─────────────────────────────────────────
  const renderEndOfChapterCard = () => (
    <div className="mt-16 pt-10 pb-16 border-t" style={{ borderColor: theme.border }}>
      <div
        className="rounded-3xl p-6 sm:p-8 text-center transition-all shadow-sm"
        style={{
          backgroundColor: theme.surface,
          borderColor:     theme.border,
          borderWidth:     '1px',
          borderStyle:     'solid',
        }}
      >
        <div
          className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-4 shadow-sm"
          style={{ backgroundColor: theme.hoverBg, color: theme.accent }}
        >
          <CheckCircle2 className="w-6 h-6" />
        </div>

        <p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: theme.textMuted }}>
          Chapter Finished
        </p>
        <h3 className="text-lg sm:text-xl font-bold mb-1" style={{ color: theme.text }}>
          Chapter {chapterNumber}{chapterTitle ? `: ${chapterTitle}` : ''}
        </h3>
        {contentTitle && (
          <p className="text-xs sm:text-sm mb-6" style={{ color: theme.textMuted }}>
            {contentTitle}
            {totalChapters ? ` • ${chapterNumber} of ${totalChapters} chapters` : ''}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
          {prevChapter != null && onNavigate && (
            <button
              onClick={() => onNavigate(prevChapter)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-transform active:scale-95"
              style={{
                backgroundColor: theme.hoverBg,
                color:           theme.text,
              }}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Chapter</span>
            </button>
          )}

          {nextChapter != null && onNavigate ? (
            <button
              onClick={() => onNavigate(nextChapter)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95"
              style={{
                backgroundColor: theme.accent,
                color:           theme.accentText,
              }}
            >
              <span>Next Chapter</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => contentSlug ? navigate(`/explore`) : navigate(-1)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-transform active:scale-95"
              style={{
                backgroundColor: theme.accent,
                color:           theme.accentText,
              }}
            >
              <Library className="w-4 h-4" />
              <span>Back to Library</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ── Image mode — MANGA / COMIC / WEBTOON ─────────────────────────────────
  if (contentMode === 'image') {
    let imageUrls: string[] = [];
    try {
      imageUrls = JSON.parse(bodyText) as string[];
    } catch {
      return (
        <div
          ref={containerRef}
          className={`overflow-y-auto h-full w-full flex items-center justify-center p-6 ${themeClass}`}
          onClick={handleContentClick}
        >
          <div className="text-center max-w-md p-6 rounded-2xl border" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <BookOpen className="w-8 h-8 mx-auto mb-3" style={{ color: theme.textMuted }} />
            <p className="text-sm font-medium" style={{ color: theme.text }}>Could not load chapter images.</p>
            <p className="text-xs mt-1" style={{ color: theme.textMuted }}>The image manifest could not be parsed.</p>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className={`overflow-y-auto h-full w-full select-none ${themeClass}`}
        onClick={handleContentClick}
      >
        <div className="w-full sm:max-w-2xl md:max-w-3xl mx-auto px-0 sm:px-4 py-0 sm:py-6">
          {imageUrls.map((url, i) => (
            <div key={i} className="relative w-full min-h-[200px] flex items-center justify-center bg-black/5 dark:bg-white/5">
              <img
                src={url}
                alt={`Page ${i + 1}`}
                className="w-full h-auto block select-none"
                loading={i < 2 ? 'eager' : 'lazy'}
                decoding="async"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('.image-error-fallback')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'image-error-fallback py-12 text-center text-xs opacity-60';
                    fallback.textContent = `Page ${i + 1} could not be loaded`;
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
          ))}

          {/* End of chapter card */}
          <div className="px-4 sm:px-0">
            {renderEndOfChapterCard()}
          </div>
        </div>
      </div>
    );
  }

  // ── Text mode — WEB_NOVEL / LIGHT_NOVEL / EBOOK ───────────────────────────
  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto h-full w-full reader-content-area ${themeClass} ${fontClass} ${alignClass}`}
      style={containerStyle}
      onClick={handleContentClick}
    >
      <div className={`${widthClass} mx-auto px-5 py-8 sm:px-8 sm:py-12 lg:px-12 transition-all`}>
        {/* Chapter Header in text stream */}
        <header className="mb-10 pb-6 border-b" style={{ borderColor: theme.border }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: theme.textMuted }}>
            {contentTitle || 'Arcanium Archive'}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: theme.text }}>
            Chapter {chapterNumber}{chapterTitle ? `: ${chapterTitle}` : ''}
          </h1>
        </header>

        {/* Sanitised body HTML */}
        <div
          className="reader-prose"
          style={{ color: theme.text }}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: bodyText }}
        />

        {/* In-flow End-of-Chapter navigation */}
        {renderEndOfChapterCard()}
      </div>
    </div>
  );
}
