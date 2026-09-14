import React, { useState } from 'react';
import { useReviews } from '../hooks/useReviews.js';
import { RatingOverview } from './RatingOverview.js';
import { UserReviewForm } from './UserReviewForm.js';
import { ReviewList } from './ReviewList.js';
import { Loader2, AlertCircle } from 'lucide-react';
import type { ReviewInput } from '@arcanium/types';

interface ReviewSectionProps {
  slug: string;
  contentId: string;
  isAuthenticated: boolean;
  userId?: string;
}

/**
 * ReviewSection — main review container
 * Displays: aggregate rating, user's review form (if auth), reviews list with pagination
 */
export function ReviewSection({
  slug,
  contentId,
  isAuthenticated,
  userId,
}: ReviewSectionProps) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<'helpful' | 'recent' | 'highest' | 'lowest'>('helpful');
  const {
    reviews,
    aggregate,
    userReview,
    pagination,
    isLoading,
    error,
    createOrUpdate,
    deleteReview,
    echo,
  } = useReviews(slug, page, sort);

  const handleSubmitReview = (rating: number, reviewText: string | null) => {
    const input: ReviewInput = { rating, reviewText: reviewText ?? undefined };
    createOrUpdate.mutate(input);
  };

  const handleDeleteReview = () => {
    if (confirm('Are you sure you want to delete your review?')) {
      deleteReview.mutate();
    }
  };

  const handleEcho = (reviewId: string) => {
    if (!isAuthenticated) {
      // Redirect to login or show prompt
      alert('Please sign in to echo reviews');
      return;
    }
    echo.mutate(reviewId);
  };

  const handleLoadMore = () => {
    setPage((p) => p + 1);
  };

  if (!aggregate) {
    return (
      <section id="reviews" className="mt-8 border-t pt-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Reader Reviews</h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </section>
    );
  }

  return (
    <section id="reviews" className="mt-8 border-t pt-6">
      {/* Section Title */}
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Reader Reviews</h2>

      {/* Rating Overview */}
      <RatingOverview aggregate={aggregate} />

      {/* User Review Form (if authenticated) */}
      {isAuthenticated && (
        <UserReviewForm
          userReview={userReview as any}
          onSubmit={handleSubmitReview}
          {...(userReview && { onDelete: handleDeleteReview })}
          isLoading={createOrUpdate.isPending || deleteReview.isPending}
        />
      )}

      {/* Sort Controls */}
      <div className="mb-4 flex items-center gap-3">
        <label
          htmlFor="sortSelect"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Sort by:
        </label>
        <select
          id="sortSelect"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as typeof sort);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="helpful">Most Helpful</option>
          <option value="recent">Most Recent</option>
          <option value="highest">Highest Rated</option>
          <option value="lowest">Lowest Rated</option>
        </select>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-900 dark:text-red-200">Failed to load reviews</h4>
            <p className="text-sm text-red-800 dark:text-red-300">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
          </div>
        </div>
      )}

      {/* Review List */}
      <ReviewList
        reviews={reviews}
        userReviewId={userId}
        onEcho={handleEcho}
        onLoadMore={handleLoadMore}
        isLoading={isLoading || echo.isPending}
        hasMore={pagination?.hasMore ?? false}
        error={error}
      />
    </section>
  );
}
