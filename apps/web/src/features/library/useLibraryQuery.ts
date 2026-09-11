import { useQuery } from '@tanstack/react-query';
import { libraryApi, apiClient } from '@arcanium/api-client';
import { useAuthStore } from '../auth/store/useAuthStore';
import type { LibraryResponse, LibraryEntry } from '@arcanium/types';
import { LIBRARY_KEYS } from './queryKeys';

// Wire token getter once at this boundary
apiClient.setTokenGetter(() => useAuthStore.getState().accessToken);

// ---------------------------------------------------------------------------
// Main library query — fetches all shelves with entries and progress
// ---------------------------------------------------------------------------

export function useLibraryQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<LibraryResponse>({
    queryKey: LIBRARY_KEYS.shelves,
    queryFn: async () => {
      const res = await libraryApi.getLibrary();
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2, // 2 minutes — library changes more often than user profile
  });
}

// ---------------------------------------------------------------------------
// Derived selectors — computed from the raw LibraryResponse
// ---------------------------------------------------------------------------

/**
 * Maps the API's shelf/entry structure into the flat LibraryBook shape that
 * existing components consume via useLibrary(). Keeps components unchanged.
 */
export function toLibraryBooks(data: LibraryResponse | undefined) {
  if (!data) return [];

  // Collect all entries across all shelves, deduplicated by contentId
  // (a title can be on multiple shelves — show it once in the flat list)
  const seen = new Set<string>();
  const books: LibraryBook[] = [];

  for (const shelf of data.shelves) {
    for (const entry of shelf.entries) {
      if (seen.has(entry.content.id)) continue;
      seen.add(entry.content.id);
      books.push(entryToLibraryBook(entry, shelf.name));
    }
  }

  return books;
}

/** Find the first "Reading" shelf entry to use as "currently reading". */
export function toCurrentlyReading(data: LibraryResponse | undefined): LibraryBook | null {
  if (!data) return null;

  const readingShelf = data.shelves.find((s) => s.name === 'Reading');
  if (!readingShelf || readingShelf.entries.length === 0) return null;

  const entry = readingShelf.entries[0];
  if (!entry) return null;
  return entryToLibraryBook(entry, 'Reading');
}

// ---------------------------------------------------------------------------
// Shape adapter — LibraryEntry → LibraryBook (the shape components use)
// ---------------------------------------------------------------------------

/**
 * LibraryBook is the shape existing JSX components already consume.
 * Defined here as a plain interface — no Zod needed, it's purely UI-layer.
 */
export interface LibraryBook {
  id: string;
  title: string;
  author: string | null;
  cover: string | null;       // coverImageUrl from API
  slug: string;               // used by the reader route /read/:slug/:chapter
  progress: number;            // 0–100 derived from progress status/chapter
  readingStatus: string;
  status: string;              // human-readable label
  time: string;                // human-readable hint
  level: string;               // archival level label (Phase 2: from content metadata)
  category: string;
  synopsis: string | null;
  lastChapterRead: number | null;
  lastReadAt: string | null;
  // Extra field for mutations
  contentId: string;
  defaultShelfId?: string;
}

function entryToLibraryBook(entry: LibraryEntry, shelfName: string): LibraryBook {
  const p = entry.progress;

  // Derive a 0–100 progress percentage from available data
  const progress = deriveProgress(entry, shelfName);
  const statusLabel = deriveStatusLabel(shelfName, p?.status);
  const timeHint = deriveTimeHint(p, entry.content.chapterCount);

  return {
    id: entry.content.id,
    contentId: entry.content.id,
    slug: entry.content.slug,
    title: entry.content.title,
    author: entry.content.author,
    cover: entry.content.coverImageUrl,
    progress,
    readingStatus: p?.status ?? 'PLAN_TO_READ',
    status: statusLabel,
    time: timeHint,
    level: deriveLevel(entry.content.metadata),
    category: shelfToCategoryLabel(shelfName),
    synopsis: entry.content.synopsis,
    lastChapterRead: p?.lastChapterRead ?? null,
    lastReadAt: p?.lastReadAt ?? null,
  };
}

function deriveProgress(entry: LibraryEntry, shelfName: string): number {
  const p = entry.progress;
  if (!p) return 0;
  if (p.status === 'COMPLETED') return 100;
  if (shelfName === 'Reading' && p.lastChapterRead && entry.content.chapterCount > 0) {
    return Math.round((p.lastChapterRead / entry.content.chapterCount) * 100);
  }
  if (p.scrollPosition) return Math.round(p.scrollPosition * 100);
  return 0;
}

function deriveStatusLabel(shelfName: string, status?: string): string {
  if (status === 'COMPLETED') return 'Completed';
  if (shelfName === 'Reading') return 'Currently Reading';
  if (shelfName === 'On Hold') return 'On Hold';
  if (shelfName === 'Dropped') return 'Dropped';
  return 'Saved';
}

function deriveTimeHint(
  p: LibraryEntry['progress'],
  chapterCount: number,
): string {
  if (!p) return 'Added to library';
  if (p.status === 'COMPLETED') return 'Completed';
  if (p.lastReadAt) {
    const days = Math.floor(
      (Date.now() - new Date(p.lastReadAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (days === 0) return 'Read today';
    if (days === 1) return 'Read yesterday';
    return `Read ${days} days ago`;
  }
  return 'Not started';
}

function deriveLevel(metadata: Record<string, unknown>): string {
  // Phase 2: map genres/difficulty to archival levels
  // For now return a sensible default
  const genres = metadata['genres'] as string[] | undefined;
  if (!genres || genres.length === 0) return 'L1';
  if (genres.some((g) => ['Philosophy', 'Grimoires'].includes(g))) return 'L4';
  if (genres.some((g) => ['Fantasy', 'Action'].includes(g))) return 'L3';
  return 'L2';
}

function shelfToCategoryLabel(shelfName: string): string {
  const map: Record<string, string> = {
    Reading: 'Reading',
    Completed: 'Completed',
    'On Hold': 'Saved',
    Dropped: 'Saved',
    'Plan to Read': 'Saved',
  };
  return map[shelfName] ?? 'Saved';
}
