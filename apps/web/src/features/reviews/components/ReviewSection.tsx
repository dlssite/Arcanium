import React, { useState } from 'react';
import { useReviews } from '../hooks/useReviews.js';
import { RatingOverview } from './RatingOverview.js';
import { UserReviewForm } from './UserReviewForm.js';
import { ReviewList } from './ReviewList.js';
import { Loader2, AlertCircle, MessageSquareQuote, Sparkles, SlidersHorizontal } from 'lucide-react';
import type { ReviewInput, ReviewQuery } from '@arcanium/types';

interface ReviewSectionProps {
  slug: string;
  contentId: string;
  isAuthenticated: boolean;
  userId?: string;
}

const SORT_OPTIONS: Array<{ key: ReviewQuery['sort']; label: string }> = [
  { key: 'helpful', label: 'Most Helpful' },
  { key: 'recent',  label: 'Recent' },
  { key: 'highest', label: 'Highest' },
  { key: 'lowest',  label: 'Lowest' },
];

/**
 * ReviewSection — Reader Reflections & Echoes container
 * Displays: Aggregate rating, write/edit form (if auth), interactive sort pills, and review list
 */
export function ReviewSection({
  slug,
  contentId,
  isAuthenticated,
  userId,
}: ReviewSectionProps) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<ReviewQuery['sort']>('helpful');
  const [isFormOpen, setIsFormOpen] = useState(false);

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
    createOrUpdate.mutate(input, {
      onSuccess: () => {
        setIsFormOpen(false);
      },
    });
  };

  const handleDeleteReview = () => {
    if (confirm('Are you sure you want to delete your reflection?')) {
      deleteReview.mutate();
    }
  };

  const handleEcho = (reviewId: string) => {
    if (!isAuthenticated) {
      alert('Please sign in to echo reader reflections');
      return;
    }
    echo.mutate(reviewId);
  };

  const handleLoadMore = () => {
    setPage((p) => p + 1);
  };

  if (!aggregate) {
    return (
      <section id="reviews" className="mt-8 pt-6 border-t border-[#EFEAE2] dark:border-[#352B44]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="w-5 h-5 text-[#DE9B35]" />
            <h3 className="font-serif font-bold text-xl text-[#2D223B] dark:text-[#F1ECF7]">
              Reader Reflections
            </h3>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-[#8C8397]">
          <Loader2 className="w-7 h-7 animate-spin text-[#DE9B35] mb-2" />
          <span className="text-xs">Gathering reflections...</span>
        </div>
      </section>
    );
  }

  const reviewCount = aggregate.ratingCount || 0;

  return (
    <section id="reviews" className="mt-8 pt-6 border-t border-[#EFEAE2] dark:border-[#352B44]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#DE9B35]/15 flex items-center justify-center text-[#DE9B35]">
            <MessageSquareQuote className="w-4 h-4" />
          </div>
          <h3 className="font-serif font-bold text-xl text-[#2D223B] dark:text-[#F1ECF7]">
            Reader Reflections
          </h3>
          {reviewCount > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#51406B]/10 dark:bg-[#725499]/20 text-[#43335A] dark:text-[#C5B3DC]">
              {reviewCount}
            </span>
          )}
        </div>

        {isAuthenticated && !isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="text-xs font-semibold text-[#DE9B35] hover:text-[#C88626] dark:text-[#E8AA4C] flex items-center gap-1.5 py-1 px-3 rounded-full hover:bg-[#DE9B35]/10 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{userReview ? 'Edit Reflection' : 'Add Reflection'}</span>
          </button>
        )}
      </div>

      {/* Aggregate Rating Showcase */}
      <RatingOverview aggregate={aggregate} />

      {/* User Review Form (collapsible or always accessible) */}
      {isAuthenticated && (isFormOpen || !!userReview) && (
        <UserReviewForm
          userReview={userReview as any}
          onSubmit={handleSubmitReview}
          {...(userReview && { onDelete: handleDeleteReview })}
          isLoading={createOrUpdate.isPending || deleteReview.isPending}
        />
      )}

      {/* Filter and Sort Pills */}
      {reviews.length > 0 && (
        <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-[#7C7286] dark:text-[#A79DB3]">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="font-medium">Sort:</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {SORT_OPTIONS.map(({ key, label }) => {
              const isActive = sort === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setSort(key);
                    setPage(1);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all active:scale-95 ${
                    isActive
                      ? 'bg-[#43335A] text-white dark:bg-[#725499] shadow-xs'
                      : 'bg-stone-100/80 dark:bg-[#251C33] text-[#6E647A] dark:text-[#A99DB7] hover:bg-stone-200/80 dark:hover:bg-[#2E233F]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-2xl flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-xs sm:text-sm text-red-900 dark:text-red-200">
              Failed to load reflections
            </h4>
            <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
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
