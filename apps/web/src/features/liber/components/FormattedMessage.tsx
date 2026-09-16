import React from 'react';

interface FormattedMessageProps {
  text: string;
  className?: string;
}

/**
 * FormattedMessage — renders Liber's response text with basic formatting.
 * Supports:
 * - **bold**
 * - *italic*
 * - Line breaks
 * - Book titles in quotes
 */
export function FormattedMessage({ text, className = '' }: FormattedMessageProps) {
  // Split by line breaks first
  const lines = text.split('\n').filter(line => line.trim());

  return (
    <div className={className}>
      {lines.map((line, lineIdx) => {
        const parts: React.ReactNode[] = [];
        let currentIndex = 0;
        
        // Pattern to match: **bold** (non-greedy), *italic* (not preceded/followed by *), "Book Title", or 'Book Title'
        const pattern = /(\*\*(.+?)\*\*|(?<!\*)\*([^*]+?)\*(?!\*)|"[^"]+"|'[A-Z][^']{2,}')/g;
        let match;

        while ((match = pattern.exec(line)) !== null) {
          // Add text before the match
          if (match.index > currentIndex) {
            parts.push(line.slice(currentIndex, match.index));
          }

          const matched = match[0];
          
          // Handle **bold**
          if (matched.startsWith('**') && matched.endsWith('**')) {
            parts.push(
              <strong key={`${lineIdx}-${match.index}-b`} className="font-semibold text-[#2D223B] dark:text-white">
                {matched.slice(2, -2)}
              </strong>
            );
          }
          // Handle *italic* (single asterisk, not double)
          else if (matched.startsWith('*') && matched.endsWith('*') && !matched.startsWith('**')) {
            parts.push(
              <em key={`${lineIdx}-${match.index}-i`} className="italic">
                {matched.slice(1, -1)}
              </em>
            );
          }
          // Handle "Book Title" or 'Book Title' (only if starts with capital letter and is at least 3 chars)
          else if ((matched.startsWith('"') && matched.endsWith('"')) || 
                   (matched.startsWith("'") && matched.endsWith("'") && /^'[A-Z][^']{2,}'$/.test(matched))) {
            parts.push(
              <span key={`${lineIdx}-${match.index}-q`} className="italic text-[#43335A] dark:text-[#FFDE88] font-medium">
                {matched}
              </span>
            );
          }
          else {
            // If it doesn't match the criteria, just add it as plain text
            parts.push(matched);
          }
          
          currentIndex = match.index + matched.length;
        }

        // Add remaining text
        if (currentIndex < line.length) {
          parts.push(line.slice(currentIndex));
        }

        return (
          <p key={lineIdx} className={lineIdx > 0 ? 'mt-2' : ''}>
            {parts.length > 0 ? parts : line}
          </p>
        );
      })}
    </div>
  );
}
