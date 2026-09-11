import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, ArrowLeft,
  Type, Sun, Moon, BookOpen,
  Minus, Plus, AlignLeft, AlignJustify,
  Maximize2, Minimize2, X, Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import {
  useReaderSettings,
  READER_THEMES,
} from '../useReaderSettings';
import type {
  ReaderTheme,
  FontFamily,
  ReaderMaxWidth,
  ReaderTextAlign,
} from '../useReaderSettings';

interface ReaderToolbarProps {
  contentSlug:    string;
  contentTitle:   string;
  chapterNumber:  number;
  chapterTitle:   string | null;
  totalChapters?: number | undefined;
  prevChapter:    number | null;
  nextChapter:    number | null;
  onNavigate:     (chapterNumber: number) => void;
  isVisible?:     boolean | undefined;
}

export function ReaderToolbar({
  contentSlug,
  contentTitle,
  chapterNumber,
  chapterTitle,
  totalChapters,
  prevChapter,
  nextChapter,
  onNavigate,
  isVisible = true,
}: ReaderToolbarProps) {
  const navigate = useNavigate();
  const settings = useReaderSettings();
  const theme    = READER_THEMES[settings.readerTheme] ?? READER_THEMES.light;

  const [showSettings, setShowSettings]       = useState(false);
  const [showChapterJump, setShowChapterJump] = useState(false);
  const [jumpInput, setJumpInput]             = useState(String(chapterNumber));
  const [isFullscreen, setIsFullscreen]       = useState(Boolean(document.fullscreenElement));

  const settingsRef     = useRef<HTMLDivElement>(null);
  const mobileSheetRef  = useRef<HTMLDivElement>(null);
  const chapterJumpRef  = useRef<HTMLDivElement>(null);

  // Sync jump input with current chapter
  useEffect(() => {
    setJumpInput(String(chapterNumber));
  }, [chapterNumber]);

  // Track fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Close modals on Escape key or outside clicks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSettings(false);
        setShowChapterJump(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      // Don't close settings if clicking inside desktop settings container or mobile sheet
      const isInsideSettings =
        (settingsRef.current && settingsRef.current.contains(target)) ||
        (mobileSheetRef.current && mobileSheetRef.current.contains(target));

      if (!isInsideSettings) {
        setShowSettings(false);
      }

      if (chapterJumpRef.current && !chapterJumpRef.current.contains(target)) {
        setShowChapterJump(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/explore');
    }
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(jumpInput, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onNavigate(parsed);
      setShowChapterJump(false);
    }
  };

  const themes: { value: ReaderTheme; label: string; icon: React.ReactNode; previewBg: string; previewText: string }[] = [
    { value: 'light', label: 'Paper',  icon: <Sun className="w-3.5 h-3.5" />,      previewBg: '#FAF8F5', previewText: '#221D28' },
    { value: 'sepia', label: 'Sepia',  icon: <BookOpen className="w-3.5 h-3.5" />, previewBg: '#F5EEDB', previewText: '#3D3020' },
    { value: 'dark',  label: 'Velvet', icon: <Moon className="w-3.5 h-3.5" />,     previewBg: '#171320', previewText: '#E8E2F0' },
    { value: 'oled',  label: 'OLED',   icon: <Sparkles className="w-3.5 h-3.5" />, previewBg: '#000000', previewText: '#DEDEDE' },
  ];

  const fonts: { value: FontFamily; label: string; preview: string }[] = [
    { value: 'serif', label: 'Serif', preview: 'Aa (Literary)' },
    { value: 'sans',  label: 'Sans',  preview: 'Aa (Modern)' },
  ];

  const widths: { value: ReaderMaxWidth; label: string }[] = [
    { value: 'compact', label: 'Compact' },
    { value: 'normal',  label: 'Standard' },
    { value: 'wide',    label: 'Wide' },
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-transform duration-300 ease-in-out border-b shadow-sm ${
          isVisible ? 'translate-y-0' : '-translate-y-full pointer-events-none'
        }`}
        style={{
          backgroundColor: `${theme.bg}F2`,
          borderColor:     theme.border,
          backdropFilter:  'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: back + titles */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={handleBack}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 active:scale-95"
              style={{ color: theme.text, backgroundColor: theme.hoverBg }}
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="min-w-0 truncate">
              <p
                className="text-[11px] sm:text-xs truncate font-medium"
                style={{ color: theme.textMuted }}
              >
                {contentTitle || 'Arcanium Library'}
              </p>
              <p
                className="text-xs sm:text-sm font-semibold truncate"
                style={{ color: theme.text }}
              >
                Ch. {chapterNumber}{chapterTitle ? ` — ${chapterTitle}` : ''}
              </p>
            </div>
          </div>

          {/* Center: chapter navigation */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => prevChapter != null && onNavigate(prevChapter)}
              disabled={prevChapter == null}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-20 active:scale-95"
              style={{ color: theme.text, backgroundColor: theme.hoverBg }}
              aria-label="Previous chapter"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Clickable Chapter Selector Badge */}
            <div className="relative" ref={chapterJumpRef}>
              <button
                type="button"
                onClick={() => setShowChapterJump((v) => !v)}
                className="px-2.5 sm:px-3 py-1 rounded-full text-xs font-mono font-medium flex items-center gap-1 transition-all active:scale-95"
                style={{
                  backgroundColor: theme.hoverBg,
                  color:           theme.text,
                  borderColor:     theme.border,
                  borderWidth:     '1px',
                }}
                title="Jump to chapter"
              >
                <span>Ch. {chapterNumber}</span>
                {totalChapters && (
                  <span className="text-[10px] opacity-60 hidden sm:inline">/{totalChapters}</span>
                )}
              </button>

              {/* Chapter Jump Popover */}
              {showChapterJump && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-10 w-52 rounded-2xl p-3 shadow-xl border z-50 animate-fadeIn"
                  style={{ backgroundColor: theme.surface, borderColor: theme.border }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>
                    Jump to Chapter
                  </p>
                  <form onSubmit={handleJumpSubmit} className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={totalChapters || 9999}
                      value={jumpInput}
                      onChange={(e) => setJumpInput(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl text-xs font-mono border focus:outline-none focus:ring-1"
                      style={{
                        backgroundColor: theme.bg,
                        borderColor:     theme.border,
                        color:           theme.text,
                      }}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-transform active:scale-95"
                      style={{
                        backgroundColor: theme.accent,
                        color:           theme.accentText,
                      }}
                    >
                      Go
                    </button>
                  </form>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => nextChapter != null && onNavigate(nextChapter)}
              disabled={nextChapter == null}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-20 active:scale-95"
              style={{ color: theme.text, backgroundColor: theme.hoverBg }}
              aria-label="Next chapter"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Right: Fullscreen & Reader Settings */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0" ref={settingsRef}>
            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors active:scale-95"
              style={{ color: theme.text, backgroundColor: theme.hoverBg }}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </button>

            {/* Settings Toggle Button */}
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all active:scale-95"
              style={{
                backgroundColor: showSettings ? theme.accent : theme.hoverBg,
                color:           showSettings ? theme.accentText : theme.text,
              }}
              aria-label="Reader settings"
              title="Reader Settings (T)"
            >
              <Type className="w-4 h-4" />
            </button>

            {/* ── DESKTOP SETTINGS POPOVER (md and up) ────────────────────────── */}
            {showSettings && (
              <div
                className="hidden md:block absolute right-4 top-14 w-80 rounded-2xl shadow-2xl p-5 space-y-4 border z-50 animate-fadeIn"
                style={{
                  backgroundColor: theme.surface,
                  borderColor:     theme.border,
                  color:           theme.text,
                }}
              >
                {/* Theme Selector */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>
                    Theme
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {themes.map((t) => {
                      const isActive = settings.readerTheme === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => settings.setReaderTheme(t.value)}
                          className="flex flex-col items-center gap-1.5 p-2 rounded-xl text-xs font-medium border transition-all active:scale-95"
                          style={{
                            backgroundColor: t.previewBg,
                            borderColor:     isActive ? theme.accent : theme.border,
                            borderWidth:     isActive ? '2px' : '1px',
                            color:           t.previewText,
                          }}
                        >
                          {t.icon}
                          <span className="text-[11px]">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Font Family */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>
                    Font Type
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {fonts.map((f) => {
                      const isActive = settings.fontFamily === f.value;
                      return (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => settings.setFontFamily(f.value)}
                          className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all active:scale-95 flex items-center justify-between ${
                            f.value === 'serif' ? 'font-serif' : 'font-sans'
                          }`}
                          style={{
                            backgroundColor: isActive ? theme.hoverBg : 'transparent',
                            borderColor:     isActive ? theme.accent : theme.border,
                            borderWidth:     isActive ? '2px' : '1px',
                            color:           theme.text,
                          }}
                        >
                          <span>{f.label}</span>
                          <span className="text-[10px] opacity-60">{f.preview}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.textMuted }}>
                      Size
                    </p>
                    <span className="text-xs font-mono font-medium" style={{ color: theme.text }}>
                      {Math.round(settings.fontScale * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => settings.setFontScale(settings.fontScale - 0.05)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors active:scale-95"
                      style={{ backgroundColor: theme.hoverBg, color: theme.text }}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ backgroundColor: theme.hoverBg }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.max(0, ((settings.fontScale - 0.8) / 0.8) * 100))}%`,
                          backgroundColor: theme.accent,
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => settings.setFontScale(settings.fontScale + 0.05)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors active:scale-95"
                      style={{ backgroundColor: theme.hoverBg, color: theme.text }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Line Height */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.textMuted }}>
                      Line Spacing
                    </p>
                    <span className="text-xs font-mono font-medium" style={{ color: theme.text }}>
                      {settings.lineHeight.toFixed(1)}×
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => settings.setLineHeight(settings.lineHeight - 0.1)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors active:scale-95"
                      style={{ backgroundColor: theme.hoverBg, color: theme.text }}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ backgroundColor: theme.hoverBg }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.max(0, ((settings.lineHeight - 1.3) / 0.9) * 100))}%`,
                          backgroundColor: theme.accent,
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => settings.setLineHeight(settings.lineHeight + 0.1)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors active:scale-95"
                      style={{ backgroundColor: theme.hoverBg, color: theme.text }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Text Alignment & Desktop Column Width */}
                <div className="pt-1 border-t grid grid-cols-2 gap-3" style={{ borderColor: theme.border }}>
                  {/* Alignment */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>
                      Align
                    </p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => settings.setTextAlign('left')}
                        className="flex-1 py-1.5 rounded-lg flex items-center justify-center border transition-all active:scale-95"
                        style={{
                          backgroundColor: settings.textAlign === 'left' ? theme.hoverBg : 'transparent',
                          borderColor:     settings.textAlign === 'left' ? theme.accent : theme.border,
                          color:           theme.text,
                        }}
                        title="Align Left"
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => settings.setTextAlign('justify')}
                        className="flex-1 py-1.5 rounded-lg flex items-center justify-center border transition-all active:scale-95"
                        style={{
                          backgroundColor: settings.textAlign === 'justify' ? theme.hoverBg : 'transparent',
                          borderColor:     settings.textAlign === 'justify' ? theme.accent : theme.border,
                          color:           theme.text,
                        }}
                        title="Justify Text"
                      >
                        <AlignJustify className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Desktop Width */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>
                      Width
                    </p>
                    <div className="flex gap-1">
                      {widths.map((w) => {
                        const isActive = settings.maxWidth === w.value;
                        return (
                          <button
                            key={w.value}
                            type="button"
                            onClick={() => settings.setMaxWidth(w.value)}
                            className="flex-1 py-1 rounded-lg text-[10px] font-medium border transition-all active:scale-95"
                            style={{
                              backgroundColor: isActive ? theme.hoverBg : 'transparent',
                              borderColor:     isActive ? theme.accent : theme.border,
                              color:           theme.text,
                            }}
                          >
                            {w.label[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── MOBILE SETTINGS BOTTOM SHEET (< md) ────────────────────────────── */}
      {showSettings && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end animate-fadeIn">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setShowSettings(false)}
          />

          {/* Bottom Sheet Modal Container */}
          <div
            ref={mobileSheetRef}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full rounded-t-3xl border-t p-5 pt-3 space-y-4 max-h-[85vh] overflow-y-auto pb-safe shadow-2xl"
            style={{
              backgroundColor: theme.surface,
              borderColor:     theme.border,
              color:           theme.text,
            }}
          >
            {/* Grab bar handle */}
            <div className="w-10 h-1 rounded-full mx-auto mb-3 opacity-40 bg-current" />

            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" style={{ color: theme.accent }} />
                <h3 className="text-sm font-semibold">Reading Appearance</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors active:scale-95"
                style={{ backgroundColor: theme.hoverBg, color: theme.text }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Theme Selector */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>
                Theme
              </p>
              <div className="grid grid-cols-4 gap-2">
                {themes.map((t) => {
                  const isActive = settings.readerTheme === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        settings.setReaderTheme(t.value);
                      }}
                      className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-2xl text-xs font-medium border transition-all active:scale-95"
                      style={{
                        backgroundColor: t.previewBg,
                        borderColor:     isActive ? theme.accent : theme.border,
                        borderWidth:     isActive ? '2px' : '1px',
                        color:           t.previewText,
                      }}
                    >
                      {t.icon}
                      <span className="text-[11px]">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Family */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>
                Font
              </p>
              <div className="grid grid-cols-2 gap-2">
                {fonts.map((f) => {
                  const isActive = settings.fontFamily === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        settings.setFontFamily(f.value);
                      }}
                      className={`py-2.5 px-3 rounded-2xl text-xs font-medium border transition-all active:scale-95 flex items-center justify-between ${
                        f.value === 'serif' ? 'font-serif' : 'font-sans'
                      }`}
                      style={{
                        backgroundColor: isActive ? theme.hoverBg : 'transparent',
                        borderColor:     isActive ? theme.accent : theme.border,
                        borderWidth:     isActive ? '2px' : '1px',
                        color:           theme.text,
                      }}
                    >
                      <span>{f.label}</span>
                      <span className="text-[10px] opacity-60">{f.preview}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.textMuted }}>
                  Text Size
                </p>
                <span className="text-xs font-mono font-medium" style={{ color: theme.text }}>
                  {Math.round(settings.fontScale * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    settings.setFontScale(settings.fontScale - 0.05);
                  }}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center transition-colors active:scale-95"
                  style={{ backgroundColor: theme.hoverBg, color: theme.text }}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex-1 rounded-full h-2.5 overflow-hidden" style={{ backgroundColor: theme.hoverBg }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(0, ((settings.fontScale - 0.8) / 0.8) * 100))}%`,
                      backgroundColor: theme.accent,
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    settings.setFontScale(settings.fontScale + 0.05);
                  }}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center transition-colors active:scale-95"
                  style={{ backgroundColor: theme.hoverBg, color: theme.text }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Line Height */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.textMuted }}>
                  Line Spacing
                </p>
                <span className="text-xs font-mono font-medium" style={{ color: theme.text }}>
                  {settings.lineHeight.toFixed(1)}×
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    settings.setLineHeight(settings.lineHeight - 0.1);
                  }}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center transition-colors active:scale-95"
                  style={{ backgroundColor: theme.hoverBg, color: theme.text }}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex-1 rounded-full h-2.5 overflow-hidden" style={{ backgroundColor: theme.hoverBg }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(0, ((settings.lineHeight - 1.3) / 0.9) * 100))}%`,
                      backgroundColor: theme.accent,
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    settings.setLineHeight(settings.lineHeight + 0.1);
                  }}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center transition-colors active:scale-95"
                  style={{ backgroundColor: theme.hoverBg, color: theme.text }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Text Alignment */}
            <div className="pt-2 border-t" style={{ borderColor: theme.border }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>
                Alignment
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    settings.setTextAlign('left');
                  }}
                  className="py-2.5 px-3 rounded-2xl text-xs font-medium border transition-all active:scale-95 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: settings.textAlign === 'left' ? theme.hoverBg : 'transparent',
                    borderColor:     settings.textAlign === 'left' ? theme.accent : theme.border,
                    color:           theme.text,
                  }}
                >
                  <AlignLeft className="w-4 h-4" />
                  <span>Left Aligned</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    settings.setTextAlign('justify');
                  }}
                  className="py-2.5 px-3 rounded-2xl text-xs font-medium border transition-all active:scale-95 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: settings.textAlign === 'justify' ? theme.hoverBg : 'transparent',
                    borderColor:     settings.textAlign === 'justify' ? theme.accent : theme.border,
                    color:           theme.text,
                  }}
                >
                  <AlignJustify className="w-4 h-4" />
                  <span>Justified</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
