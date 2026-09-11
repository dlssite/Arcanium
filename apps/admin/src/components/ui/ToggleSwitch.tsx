import React from 'react';

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
}) => {
  const switchSize = size === 'sm' ? 'w-8 h-4.5' : 'w-11 h-6';
  const knobSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  const translate = size === 'sm' ? (checked ? 'translate-x-3.5' : 'translate-x-0.5') : (checked ? 'translate-x-5' : 'translate-x-0.5');

  return (
    <label className={`flex items-start gap-3 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <div className="relative inline-flex items-center shrink-0 mt-0.5">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => !disabled && onChange(e.target.checked)}
        />
        <div
          className={`${switchSize} rounded-full transition-colors duration-200 ease-in-out border ${
            checked
              ? 'bg-purple-600 border-purple-500 shadow-[0_0_12px_rgba(139,92,246,0.4)]'
              : 'bg-[#E2DDD3] dark:bg-[#211A34] border-[#D0C8BC] dark:border-[#3B3056]'
          }`}
        >
          <div
            className={`${knobSize} bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${translate} mt-0.5`}
          />
        </div>
      </div>
      {(label || description) && (
        <div className="text-left">
          {label && (
            <div className="text-sm font-medium text-[#2D253A] dark:text-[#F3EFFC]">
              {label}
            </div>
          )}
          {description && (
            <div className="text-xs text-[#6D6282] dark:text-[#9E94B3] mt-0.5">
              {description}
            </div>
          )}
        </div>
      )}
    </label>
  );
};
