import React, { useState } from 'react';
import { StarRating } from './StarRating.js';
import type { Review } from '@arcanium/types';
import { Loader2, Trash2 } from 'lucide-react';

interface UserReviewFormProps {
  userReview: Review | null;
  onSubmit: (rating: number, reviewText: string | null) => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

/**
 * UserReviewForm — create or edit your own review
 */
export function UserReviewForm({
  userReview,
  onSubmit,
  onDelete,
  isLoading = false,
}: UserReviewFormProps) {
  const [rating, setRating] = useState(userReview?.rating ?? 0);
  const [reviewText, setReviewText] = useState(userReview?.reviewText ?? '');
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!userReview;
  const trimmedText = reviewText.trim();
  const textLength = trimmedText.length;
  const isTextValid = textLength === 0 || (textLength >= 50 && textLength <= 2000);
  const isValid = rating > 0 && isTextValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating < 1 || rating > 5) {
      setError('Please select a rating');
      return;
    }

    if (textLength > 0 && (textLength < 50 || textLength > 2000)) {
      setError('Review must be between 50 and 2000 characters');
      return;
    }

    onSubmit(rating, trimmedText || null);
  };

  return (
    <div className="mb-6 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
        {isEditing ? 'Edit Your Review' : 'Write a Review'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rating Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Rating
          </label>
          <StarRating
            value={rating}
            onChange={setRating}
            size="md"
            interactive={!isLoading}
          />
        </div>

        {/* Review Text */}
        <div>
          <label
            htmlFor="reviewText"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Your Thoughts (optional)
          </label>
          <textarea
            id="reviewText"
            value={reviewText}
            onChange={(e) => {
              setReviewText(e.target.value);
              setError(null);
            }}
            maxLength={2000}
            disabled={isLoading}
            placeholder="Share your thoughts about this book... (50-2000 characters)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            rows={4}
          />
          <div className="mt-2 flex items-center justify-between">
            <p className={`text-xs ${isTextValid ? 'text-gray-500' : 'text-red-600 dark:text-red-400'}`}>
              {textLength === 0 ? 'Optional field' : `${textLength} / 2000 characters`}
            </p>
            {textLength > 0 && textLength < 50 && (
              <p className="text-xs text-red-600 dark:text-red-400">
                Minimum 50 characters
              </p>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={!isValid || isLoading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? 'Update Review' : 'Submit Review'}
          </button>

          {isEditing && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isLoading}
              className="px-4 py-2 bg-transparent border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
