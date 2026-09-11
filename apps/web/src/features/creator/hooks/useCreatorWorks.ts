/**
 * useCreatorWorks
 *
 * Manages the authenticated creator's own content catalogue.
 * Wraps GET /api/v1/creator (list) and POST /api/v1/creator (create).
 *
 * Constitution §8.1 — TanStack Query for all server state.
 * Constitution §4.2 — No raw fetch calls; all calls via @arcanium/api-client.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { creatorApi } from '@arcanium/api-client';
import type { CreateContentInput } from '@arcanium/types';

export const CREATOR_WORKS_KEY = ['creator', 'works'] as const;

export interface CreatorWork {
  id:            string;
  title:         string;
  slug:          string;
  type:          string;
  status:        string;
  author:        string | null;
  coverImageUrl: string | null;
  chapterCount:  number;
  createdAt:     string;
  updatedAt:     string;
}

export function useCreatorWorks() {
  const queryClient = useQueryClient();

  const query = useQuery<CreatorWork[]>({
    queryKey: CREATOR_WORKS_KEY,
    queryFn: async () => {
      const res = await creatorApi.listContent();
      if (res.error) throw new Error(res.error.message);
      return (res.data ?? []) as CreatorWork[];
    },
    staleTime: 1000 * 60 * 2,
  });

  const createMutation = useMutation({
    mutationFn: (body: CreateContentInput) => creatorApi.createContent(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREATOR_WORKS_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ contentId, body }: { contentId: string; body: import('@arcanium/types').UpdateContentInput }) =>
      creatorApi.updateContent(contentId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREATOR_WORKS_KEY });
    },
  });

  // Aggregate stats derived from the works list
  const totalWorks    = query.data?.length ?? 0;
  const totalChapters = query.data?.reduce((s, w) => s + w.chapterCount, 0) ?? 0;

  return {
    works:          query.data ?? [],
    isLoading:      query.isLoading,
    isError:        query.isError,
    refetch:        query.refetch,
    totalWorks,
    totalChapters,
    createWork:     createMutation.mutate,
    createAsync:    createMutation.mutateAsync,
    isCreating:     createMutation.isPending,
    createError:    createMutation.error as Error | null,
    updateWork:     updateMutation.mutate,
    isUpdating:     updateMutation.isPending,
  };
}
