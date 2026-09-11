import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className={`w-full ${maxWidthStyles[maxWidth]} bg-white dark:bg-[#181326] border border-[#E8E2D8] dark:border-[#3B3056] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[#E8E2D8] dark:border-[#2A223D]">
          <div>
            <h2 className="text-lg font-semibold text-[#2D253A] dark:text-[#F3EFFC]">{title}</h2>
            {subtitle && (
              <p className="text-xs text-[#6D6282] dark:text-[#9E94B3] mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[#6D6282] hover:text-[#2D253A] dark:text-[#9E94B3] dark:hover:text-[#F3EFFC] p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-[#2D253A] dark:text-[#F3EFFC]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-[#E8E2D8] dark:border-[#2A223D] bg-[#FAF7F2] dark:bg-[#120E1C]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
