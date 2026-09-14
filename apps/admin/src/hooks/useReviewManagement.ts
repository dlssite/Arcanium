import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminReviewApi } from '@arcanium/api-client';
import { useAdminAuthStore } from '../stores/useAdminAuthStore';
import type { AdminReview, AdminReviewAnalytics } from '@arcanium/types';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useReviewManagement() {
  const queryClient  = useQueryClient();
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);

  // Local filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'lowest' | 'most_echoed'>('recent');
  const [page, setPage] = useState(1);
  const limit = 20;

  // ── Reviews list ──────────────────────────────────────────────────────────
  const reviewsQuery = useQuery({
    queryKey: ['admin', 'reviews', searchQuery, ratingFilter, sortBy, page],
    enabled:  isAuthenticated,
    queryFn:  async () => {
      const res = await adminReviewApi.list({
        page,
        limit,
        sort:   sortBy,
        search: searchQuery.trim() || undefined,
        rating: ratingFilter ? Number(ratingFilter) : undefined,
      });
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    placeholderData: (prev) => prev, // keep stale data while refetching
  });

  // ── Analytics ─────────────────────────────────────────────────────────────
  const analyticsQuery = useQuery({
    queryKey: ['admin', 'reviews', 'analytics'],
    enabled:  isAuthenticated,
    queryFn:  async () => {
      const res = await adminReviewApi.getAnalytics();
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    staleTime: 60_000, // re-fetch analytics at most once per minute
  });

  // ── Delete review ─────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (reviewId: string) => adminReviewApi.delete(reviewId),
    onSuccess: () => {
      // Invalidate both list and analytics so counts update
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
  });

  // ── Filter helpers ────────────────────────────────────────────────────────
  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setPage(1); // reset to first page on new search
  }

  function handleRatingChange(value: string) {
    setRatingFilter(value);
    setPage(1);
  }

  function handleSortChange(value: string) {
    setSortBy(value as 'recent' | 'highest' | 'lowest' | 'most_echoed');
    setPage(1);
  }

  const reviews: AdminReview[]          = reviewsQuery.data?.reviews ?? [];
  const total: number                   = reviewsQuery.data?.total   ?? 0;
  const hasMore: boolean                = reviewsQuery.data?.hasMore ?? false;
  const analytics: AdminReviewAnalytics | undefined = analyticsQuery.data ?? undefined;

  return {
    // Data
    reviews,
    total,
    hasMore,
    analytics,

    // Pagination
    page,
    limit,
    setPage,

    // Filters
    searchQuery,
    ratingFilter,
    sortBy,
    handleSearchChange,
    handleRatingChange,
    handleSortChange,

    // Loading/error states
    isLoading:        reviewsQuery.isLoading,
    isError:          reviewsQuery.isError,
    error:            reviewsQuery.error,
    isAnalyticsLoading: analyticsQuery.isLoading,

    // Mutations
    deleteReview:     deleteMutation.mutate,
    isDeleting:       deleteMutation.isPending,
  };
}
