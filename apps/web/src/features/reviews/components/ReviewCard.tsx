import React from 'react';
import { Heart, Trash2 } from 'lucide-react';
import { StarRating } from './StarRating.js';
import type { Review } from '@arcanium/types';

interface ReviewCardProps {
  review: Review;
  onEcho: (reviewId: string) => void;
  onDelete?: ((reviewId: string) => void) | undefined;
  isOwn?: boolean | undefined;
  isLoading?: boolean | undefined;
}

/**
 * ReviewCard — individual review display with echo and delete buttons
 */
export function ReviewCard({
  review,
  onEcho,
  onDelete,
  isOwn = false,
  isLoading = false,
}: ReviewCardProps) {
  const { id, userDisplayName, userAvatarUrl, rating, reviewText, echoCount, hasEchoed, createdAt } = review;

  const date = new Date(createdAt);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-3">
      <div className="flex gap-3">
        {/* Avatar */}
        {userAvatarUrl && (
          <img
            src={userAvatarUrl}
            alt={userDisplayName}
            className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Header: Name and Rating */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-semibold text-gray-900 dark:text-white">{userDisplayName}</span>
            <StarRating value={rating} readonly size="sm" />
          </div>

          {/* Date */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{dateStr}</p>

          {/* Review Text */}
          {reviewText && (
            <p className="text-gray-800 dark:text-gray-200 mb-3 text-sm leading-relaxed">
              {reviewText}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 mt-3">
            {/* Echo Button */}
            <button
              onClick={() => onEcho(id)}
              disabled={isLoading}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                hasEchoed
                  ? 'text-red-500 hover:text-red-600 dark:text-red-400'
                  : 'text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400'
              } ${isLoading && 'opacity-50 cursor-not-allowed'}`}
              aria-label={hasEchoed ? 'Unlike' : 'Like'}
            >
              <Heart className={`w-4 h-4 ${hasEchoed && 'fill-current'}`} />
              <span>{echoCount > 0 ? echoCount : 'Echo'}</span>
            </button>

            {/* Delete Button (own review only) */}
            {isOwn && onDelete && (
              <button
                onClick={() => onDelete(id)}
                disabled={isLoading}
                className={`flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors ${
                  isLoading && 'opacity-50 cursor-not-allowed'
                }`}
                aria-label="Delete review"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
