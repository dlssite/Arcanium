import React from 'react';
import { StarRating } from './StarRating.js';
import { Star } from 'lucide-react';
import type { ReviewAggregate } from '@arcanium/types';

interface RatingOverviewProps {
  aggregate: ReviewAggregate;
}

/**
 * RatingOverview — display aggregate rating with illuminated distribution bars
 */
export function RatingOverview({ aggregate }: RatingOverviewProps) {
  const { averageRating, ratingCount, distribution } = aggregate;

  const totalRatings = ratingCount || 0;
  const avgDisplay = averageRating != null ? averageRating.toFixed(1) : '-';

  return (
    <div className="mb-6 p-5 rounded-2xl bg-[#F7F4EF]/90 dark:bg-[#231A2F]/80 border border-[#E9E2D5] dark:border-[#392B4B] shadow-sm backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-6">
        {/* Left: Prominent score showcase */}
        <div className="flex flex-col items-center justify-center sm:min-w-[140px] text-center sm:border-r border-[#E9E2D5] dark:border-[#392B4B] sm:pr-6">
          <div className="font-serif text-5xl sm:text-6xl font-extrabold text-[#DE9B35] leading-none tracking-tight drop-shadow-[0_2px_10px_rgba(222,155,53,0.25)]">
            {avgDisplay}
          </div>
          <div className="mt-2.5">
            <StarRating value={averageRating ?? 0} readonly size="md" />
          </div>
          <p className="mt-2 text-xs font-medium text-[#7C7286] dark:text-[#A79DB3]">
            {totalRatings > 0
              ? `${totalRatings.toLocaleString()} reader rating${totalRatings !== 1 ? 's' : ''}`
              : 'Awaiting first review'}
          </p>
        </div>

        {/* Right: Star distribution breakdown */}
        <div className="flex-1 w-full flex flex-col justify-center gap-2">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = distribution[stars as 1 | 2 | 3 | 4 | 5] || 0;
            const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;

            return (
              <div key={stars} className="flex items-center gap-2.5 text-xs">
                <span className="w-7 text-right font-medium text-[#5E536B] dark:text-[#BDB2CB] flex items-center justify-end gap-0.5">
                  <span>{stars}</span>
                  <Star className="w-3 h-3 fill-[#DE9B35] text-[#DE9B35]" />
                </span>
                <div className="flex-1 h-2 bg-stone-200/80 dark:bg-[#332644] rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-[#F3B652] to-[#DE9B35] rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(222,155,53,0.4)]"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-9 text-right font-mono text-[11px] text-[#8C8397] dark:text-[#8E839C]">
                  {count > 0 ? count : 0}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
