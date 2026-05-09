import { useState, useCallback } from 'react';
import type { Store } from '../hooks/storeTypes';
import { ArrowLeftIcon, ArrowRightIcon, ShareIcon, BookmarkIcon } from './Icons';

interface ActionPillProps {
  store: Store;
}

export function ActionPill({ store }: ActionPillProps) {
  const { currentEntry, canGoBack, canGoForward, goBack, goForward, isBookmarked, toggleBookmark } = store;
  const [justBookmarked, setJustBookmarked] = useState(false);

  if (!currentEntry) return null;

  const word = currentEntry.word;
  const bookmarked = isBookmarked(word);
  const primaryPos = currentEntry.meanings[0]?.partOfSpeech || '';

  const handleBookmark = useCallback(() => {
    toggleBookmark(word, primaryPos);
    if (!bookmarked) {
      setJustBookmarked(true);
      setTimeout(() => setJustBookmarked(false), 400);
    }
  }, [word, primaryPos, bookmarked, toggleBookmark]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: word,
      text: `${word}: ${currentEntry.meanings[0]?.definitions[0]?.definition || ''}`,
      url: `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${word}: ${currentEntry.meanings[0]?.definitions[0]?.definition || ''}`);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(`${word}: ${currentEntry.meanings[0]?.definitions[0]?.definition || ''}`);
      } catch { /* silently fail */ }
    }
  }, [word, currentEntry]);

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
      <div className={`glass-pill ${justBookmarked ? 'bookmark-pulse' : ''}`}>
        {/* Back */}
        <button
          onClick={goBack}
          disabled={!canGoBack}
        >
          <ArrowLeftIcon className="w-[18px] h-[18px]" />
        </button>

        {/* Share */}
        <button onClick={handleShare}>
          <ShareIcon className="w-[18px] h-[18px]" />
        </button>

        {/* Bookmark */}
        <button
          onClick={handleBookmark}
          className={bookmarked ? 'bg-accent-teal text-canvas' : ''}
          style={bookmarked ? { backgroundColor: 'var(--color-accent-teal)', color: 'var(--color-canvas)' } : undefined}
        >
          <BookmarkIcon className="w-[18px] h-[18px]" filled={bookmarked} />
        </button>

        {/* Forward */}
        <button
          onClick={goForward}
          disabled={!canGoForward}
        >
          <ArrowRightIcon className="w-[18px] h-[18px]" />
        </button>
      </div>
    </div>
  );
}
