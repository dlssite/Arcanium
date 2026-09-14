import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewApi } from '@arcanium/api-client';
import type { ReviewInput, ReviewQuery, ReviewListResponse } from '@arcanium/types';

/**
 * useReviews — manage reviews for a book
 * Fetches paginated reviews with sorting, handles create/update/delete/echo mutations
 * Uses optimistic updates for echo actions
 */
export function useReviews(slug: string, page = 1, sort: ReviewQuery['sort'] = 'helpful') {
  const queryClient = useQueryClient();
  const queryKey = ['reviews', slug, page, sort];

  const query = useQuery({
    queryKey,
    queryFn: () => reviewApi.list(slug, { page, limit: 10, sort }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Create or update review
  const createOrUpdate = useMutation({
    mutationFn: (input: ReviewInput) => reviewApi.createOrUpdate(slug, input),
    onSuccess: () => {
      // Invalidate reviews for this book (all pages)
      queryClient.invalidateQueries({ queryKey: ['reviews', slug] });
      // Invalidate content detail (to update aggregate rating)
      queryClient.invalidateQueries({ queryKey: ['content', slug] });
    },
  });

  // Delete review
  const deleteReview = useMutation({
    mutationFn: () => reviewApi.delete(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', slug] });
      queryClient.invalidateQueries({ queryKey: ['content', slug] });
    },
  });

  // Echo/unlike review
  const echo = useMutation({
    mutationFn: (reviewId: string) => reviewApi.toggleEcho(reviewId),
    onMutate: async (reviewId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previous = queryClient.getQueryData<ReviewListResponse>(queryKey);

      // Optimistically update
      if (previous) {
        queryClient.setQueryData<ReviewListResponse>(queryKey, (old) => {
          if (!old) return old;

          return {
            ...old,
            reviews: old.reviews.map((r) =>
              r.id === reviewId
                ? {
                    ...r,
                    hasEchoed: !r.hasEchoed,
                    echoCount: r.echoCount + (r.hasEchoed ? -1 : 1),
                  }
                : r,
            ),
          };
        });
      }

      return { previous };
    },
    onError: (_err, _reviewId, context) => {
      // Revert on error
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    // Query state
    reviews: (query.data?.data as any)?.reviews ?? [],
    aggregate: (query.data?.data as any)?.aggregate,
    userReview: (query.data?.data as any)?.userReview,
    pagination: (query.data?.data as any)?.pagination,
    isLoading: query.isLoading,
    error: query.error,

    // Mutations
    createOrUpdate,
    deleteReview,
    echo,

    // Refetch
    refetch: query.refetch,
  };
}
