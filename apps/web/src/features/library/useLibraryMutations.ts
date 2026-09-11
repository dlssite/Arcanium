import { useMutation, useQueryClient } from '@tanstack/react-query';
import { libraryApi } from '@arcanium/api-client';
import type { UpsertProgressInput, LibraryResponse, LibraryEntry } from '@arcanium/types';
import { LIBRARY_KEYS } from './queryKeys';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal optimistic LibraryEntry so the UI updates instantly. */
function buildOptimisticEntry(
  contentId: string,
  shelfEntryId: string,
  content: LibraryEntry['content'],
): LibraryEntry {
  return {
    shelfEntryId,
    addedAt: new Date().toISOString(),
    note: null,
    sortOrder: 0,
    content,
    progress: null,
  };
}

// ---------------------------------------------------------------------------
// Add to shelf mutation — optimistic insert
// ---------------------------------------------------------------------------

export function useAddToShelfMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shelfId,
      contentId,
    }: {
      shelfId:   string;
      contentId: string;
      // content is only used by onMutate for the optimistic update
      content?:  LibraryEntry['content'];
    }) => libraryApi.addToShelf(shelfId, { contentId }),

    onMutate: async ({ shelfId, contentId, content }) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: LIBRARY_KEYS.shelves });

      const previous = queryClient.getQueryData<LibraryResponse>(LIBRARY_KEYS.shelves);

      if (content) {
        queryClient.setQueryData<LibraryResponse>(LIBRARY_KEYS.shelves, (old) => {
          if (!old) return old;
          // Optimistic shelfEntryId — replaced with the real one after the refetch
          const optimisticEntry = buildOptimisticEntry(
            contentId,
            `optimistic-${contentId}`,
            content,
          );
          return {
            shelves: old.shelves.map((shelf) => {
              if (shelf.id !== shelfId) return shelf;
              // Don't add a duplicate if it's somehow already there
              if (shelf.entries.some((e) => e.content.id === contentId)) return shelf;
              return { ...shelf, entries: [...shelf.entries, optimisticEntry] };
            }),
          };
        });
      }

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(LIBRARY_KEYS.shelves, context.previous);
      }
    },

    onSettled: () => {
      // Sync with server after optimistic update (or on error recovery)
      void queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Remove from shelf mutation — optimistic delete
// ---------------------------------------------------------------------------

export function useRemoveFromShelfMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shelfId,
      contentId,
    }: {
      shelfId:   string;
      contentId: string;
    }) => libraryApi.removeFromShelf(shelfId, contentId),

    onMutate: async ({ shelfId, contentId }) => {
      await queryClient.cancelQueries({ queryKey: LIBRARY_KEYS.shelves });

      const previous = queryClient.getQueryData<LibraryResponse>(LIBRARY_KEYS.shelves);

      queryClient.setQueryData<LibraryResponse>(LIBRARY_KEYS.shelves, (old) => {
        if (!old) return old;
        return {
          shelves: old.shelves.map((shelf) => {
            if (shelf.id !== shelfId) return shelf;
            return {
              ...shelf,
              entries: shelf.entries.filter((e) => e.content.id !== contentId),
            };
          }),
        };
      });

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(LIBRARY_KEYS.shelves, context.previous);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Upsert progress mutation — optimistic update (unchanged)
// ---------------------------------------------------------------------------

export function useProgressMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contentId,
      data,
    }: {
      contentId: string;
      data: UpsertProgressInput;
    }) => libraryApi.upsertProgress(contentId, data),

    onMutate: async ({ contentId, data }) => {
      await queryClient.cancelQueries({ queryKey: LIBRARY_KEYS.shelves });

      const previous = queryClient.getQueryData<LibraryResponse>(LIBRARY_KEYS.shelves);

      queryClient.setQueryData<LibraryResponse>(LIBRARY_KEYS.shelves, (old) => {
        if (!old) return old;
        return {
          shelves: old.shelves.map((shelf) => ({
            ...shelf,
            entries: shelf.entries.map((entry) => {
              if (entry.content.id !== contentId) return entry;
              return {
                ...entry,
                progress: {
                  status: data.status,
                  lastChapterRead:
                    data.lastChapterRead ?? entry.progress?.lastChapterRead ?? null,
                  scrollPosition:
                    data.scrollPosition ?? entry.progress?.scrollPosition ?? null,
                  lastReadAt: new Date().toISOString(),
                  startedAt:
                    entry.progress?.startedAt ?? new Date().toISOString(),
                  completedAt:
                    data.status === 'COMPLETED' ? new Date().toISOString() : null,
                },
              };
            }),
          })),
        };
      });

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(LIBRARY_KEYS.shelves, context.previous);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: LIBRARY_KEYS.all });
    },
  });
}
