/**
 * useReader — orchestrates chapter fetching, progress tracking, and offline caching.
 *
 * Offline-first strategy (Constitution §8.2, P4):
 *   1. Check IndexedDB first — serve instantly if cached
 *   2. Fetch from API if not cached
 *   3. Store in IndexedDB after fetch
 *   4. Pre-fetch next 2 chapters in background
 *
 * Progress syncing:
 *   - Scroll position saved to IndexedDB every 5 seconds (debounced)
 *   - On chapter completion: PUT /api/v1/library/progress/:contentId
 *   - Optimistic: progress bar updates instantly before server confirms
 *
 * L2 fix: image-type detection now uses chapter.contentMode === 'image'
 * instead of the fragile bodyText.trimStart().startsWith('[') heuristic.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contentApi, libraryApi, apiClient } from '@arcanium/api-client';
import { useAuthStore } from '../auth/store/useAuthStore';
import type { ChapterDetail } from '@arcanium/types';
import { READER_KEYS } from './queryKeys';

// Wire token getter (idempotent)
apiClient.setTokenGetter(() => useAuthStore.getState().accessToken);

// ---------------------------------------------------------------------------
// IndexedDB helpers (no external library needed — raw IDB API)
// ---------------------------------------------------------------------------

const DB_NAME      = 'arcanium-reader';
const DB_VERSION   = 1;
const CHAPTER_STORE  = 'chapters';
const PROGRESS_STORE = 'progress';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CHAPTER_STORE)) {
        db.createObjectStore(CHAPTER_STORE);
      }
      if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
        db.createObjectStore(PROGRESS_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror   = () => reject(req.error);
  });
}

async function idbPut(store: string, key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Main hook
// ---------------------------------------------------------------------------

interface UseReaderOptions {
  slug:          string;
  chapterNumber: number;
}

interface UseReaderReturn {
  chapter:          ChapterDetail | null;
  isLoading:        boolean;
  isFetching:       boolean;      // true while background re-fetching
  isFetchingBody:   boolean;      // true when API returned 202 (scraper in progress)
  error:            string | null;
  scrollPosition:   number;       // 0–1 progress through the chapter
  setScrollPosition: (pos: number) => void;
  markCompleted:    () => void;
}

export function useReader({ slug, chapterNumber }: UseReaderOptions): UseReaderReturn {
  const queryClient = useQueryClient();
  const [scrollPosition, setScrollPositionState] = useState(0);
  const [isFetchingBody, setIsFetchingBody]       = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cacheKey = `${slug}:${chapterNumber}`;

  // ---------------------------------------------------------------------------
  // TanStack Query — IndexedDB cache check in queryFn
  // ---------------------------------------------------------------------------

  const { data: chapter, isLoading, isFetching, error } = useQuery<ChapterDetail>({
    queryKey: READER_KEYS.chapter(slug, chapterNumber),
    queryFn: async () => {
      const cached = await idbGet<ChapterDetail>(CHAPTER_STORE, cacheKey);

      // L2 fix: use contentMode to decide whether the cache is usable.
      // Image chapters (contentMode === 'image') are never served from cache —
      // CDN URLs expire in ~15 min. Text chapters are served from IDB.
      const cachedIsImage = cached?.contentMode === 'image';
      if (cached?.bodyText && !cachedIsImage) return cached;

      // Fetch from API
      const res = await contentApi.getChapter(slug, chapterNumber);

      // Handle 202 — scraper is still fetching body in the background
      if ((res as { data: { status?: string } }).data?.status === 'fetching') {
        setIsFetchingBody(true);
        throw new Error('FETCHING');
      }
      setIsFetchingBody(false);

      if (res.error) throw new Error(res.error.message);

      const data = res.data;

      // L2 fix: only write to IndexedDB for text chapters — never cache image URL arrays
      if (data.contentMode !== 'image') {
        await idbPut(CHAPTER_STORE, cacheKey, data);
      }

      // Pre-fetch next chapters in background — text only
      if (data.contentMode !== 'image' && data.nextChapter != null) {
        void prefetchChapter(slug, data.nextChapter, queryClient);
      }

      return data;
    },
    retry: (failureCount, err) => {
      if ((err as Error).message === 'FETCHING') return failureCount < 6;
      return false;
    },
    retryDelay: 5000,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 10, // evict image chapters before CDN URLs expire at ~15 min
  });

  // ---------------------------------------------------------------------------
  // Progress tracking — debounced save to IndexedDB + API sync
  // ---------------------------------------------------------------------------

  // Derive contentId from loaded chapter data
  const contentId = chapter?.content.id;

  const progressMutation = useMutation({
    mutationFn: async (data: { status: string; lastChapterRead?: number; scrollPosition?: number }) => {
      if (!contentId) return;
      const res = await libraryApi.upsertProgress(contentId, data as Parameters<typeof libraryApi.upsertProgress>[1]);
      if (res.error) throw new Error(res.error.message);
    },
  });

  const setScrollPosition = useCallback((pos: number) => {
    setScrollPositionState(pos);

    // Guard: only track progress if we have a valid contentId from the loaded chapter
    if (!contentId) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void idbPut(PROGRESS_STORE, `${contentId}:scroll`, { scrollPosition: pos, chapterNumber });
      progressMutation.mutate({ status: 'READING', scrollPosition: pos, lastChapterRead: chapterNumber });
    }, 5000);
  }, [contentId, chapterNumber, progressMutation]);

  const markCompleted = useCallback(() => {
    // Guard: only mark completed if we have a valid contentId
    if (!contentId) return;
    
    progressMutation.mutate({
      status:          'COMPLETED',
      lastChapterRead: chapterNumber,
      scrollPosition:  1,
    });
  }, [progressMutation, chapterNumber]);

  // Restore saved scroll position on chapter load
  useEffect(() => {
    if (!contentId) return;
    idbGet<{ scrollPosition: number }>(PROGRESS_STORE, `${contentId}:scroll`).then((saved) => {
      if (saved?.scrollPosition) setScrollPositionState(saved.scrollPosition);
    });
  }, [contentId, chapterNumber]);

  // Cleanup debounce timer on unmount
  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  return {
    chapter:           chapter ?? null,
    isLoading,
    isFetching,
    isFetchingBody,
    error: error
      ? (error as Error).message === 'FETCHING' ? null : (error as Error).message
      : null,
    scrollPosition,
    setScrollPosition,
    markCompleted,
  };
}

// ---------------------------------------------------------------------------
// Background pre-fetch — warms IndexedDB for next text chapters
// ---------------------------------------------------------------------------

async function prefetchChapter(
  slug:         string,
  number:       number,
  queryClient:  ReturnType<typeof useQueryClient>,
): Promise<void> {
  const key    = `${slug}:${number}`;
  const cached = await idbGet<ChapterDetail>(CHAPTER_STORE, key);
  if (cached?.bodyText) return;

  void queryClient.prefetchQuery({
    queryKey: READER_KEYS.chapter(slug, number),
    queryFn: async () => {
      const res = await contentApi.getChapter(slug, number);
      if (res.error || (res as { data: { status?: string } }).data?.status === 'fetching') {
        return null;
      }
      // L2 fix: only cache text chapters
      if (res.data.contentMode !== 'image') {
        await idbPut(CHAPTER_STORE, key, res.data);
      }
      return res.data;
    },
    staleTime: Infinity,
  });
}
