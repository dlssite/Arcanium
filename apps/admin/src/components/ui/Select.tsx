import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { label: string; value: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium text-[#6D6282] dark:text-[#9E94B3] mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={`w-full appearance-none bg-white dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg text-sm text-[#2D253A] dark:text-[#F3EFFC] py-2 pl-3 pr-8 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 cursor-pointer shadow-xs dark:shadow-none transition-colors ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-white text-[#2D253A] dark:bg-[#181326] dark:text-[#F3EFFC]"
            >
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#9E94AB] dark:text-[#9E94B3]">
          <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
    </div>
  );
};
