import React from 'react';
import { ReviewCard } from './ReviewCard.js';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Review } from '@arcanium/types';

interface ReviewListProps {
  reviews: Review[];
  userReviewId?: string | undefined;
  onEcho: (reviewId: string) => void;
  onDelete?: ((reviewId: string) => void) | undefined;
  onLoadMore?: (() => void) | undefined;
  isLoading?: boolean | undefined;
  hasMore?: boolean | undefined;
  error?: Error | null | undefined;
}

/**
 * ReviewList — display paginated reviews with load more
 */
export function ReviewList({
  reviews,
  userReviewId,
  onEcho,
  onDelete,
  onLoadMore,
  isLoading = false,
  hasMore = false,
  error,
}: ReviewListProps) {
  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-red-900 dark:text-red-200">Failed to load reviews</h4>
          <p className="text-sm text-red-800 dark:text-red-300">{error.message}</p>
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">No reviews yet. Be the first to review this book!</p>
      </div>
    );
  }

  return (
    <div>
      {/* Review Cards */}
      <div className="space-y-3">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            onEcho={onEcho}
            onDelete={onDelete}
            isOwn={review.userId === userReviewId}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Loading...' : 'Load More Reviews'}
          </button>
        </div>
      )}
    </div>
  );
}
