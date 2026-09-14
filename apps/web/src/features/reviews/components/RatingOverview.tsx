import React from 'react';
import { StarRating } from './StarRating.js';
import type { ReviewAggregate } from '@arcanium/types';

interface RatingOverviewProps {
  aggregate: ReviewAggregate;
}

/**
 * RatingOverview — display aggregate rating with distribution bars
 */
export function RatingOverview({ aggregate }: RatingOverviewProps) {
  const { averageRating, ratingCount, distribution } = aggregate;

  const totalRatings = ratingCount || 0;
  const avgDisplay = averageRating?.toFixed(1) ?? '-';

  return (
    <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:gap-8">
      {/* Left: Large rating display */}
      <div className="flex flex-col items-center gap-2 lg:min-w-32">
        <div className="text-5xl font-bold text-gray-900 dark:text-white">
          {avgDisplay}
        </div>
        <StarRating value={averageRating ?? 0} readonly size="lg" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {totalRatings > 0 ? `${totalRatings.toLocaleString()} rating${totalRatings !== 1 ? 's' : ''}` : 'No ratings yet'}
        </p>
      </div>

      {/* Right: Distribution bars */}
      <div className="flex-1">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = distribution[stars as 1 | 2 | 3 | 4 | 5] || 0;
          const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;

          return (
            <div key={stars} className="mb-2 flex items-center gap-3">
              <span className="w-12 text-sm text-gray-600 dark:text-gray-400 text-right">
                {stars} ⭐
              </span>
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-10 text-sm text-gray-600 dark:text-gray-400 text-right">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
