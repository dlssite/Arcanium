import React, { useState } from 'react';
import { StarRating } from './StarRating.js';
import type { Review } from '@arcanium/types';
import { Loader2, Trash2, Sparkles, PenLine } from 'lucide-react';

interface UserReviewFormProps {
  userReview: Review | null;
  onSubmit: (rating: number, reviewText: string | null) => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: 'Poor — Could not connect with this work',
  2: 'Fair — Has some merits, but fell short',
  3: 'Good — An enjoyable read',
  4: 'Very Good — Highly recommended',
  5: 'Masterpiece — An extraordinary journey',
};

/**
 * UserReviewForm — create or edit user's reflection with illuminated Arcanium styling
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
      setError('Please select a star rating');
      return;
    }

    if (textLength > 0 && (textLength < 50 || textLength > 2000)) {
      setError('Reflection must be between 50 and 2,000 characters');
      return;
    }

    onSubmit(rating, trimmedText || null);
  };

  return (
    <div className="mb-6 p-5 bg-gradient-to-b from-[#FDFBF7] to-[#F7F2EA] dark:from-[#241A32] dark:to-[#1C1527] border border-[#E9E1D3] dark:border-[#3D2E52] rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#43335A]/10 dark:bg-[#725499]/20 flex items-center justify-center text-[#43335A] dark:text-[#C5B3DC]">
            <PenLine className="w-4 h-4" />
          </div>
          <h3 className="font-serif font-bold text-base text-[#2D223B] dark:text-[#F1ECF7]">
            {isEditing ? 'Edit Your Reflection' : 'Leave Your Reflection'}
          </h3>
        </div>
        {rating > 0 && (
          <span className="text-[11px] font-medium text-[#DE9B35] dark:text-[#E8AA4C] bg-[#DE9B35]/10 px-2.5 py-0.5 rounded-full">
            {RATING_DESCRIPTIONS[rating]}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rating Input */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#7C7286] dark:text-[#A79DB3] mb-2">
            Your Rating
          </label>
          <div className="flex items-center gap-3">
            <StarRating
              value={rating}
              onChange={setRating}
              size="lg"
              interactive={!isLoading}
            />
            {rating === 0 && (
              <span className="text-xs text-[#8C8397] dark:text-[#8E839C] italic">
                Tap to rate
              </span>
            )}
          </div>
        </div>

        {/* Review Text */}
        <div>
          <label
            htmlFor="reviewText"
            className="block text-xs font-semibold uppercase tracking-wider text-[#7C7286] dark:text-[#A79DB3] mb-2"
          >
            Reader Reflections <span className="font-normal text-[11px] lowercase opacity-80">(optional)</span>
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
            placeholder="What resonance did this tome hold for you? Share your impressions, favorite passages, or emotional resonance... (50-2000 characters)"
            className="w-full px-3.5 py-3 border border-[#DDD5C7] dark:border-[#3D2E50] rounded-xl bg-white/90 dark:bg-[#191222]/90 text-[#2D223B] dark:text-[#F1ECF7] placeholder-[#9E95A8] dark:placeholder-[#6C607C] focus:outline-none focus:ring-2 focus:ring-[#DE9B35]/30 focus:border-[#DE9B35] disabled:opacity-50 text-xs sm:text-sm leading-relaxed transition-all resize-none shadow-inner"
            rows={4}
          />
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <p className={isTextValid ? 'text-[#8C8397] dark:text-[#8E839C]' : 'text-red-500 font-medium'}>
              {textLength === 0 ? 'Minimum 50 characters if written' : `${textLength} / 2,000 characters`}
            </p>
            {textLength > 0 && textLength < 50 && (
              <p className="text-red-500 font-medium">
                {50 - textLength} more characters needed
              </p>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={!isValid || isLoading}
            className="px-5 py-2.5 bg-[#43335A] hover:bg-[#342647] dark:bg-[#725499] dark:hover:bg-[#604484] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-purple-950/20 active:scale-98 transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#DE9B35]" />
            )}
            <span>{isEditing ? 'Update Reflection' : 'Publish Reflection'}</span>
          </button>

          {isEditing && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isLoading}
              className="px-4 py-2.5 bg-transparent border border-red-200 dark:border-red-900/60 text-red-500 dark:text-red-400 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
