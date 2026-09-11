/**
 * useCreatorChapters
 *
 * Manages chapters for a single creator-owned content item.
 * Wraps all chapter endpoints: list, create, update, publish, delete.
 *
 * Constitution §8.1 — TanStack Query for all server state.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { creatorApi } from '@arcanium/api-client';
import type { CreateChapterInput, UpdateChapterInput, CreatorChapterSummary } from '@arcanium/types';
import { CREATOR_WORKS_KEY } from './useCreatorWorks';

export function creatorChaptersKey(contentId: string) {
  return ['creator', 'chapters', contentId] as const;
}

export function useCreatorChapters(contentId: string) {
  const queryClient = useQueryClient();
  const key = creatorChaptersKey(contentId);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: key });
    // Also refresh works list so chapterCount pill stays in sync
    queryClient.invalidateQueries({ queryKey: CREATOR_WORKS_KEY });
  };

  const query = useQuery<CreatorChapterSummary[]>({
    queryKey: key,
    queryFn: async () => {
      const res = await creatorApi.listChapters(contentId);
      if (res.error) throw new Error(res.error.message);
      return (res.data ?? []) as CreatorChapterSummary[];
    },
    enabled: Boolean(contentId),
    staleTime: 1000 * 60,
  });

  const createMutation = useMutation({
    mutationFn: (body: CreateChapterInput) => creatorApi.createChapter(contentId, body),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ chapterId, body }: { chapterId: string; body: UpdateChapterInput }) =>
      creatorApi.updateChapter(contentId, chapterId, body),
    onSuccess: invalidate,
  });

  const publishMutation = useMutation({
    mutationFn: (chapterId: string) => creatorApi.publishChapter(contentId, chapterId),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (chapterId: string) => creatorApi.deleteChapter(contentId, chapterId),
    onSuccess: invalidate,
  });

  const publishedCount = query.data?.filter((c) => c.isPublished).length ?? 0;
  const draftCount     = query.data?.filter((c) => c.isDraft).length ?? 0;

  return {
    chapters:       query.data ?? [],
    isLoading:      query.isLoading,
    isError:        query.isError,
    publishedCount,
    draftCount,
    createChapter:  createMutation.mutate,
    createAsync:    createMutation.mutateAsync,
    isCreating:     createMutation.isPending,
    updateChapter:  updateMutation.mutate,
    updateAsync:    updateMutation.mutateAsync,
    isUpdating:     updateMutation.isPending,
    publishChapter: publishMutation.mutate,
    publishAsync:   publishMutation.mutateAsync,
    isPublishing:   publishMutation.isPending,
    deleteChapter:  deleteMutation.mutate,
    isDeleting:     deleteMutation.isPending,
  };
}
