import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  icon,
  error,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <div className="w-full">
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 text-[#9E94AB] dark:text-[#9E94B3] pointer-events-none shrink-0">
            {icon}
          </div>
        )}
        <input
          className={`w-full bg-white dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg text-sm text-[#2D253A] dark:text-[#F3EFFC] placeholder-[#9E94AB] dark:placeholder-[#6D6282] transition-colors duration-150 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed ${
            icon ? 'pl-9' : 'pl-3'
          } pr-3 py-2 ${error ? 'border-rose-500/60' : ''} ${className}`}
          disabled={disabled}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose-500 dark:text-rose-400 mt-1">{error}</p>}
    </div>
  );
};
