import React, { useState } from 'react';
import {
  MessageSquare,
  Search,
  Star,
  Trash2,
  AlertCircle,
  TrendingUp,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, Badge, Button, Input, Select, Modal } from '../components/ui';
import { useReviewManagement } from '../hooks/useReviewManagement';
import type { AdminReview } from '@arcanium/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function ratingVariant(rating: number): 'success' | 'warning' | 'error' {
  if (rating >= 4) return 'success';
  if (rating >= 3) return 'warning';
  return 'error';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ReviewsPage: React.FC = () => {
  const {
    reviews, total, hasMore, analytics,
    page, limit, setPage,
    searchQuery, ratingFilter, sortBy,
    handleSearchChange, handleRatingChange, handleSortChange,
    isLoading, isError, isAnalyticsLoading,
    deleteReview, isDeleting,
  } = useReviewManagement();

  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const totalPages = Math.ceil(total / limit);
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  function confirmDelete(review: AdminReview) {
    setSelectedReview(review);
    setShowDeleteConfirm(true);
  }

  function handleDeleteConfirmed() {
    if (!selectedReview) return;
    deleteReview(selectedReview.id);
    setShowDeleteConfirm(false);
    setSelectedReview(null);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E8E2D8] dark:border-[#2A223D]">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#2D253A] dark:text-[#F3EFFC] tracking-wide">
            Review Management
          </h1>
          <p className="text-xs md:text-sm text-[#6D6282] dark:text-[#9E94B3] mt-1">
            Monitor, moderate, and analyse book reviews
          </p>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#6D6282] dark:text-[#9E94B3] mb-1">Total Reviews</p>
              <p className="text-2xl font-bold text-[#2D253A] dark:text-[#F3EFFC]">
                {isAnalyticsLoading ? '—' : (analytics?.totalReviews ?? 0).toLocaleString()}
              </p>
            </div>
            <MessageSquare className="w-8 h-8 text-purple-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#6D6282] dark:text-[#9E94B3] mb-1">Avg Rating</p>
              <div className="flex items-center gap-1">
                <p className="text-2xl font-bold text-[#2D253A] dark:text-[#F3EFFC]">
                  {isAnalyticsLoading
                    ? '—'
                    : analytics?.avgRatingGlobal != null
                    ? analytics.avgRatingGlobal.toFixed(1)
                    : '—'}
                </p>
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              </div>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#6D6282] dark:text-[#9E94B3] mb-1">Last 7 Days</p>
              <p className="text-2xl font-bold text-[#2D253A] dark:text-[#F3EFFC]">
                {isAnalyticsLoading ? '—' : (analytics?.reviewsLast7Days ?? 0).toLocaleString()}
              </p>
            </div>
            <MessageSquare className="w-8 h-8 text-green-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#6D6282] dark:text-[#9E94B3] mb-1">Last 30 Days</p>
              <p className="text-2xl font-bold text-[#2D253A] dark:text-[#F3EFFC]">
                {isAnalyticsLoading ? '—' : (analytics?.reviewsLast30Days ?? 0).toLocaleString()}
              </p>
            </div>
            <MessageSquare className="w-8 h-8 text-indigo-500 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <Input
              placeholder="Search by book, user, or review text..."
              icon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <Select
            value={ratingFilter}
            onChange={(e) => handleRatingChange(e.target.value)}
            options={[
              { label: 'All Ratings', value: '' },
              { label: '⭐⭐⭐⭐⭐ 5 Stars', value: '5' },
              { label: '⭐⭐⭐⭐ 4 Stars',   value: '4' },
              { label: '⭐⭐⭐ 3 Stars',     value: '3' },
              { label: '⭐⭐ 2 Stars',       value: '2' },
              { label: '⭐ 1 Star',          value: '1' },
            ]}
          />

          <Select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            options={[
              { label: 'Most Recent',   value: 'recent' },
              { label: 'Highest Rated', value: 'highest' },
              { label: 'Lowest Rated',  value: 'lowest' },
              { label: 'Most Echoed',   value: 'most_echoed' },
            ]}
          />
        </div>
      </Card>

      {/* Reviews Table */}
      <Card className="overflow-hidden">
        {/* Loading overlay */}
        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-2 text-[#6D6282] dark:text-[#9E94B3]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading reviews…</span>
          </div>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <div className="flex items-center gap-3 px-6 py-10 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">Failed to load reviews. Check your connection and try again.</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && reviews.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-[#6D6282] dark:text-[#9E94B3]">
            <MessageSquare className="w-10 h-10 opacity-20" />
            <p className="text-sm">No reviews match your filters.</p>
          </div>
        )}

        {/* Table */}
        {!isLoading && !isError && reviews.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8E2D8] dark:border-[#2A223D] bg-[#F7F5F0] dark:bg-[#1A1420]">
                  <th className="px-4 py-3 text-left font-semibold text-[#2D253A] dark:text-[#F3EFFC]">Book</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#2D253A] dark:text-[#F3EFFC]">User</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#2D253A] dark:text-[#F3EFFC]">Rating</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#2D253A] dark:text-[#F3EFFC]">Review Text</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#2D253A] dark:text-[#F3EFFC]">Echoes</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#2D253A] dark:text-[#F3EFFC]">Date</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#2D253A] dark:text-[#F3EFFC]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review, idx) => (
                  <tr
                    key={review.id}
                    className={`border-b border-[#E8E2D8] dark:border-[#2A223D] hover:bg-[#FAF8F5] dark:hover:bg-[#251B33] transition-colors ${
                      idx % 2 === 0 ? 'bg-white dark:bg-[#1C1420]' : 'bg-[#FDFBF8] dark:bg-[#1A1420]'
                    }`}
                  >
                    {/* Book */}
                    <td className="px-4 py-3 max-w-[180px]">
                      <div className="font-medium text-[#2D253A] dark:text-[#F3EFFC] truncate">
                        {review.contentTitle}
                      </div>
                      <div className="text-[10px] text-[#9E94B3] dark:text-[#6D6282] font-mono truncate">
                        {review.contentType}
                      </div>
                    </td>

                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="text-[#2D253A] dark:text-[#F3EFFC]">{review.userDisplayName}</div>
                      <div className="text-xs text-[#9E94B3] dark:text-[#6D6282]">{review.userEmail}</div>
                    </td>

                    {/* Rating */}
                    <td className="px-4 py-3 text-center">
                      <Badge variant={ratingVariant(review.rating)} size="sm">
                        {review.rating} ★
                      </Badge>
                    </td>

                    {/* Review text */}
                    <td className="px-4 py-3 max-w-xs">
                      {review.reviewText ? (
                        <p className="text-xs text-[#6D6282] dark:text-[#9E94B3] line-clamp-2">
                          {review.reviewText}
                        </p>
                      ) : (
                        <span className="text-xs text-[#9E94B3] dark:text-[#6D6282] italic">
                          Rating only
                        </span>
                      )}
                    </td>

                    {/* Echoes */}
                    <td className="px-4 py-3 text-center text-[#6D6282] dark:text-[#9E94B3]">
                      {review.echoCount}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-[#6D6282] dark:text-[#9E94B3] whitespace-nowrap">
                      {formatDate(review.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDelete(review)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && total > 0 && (
          <div className="px-4 py-3 border-t border-[#E8E2D8] dark:border-[#2A223D] flex items-center justify-between">
            <p className="text-xs text-[#6D6282] dark:text-[#9E94B3]">
              Showing {from}–{to} of {total.toLocaleString()} reviews
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <span className="text-xs text-[#6D6282] dark:text-[#9E94B3] px-1">
                {page} / {totalPages || 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={!hasMore}
                onClick={() => setPage(page + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setSelectedReview(null); }}
        title="Delete Review"
      >
        <div className="space-y-4">
          <div className="flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[#6D6282] dark:text-[#9E94B3]">
              Are you sure you want to permanently delete this review by{' '}
              <strong className="text-[#2D253A] dark:text-[#F3EFFC]">{selectedReview?.userDisplayName}</strong>{' '}
              on{' '}
              <strong className="text-[#2D253A] dark:text-[#F3EFFC]">{selectedReview?.contentTitle}</strong>?
              This cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => { setShowDeleteConfirm(false); setSelectedReview(null); }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirmed}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Delete Review
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReviewsPage;
