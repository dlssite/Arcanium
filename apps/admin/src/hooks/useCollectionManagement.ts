import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type CollectionSummary, type CollectionEntry, type CollectionInput } from '@arcanium/api-client';
import { useAdminAuthStore } from '../stores/useAdminAuthStore';

export type { CollectionSummary, CollectionEntry, CollectionInput };

export function useCollectionManagement() {
  const queryClient     = useQueryClient();
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);

  // ── Collection list ───────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey:  ['admin', 'collections'],
    enabled:   isAuthenticated,
    queryFn:   () => adminApi.listCollections(),
    staleTime: 30_000,
  });

  const collections: CollectionSummary[] = data?.data ?? [];

  // ── Entries for selected collection ──────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const entriesQuery = useQuery({
    queryKey:  ['admin', 'collection-entries', selectedId],
    enabled:   isAuthenticated && !!selectedId,
    queryFn:   () => adminApi.listCollectionEntries(selectedId!),
    staleTime: 15_000,
  });

  const entries: CollectionEntry[] = entriesQuery.data?.data ?? [];

  // ── CRUD mutations ────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (body: CollectionInput) => adminApi.createCollection(body),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['admin', 'collections'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CollectionInput> }) =>
      adminApi.updateCollection(id, body),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['admin', 'collections'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteCollection(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'collections'] });
      if (selectedId === deleteMutation.variables) setSelectedId(null);
    },
  });

  // ── Entry mutations ───────────────────────────────────────────────────────
  const addEntryMutation = useMutation({
    mutationFn: ({ collectionId, contentId }: { collectionId: string; contentId: string }) =>
      adminApi.addCollectionEntry(collectionId, contentId),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'collection-entries', vars.collectionId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'collections'] });
    },
  });

  const removeEntryMutation = useMutation({
    mutationFn: ({ collectionId, entryId }: { collectionId: string; entryId: string }) =>
      adminApi.removeCollectionEntry(collectionId, entryId),
    onSuccess: (_d, vars) =>
      queryClient.invalidateQueries({ queryKey: ['admin', 'collection-entries', vars.collectionId] }),
  });

  return {
    collections,
    isLoading,
    isError,
    selectedId,
    setSelectedId,
    entries,
    entriesLoading: entriesQuery.isLoading,

    createCollection: (body: CollectionInput) => createMutation.mutateAsync(body),
    updateCollection: (id: string, body: Partial<CollectionInput>) =>
      updateMutation.mutateAsync({ id, body }),
    deleteCollection: (id: string) => deleteMutation.mutateAsync(id),

    addEntry:    (collectionId: string, contentId: string) =>
      addEntryMutation.mutateAsync({ collectionId, contentId }),
    removeEntry: (collectionId: string, entryId: string) =>
      removeEntryMutation.mutateAsync({ collectionId, entryId }),

    isCreating:       createMutation.isPending,
    isUpdating:       updateMutation.isPending,
    isDeleting:       deleteMutation.isPending,
    isAddingEntry:    addEntryMutation.isPending,
    isRemovingEntry:  removeEntryMutation.isPending,
  };
}
