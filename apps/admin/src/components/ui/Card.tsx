import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  glow = false,
  ...props
}) => {
  return (
    <div
      className={`bg-white dark:bg-[#181326] border border-[#E8E2D8] dark:border-[#2A223D] text-[#2D253A] dark:text-[#F3EFFC] rounded-xl p-5 transition-colors ${
        glow
          ? 'shadow-[0_4px_24px_-4px_rgba(139,92,246,0.15)] border-purple-500/40'
          : 'shadow-xs dark:shadow-lg'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, icon, className = '' }) => {
  return (
    <div className={`flex items-start justify-between gap-4 mb-4 ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="text-purple-600 dark:text-purple-400 p-2 bg-purple-500/10 rounded-lg shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-base font-semibold text-[#2D253A] dark:text-[#F3EFFC] tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-[#6D6282] dark:text-[#9E94B3] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
