import React from 'react';
import { Heart, Trash2, User } from 'lucide-react';
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
 * ReviewCard — reader reflection card with illuminated Arcanium aesthetic
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

  // Initials fallback
  const initials = userDisplayName
    ? userDisplayName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'R';

  return (
    <div className="bg-white/90 dark:bg-[#21182C]/90 border border-[#EAE3D5] dark:border-[#392B4B] rounded-2xl p-4 sm:p-4.5 shadow-sm transition-all hover:border-[#DDD2C0] dark:hover:border-[#4E3B64]">
      <div className="flex gap-3 sm:gap-3.5 items-start">
        {/* Avatar with fallback */}
        {userAvatarUrl ? (
          <img
            src={userAvatarUrl}
            alt={userDisplayName}
            className="w-9 h-9 rounded-full flex-shrink-0 object-cover border border-stone-200/80 dark:border-stone-700/80 shadow-xs"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-9 h-9 rounded-full flex-shrink-0 bg-gradient-to-br from-[#533F6E] to-[#39294F] text-[#FAF8F5] text-xs font-bold flex items-center justify-center border border-white/20 shadow-xs">
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Header: Name, Stars & Date */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs sm:text-sm text-[#2D223B] dark:text-[#F1ECF7]">
                {userDisplayName}
              </span>
              {isOwn && (
                <span className="text-[10px] font-bold bg-[#DE9B35]/15 text-[#DE9B35] px-2 py-0.5 rounded-full">
                  You
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#8C8397] dark:text-[#8E839C]">
              {dateStr}
            </span>
          </div>

          <div className="mt-1">
            <StarRating value={rating} readonly size="sm" />
          </div>

          {/* Review Text */}
          {reviewText && (
            <p className="mt-2.5 text-xs sm:text-sm text-[#463C53] dark:text-[#D1C6DF] leading-relaxed whitespace-pre-wrap font-sans">
              {reviewText}
            </p>
          )}

          {/* Actions: Echo & Delete */}
          <div className="flex items-center gap-3 mt-3 pt-2 border-t border-[#F2EDE5] dark:border-[#2C213B]">
            {/* Echo / Like Button */}
            <button
              onClick={() => onEcho(id)}
              disabled={isLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                hasEchoed
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 shadow-xs'
                  : 'bg-stone-100/70 dark:bg-[#2A1F36] text-[#7C7286] dark:text-[#A79DB3] hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50/50'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={hasEchoed ? 'Rescinded echo' : 'Echo review'}
            >
              <Heart
                className={`w-3.5 h-3.5 transition-transform ${
                  hasEchoed ? 'fill-rose-500 text-rose-500 scale-110' : ''
                }`}
              />
              <span>{echoCount > 0 ? echoCount : 'Echo'}</span>
            </button>

            {/* Delete Button (author only) */}
            {isOwn && onDelete && (
              <button
                onClick={() => onDelete(id)}
                disabled={isLoading}
                className="flex items-center gap-1 text-xs text-[#8C8397] hover:text-red-500 dark:text-[#8E839C] dark:hover:text-red-400 transition-colors ml-auto px-2 py-1 rounded-md"
                aria-label="Delete your reflection"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
