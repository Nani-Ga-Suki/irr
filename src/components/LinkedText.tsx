import { useCallback } from 'react';

interface LinkedTextProps {
  text: string;
  onWordClick: (word: string) => void;
  className?: string;
}

export function LinkedText({ text, onWordClick, className = '' }: LinkedTextProps) {
  const handleClick = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    const target = e.target as HTMLElement;
    if (target.dataset.word) {
      e.preventDefault();
      onWordClick(target.dataset.word);
    }
  }, [onWordClick]);

  // Split text into words and punctuation
  const parts = text.split(/(\s+|[.,;:!?'"()[\]{}\-—–/])/);

  return (
    <span className={className} onClick={handleClick}>
      {parts.map((part, i) => {
        const trimmed = part.replace(/[^a-zA-ZÀ-ÿ'-]/g, '');
        if (trimmed.length > 1) {
          return (
            <span
              key={i}
              data-word={trimmed.toLowerCase()}
              className="cursor-pointer hover:text-accent-teal transition-colors duration-150 border-b border-transparent hover:border-accent-teal/30"
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
