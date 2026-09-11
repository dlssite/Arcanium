/**
 * useReaderSettings — persisted reader preferences.
 *
 * Font scale, reader theme, line height, font family, content width, and
 * text alignment are persisted to localStorage via Zustand persist middleware
 * so they survive page reloads and cross-session usage.
 *
 * These settings are intentionally separate from the app theme (light/dark)
 * so a user can keep the app in dark mode but read in sepia or OLED black.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ReaderTheme = 'light' | 'sepia' | 'dark' | 'oled';
export type FontFamily = 'serif' | 'sans';
export type ReaderMaxWidth = 'compact' | 'normal' | 'wide';
export type ReaderTextAlign = 'left' | 'justify';

interface ReaderSettings {
  fontScale: number;          // 0.8 – 1.6
  readerTheme: ReaderTheme;
  lineHeight: number;         // 1.3 – 2.2
  fontFamily: FontFamily;
  maxWidth: ReaderMaxWidth;
  textAlign: ReaderTextAlign;

  setFontScale: (v: number) => void;
  setReaderTheme: (v: ReaderTheme) => void;
  setLineHeight: (v: number) => void;
  setFontFamily: (v: FontFamily) => void;
  setMaxWidth: (v: ReaderMaxWidth) => void;
  setTextAlign: (v: ReaderTextAlign) => void;
  resetSettings: () => void;
}

const DEFAULTS = {
  fontScale:   1.05,
  readerTheme: 'light' as ReaderTheme,
  lineHeight:  1.75,
  fontFamily:  'serif' as FontFamily,
  maxWidth:    'normal' as ReaderMaxWidth,
  textAlign:   'left' as ReaderTextAlign,
};

export const useReaderSettings = create<ReaderSettings>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setFontScale:   (fontScale)   => set({ fontScale: Math.min(1.6, Math.max(0.8, Math.round(fontScale * 100) / 100)) }),
      setReaderTheme: (readerTheme) => set({ readerTheme }),
      setLineHeight:  (lineHeight)  => set({ lineHeight: Math.min(2.2, Math.max(1.3, Math.round(lineHeight * 10) / 10)) }),
      setFontFamily:  (fontFamily)  => set({ fontFamily }),
      setMaxWidth:    (maxWidth)    => set({ maxWidth }),
      setTextAlign:   (textAlign)   => set({ textAlign }),
      resetSettings:  ()            => set(DEFAULTS),
    }),
    { name: 'arcanium-reader-settings' },
  ),
);

// ---------------------------------------------------------------------------
// CSS theme configuration helpers
// ---------------------------------------------------------------------------

export interface ReaderThemeStyle {
  id: ReaderTheme;
  name: string;
  bg: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  hoverBg: string;
  activeBg: string;
  progressBar: string;
  rootClass: string;
}

export const READER_THEMES: Record<ReaderTheme, ReaderThemeStyle> = {
  light: {
    id: 'light',
    name: 'Paper',
    bg: '#FAF8F5',
    surface: '#FFFFFF',
    border: '#EAE4DC',
    text: '#221D28',
    textMuted: '#786F84',
    accent: '#433258',
    accentText: '#FFFFFF',
    hoverBg: '#F0ECE4',
    activeBg: '#E7E1D6',
    progressBar: '#433258',
    rootClass: 'bg-[#FAF8F5] text-[#221D28]',
  },
  sepia: {
    id: 'sepia',
    name: 'Parchment',
    bg: '#F5EEDB',
    surface: '#EFE5CF',
    border: '#DECFA9',
    text: '#3D3020',
    textMuted: '#7B6950',
    accent: '#7D5528',
    accentText: '#FFFFFF',
    hoverBg: '#E8DCBF',
    activeBg: '#DDD0AF',
    progressBar: '#8A602F',
    rootClass: 'bg-[#F5EEDB] text-[#3D3020]',
  },
  dark: {
    id: 'dark',
    name: 'Velvet',
    bg: '#171320',
    surface: '#221C30',
    border: '#322944',
    text: '#E8E2F0',
    textMuted: '#9E92B0',
    accent: '#9B7BBF',
    accentText: '#171320',
    hoverBg: '#2D2540',
    activeBg: '#3A2F52',
    progressBar: '#9B7BBF',
    rootClass: 'bg-[#171320] text-[#E8E2F0]',
  },
  oled: {
    id: 'oled',
    name: 'OLED',
    bg: '#000000',
    surface: '#111111',
    border: '#242424',
    text: '#DEDEDE',
    textMuted: '#7A7A7A',
    accent: '#E6E6E6',
    accentText: '#000000',
    hoverBg: '#1A1A1A',
    activeBg: '#282828',
    progressBar: '#E6E6E6',
    rootClass: 'bg-[#000000] text-[#DEDEDE]',
  },
};

export function readerThemeClasses(theme: ReaderTheme): string {
  return READER_THEMES[theme]?.rootClass ?? READER_THEMES.light.rootClass;
}

export function readerMaxWidthClass(maxWidth: ReaderMaxWidth): string {
  switch (maxWidth) {
    case 'compact':
      return 'max-w-xl';
    case 'wide':
      return 'max-w-4xl';
    case 'normal':
    default:
      return 'max-w-2xl';
  }
}
