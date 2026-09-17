import React from 'react';
import { ReviewCard } from './ReviewCard.js';
import { Loader2, AlertCircle, Feather } from 'lucide-react';
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
 * ReviewList — display paginated reader reflections with graceful empty and loading states
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
      <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-2xl flex gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-xs sm:text-sm text-red-900 dark:text-red-200">Failed to load reflections</h4>
          <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{error.message}</p>
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-[#E3DBD0] dark:border-[#3B2C4E] bg-white/40 dark:bg-[#20182C]/40">
        <div className="w-11 h-11 mx-auto rounded-full bg-[#DE9B35]/10 flex items-center justify-center text-[#DE9B35] mb-3">
          <Feather className="w-5 h-5" />
        </div>
        <h4 className="font-serif font-bold text-base text-[#2D223B] dark:text-[#F1ECF7]">
          No Reader Reflections Yet
        </h4>
        <p className="text-xs text-[#80778B] dark:text-[#A69BB2] max-w-xs mx-auto mt-1 leading-relaxed">
          Be the first to illuminate this archive with your reflections and insights.
        </p>
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
        <div className="mt-5 flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="px-5 py-2.5 border border-[#DDD5C7] dark:border-[#3D2E50] rounded-xl text-xs sm:text-sm font-semibold text-[#43335A] dark:text-[#E2D9EC] bg-white/80 dark:bg-[#251C33]/80 hover:bg-stone-50 dark:hover:bg-[#2F243E] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-xs active:scale-98"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-[#DE9B35]" />}
            <span>{isLoading ? 'Loading More...' : 'Load More Reflections'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
