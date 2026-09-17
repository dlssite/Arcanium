import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  readonly?: boolean;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

/**
 * StarRating — display or input a 1-5 star rating
 * - readonly: shows filled/half/empty stars
 * - interactive: click to set rating (1-5)
 * - Accessible: keyboard support (arrow keys, enter)
 */
export function StarRating({
  value,
  readonly = false,
  onChange,
  size = 'md',
  interactive = false,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue ?? value;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const containerClasses = {
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2',
  };

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, rating: number) => {
    if (readonly || !onChange) return;

    if (e.key === 'ArrowRight' && rating < 5) {
      onChange(rating + 1);
    } else if (e.key === 'ArrowLeft' && rating > 1) {
      onChange(rating - 1);
    }
  };

  return (
    <div
      className={`flex ${containerClasses[size]}`}
      role={interactive ? 'group' : undefined}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= Math.floor(displayValue);
        const isHalf = star === Math.ceil(displayValue) && displayValue % 1 !== 0;

        return (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onMouseEnter={() => interactive && setHoverValue(star)}
            onMouseLeave={() => interactive && setHoverValue(null)}
            onKeyDown={(e) => handleKeyDown(e, star)}
            disabled={readonly}
            className={`${sizeClasses[size]} transition-all duration-150 flex-shrink-0 ${
              interactive && !readonly ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default'
            } ${readonly ? 'cursor-default' : 'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#DE9B35]/50 rounded'}`}
            aria-label={`${star} stars`}
          >
            {isFilled ? (
              <Star className="fill-[#DE9B35] text-[#DE9B35] drop-shadow-[0_1px_3px_rgba(222,155,53,0.3)] w-full h-full" />
            ) : isHalf ? (
              <div className="relative w-full h-full">
                <Star className="text-stone-300 dark:text-[#433556] w-full h-full absolute inset-0" />
                <div className="absolute inset-0 overflow-hidden w-1/2">
                  <Star className="fill-[#DE9B35] text-[#DE9B35] drop-shadow-[0_1px_3px_rgba(222,155,53,0.3)] w-full h-full" />
                </div>
              </div>
            ) : (
              <Star className="text-stone-300 dark:text-[#433556] w-full h-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
