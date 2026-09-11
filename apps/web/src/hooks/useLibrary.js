/**
 * @fileoverview useLibrary — primary hook for library data and mutations.
 *
 * Track A upgrade: data now comes from GET /api/v1/library via TanStack Query.
 * The return shape is IDENTICAL to the Phase 1 mock version so zero component
 * changes are needed.
 *
 * Phase 1 (mock):  data from useLibraryStore → MOCK_LIBRARY_BOOKS
 * Track A (real):  data from useLibraryQuery → GET /api/v1/library
 *
 * Mutations (addBook, removeBook, updateProgress) now call the API and
 * invalidate the TanStack Query cache, which triggers a re-fetch.
 *
 * Constitution refs: §4.2 (hooks as component-facing API), §8.1 (TanStack Query for server state)
 */

import { useCallback } from 'react';
import { useLibraryStore } from '../stores/useLibraryStore.js';
import {
  useLibraryQuery,
  toLibraryBooks,
  toCurrentlyReading,
} from '../features/library/useLibraryQuery.ts';
import {
  useAddToShelfMutation,
  useRemoveFromShelfMutation,
  useProgressMutation,
} from '../features/library/useLibraryMutations.ts';

/**
 * @returns {{
 *   libraryBooks:        object[],
 *   currentlyReading:    object|null,
 *   filteredBooks:       object[],
 *   filterCounts:        Record<string, number>,
 *   activeFilter:        string,
 *   isLoading:           boolean,
 *   isInLibrary:         (id: string) => boolean,
 *   getDefaultShelfId:   () => string|null,
 *   setFilter:           (tab: string) => void,
 *   addBook:             (book: object) => void,
 *   removeBook:          (bookId: string) => void,
 *   updateProgress:      (bookId: string, progress: number, timeHint?: string) => void,
 * }}
 */
export function useLibrary() {
  // ── Server state (TanStack Query) ─────────────────────────────────────────
  const { data, isLoading } = useLibraryQuery();
  const libraryBooks = toLibraryBooks(data);
  const currentlyReading = toCurrentlyReading(data);

  // ── UI state (Zustand — activeFilter only) ────────────────────────────────
  const { activeFilter, setActiveFilter } = useLibraryStore();

  // ── Mutations ─────────────────────────────────────────────────────────────
  const addMutation = useAddToShelfMutation();
  const removeMutation = useRemoveFromShelfMutation();
  const progressMutation = useProgressMutation();

  // ── Derived: filter counts ────────────────────────────────────────────────
  const filterCounts = {
    All: libraryBooks.length,
    Reading: libraryBooks.filter((b) => b.progress > 0 && b.progress < 100).length,
    Completed: libraryBooks.filter((b) => b.progress === 100).length,
    Saved: libraryBooks.filter((b) => b.status === 'Saved').length,
  };

  // ── Derived: filtered books ───────────────────────────────────────────────
  const filteredBooks = (() => {
    switch (activeFilter) {
      case 'Reading':
        return libraryBooks.filter((b) => b.progress > 0 && b.progress < 100);
      case 'Completed':
        return libraryBooks.filter((b) => b.progress === 100);
      case 'Saved':
        return libraryBooks.filter((b) => b.status === 'Saved');
      default:
        return libraryBooks;
    }
  })();

  // ── Helpers ───────────────────────────────────────────────────────────────

  const isInLibrary = useCallback(
    (bookId) => libraryBooks.some((b) => String(b.id) === String(bookId)),
    [libraryBooks],
  );

  /**
   * Get the ID of the user's default "Plan to Read" shelf.
   * Used by addBook to know which shelf to target.
   */
  const getDefaultShelfId = useCallback(() => {
    if (!data) return null;
    const shelf = data.shelves.find((s) => s.name === 'Plan to Read');
    return shelf?.id ?? null;
  }, [data]);

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Add a book to the user's "Plan to Read" shelf.
   * Passes the full content object so the mutation can optimistically
   * insert the entry into the cache before the server responds.
   * @param {{ id: string, title?: string, author?: string, coverImageUrl?: string, [key: string]: any }} book
   */
  const addBook = useCallback(
    (book) => {
      const shelfId = getDefaultShelfId();
      if (!shelfId) return;

      // Build a minimal content shape for the optimistic LibraryEntry.
      // Any missing fields are filled with safe defaults — the real data
      // arrives once invalidateQueries fires after onSettled.
      const content = {
        id:            String(book.id),
        title:         book.title         ?? '',
        slug:          book.slug          ?? '',
        author:        book.author        ?? null,
        synopsis:      book.synopsis      ?? null,
        coverImageUrl: book.coverImageUrl ?? book.cover ?? null,
        chapterCount:  book.chapterCount  ?? 0,
        rating:        book.rating        ?? null,
        type:          book.type          ?? 'EBOOK',
        status:        book.status        ?? 'UNKNOWN',
        metadata:      book.metadata      ?? {},
      };

      addMutation.mutate({ shelfId, contentId: String(book.id), content });
    },
    [addMutation, getDefaultShelfId],
  );

  /**
   * Remove a book from all shelves.
   * @param {string} bookId
   */
  const removeBook = useCallback(
    (bookId) => {
      if (!data) return;
      // Remove from every shelf it appears on
      for (const shelf of data.shelves) {
        const entry = shelf.entries.find((e) => e.content.id === String(bookId));
        if (entry) {
          removeMutation.mutate({ shelfId: shelf.id, contentId: String(bookId) });
        }
      }
    },
    [removeMutation, data],
  );

  /**
   * Update reading progress (0–100 percentage).
   * Maps to the progress API: READING / COMPLETED status + chapter fraction.
   * @param {string} bookId
   * @param {number} progress  0–100
   */
  const updateProgress = useCallback(
    (bookId, progress) => {
      const book = libraryBooks.find((b) => String(b.id) === String(bookId));
      if (!book) return;

      const status = progress >= 100 ? 'COMPLETED' : 'READING';
      const chapterCount = data?.shelves
        .flatMap((s) => s.entries)
        .find((e) => e.content.id === String(bookId))?.content.chapterCount;

      const lastChapterRead =
        chapterCount && chapterCount > 0
          ? Math.round((progress / 100) * chapterCount)
          : undefined;

      progressMutation.mutate({
        contentId: String(bookId),
        data: { status, ...(lastChapterRead !== undefined ? { lastChapterRead } : {}) },
      });
    },
    [progressMutation, libraryBooks, data],
  );

  /**
   * Kept for compatibility — moves to a different currently-reading book.
   * Phase 2: will be replaced by a proper "start reading" action.
   */
  const setCurrentlyReading = useCallback(
    (bookId) => {
      updateProgress(bookId, 1); // mark as started
    },
    [updateProgress],
  );

  return {
    // Data
    libraryBooks,
    currentlyReading,
    filteredBooks,
    filterCounts,
    activeFilter,
    isLoading,

    // Predicates
    isInLibrary,
    getDefaultShelfId,

    // UI
    setFilter: setActiveFilter,

    // Mutations
    addBook,
    removeBook,
    updateProgress,
    setCurrentlyReading,
  };
}
