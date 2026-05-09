import { useState, useEffect, useRef, useCallback } from 'react';
import type { Store } from '../hooks/storeTypes';
import { SearchIcon, ShuffleIcon } from './Icons';
import { capitalizeWords } from '../utils/formatText';

interface HomeViewProps {
  store: Store;
}

// Date grouping helper
function getDateGroup(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  if (date >= weekAgo) return 'This week';
  return 'Older';
}

function groupByDate<T extends { timestamp: number }>(items: T[]): { label: string; items: T[] }[] {
  const order = ['Today', 'Yesterday', 'This week', 'Older'];
  const groups = new Map<string, T[]>();
  
  for (const item of items) {
    const label = getDateGroup(item.timestamp);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(item);
  }

  return order
    .filter(label => groups.has(label))
    .map(label => ({ label, items: groups.get(label)! }));
}

export function HomeView({ store }: HomeViewProps) {
  const [query, setQuery] = useState(store.searchQuery);
  const [showPatternKeys, setShowPatternKeys] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      store.setSearchQuery(query);
      store.searchDictionaries(query);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      store.lookupWord(query.trim());
    }
  }, [query, store]);

  const handleResultClick = useCallback((word: string) => {
    store.lookupWord(word);
  }, [store]);

  const insertPattern = useCallback((pattern: string) => {
    setQuery(prev => prev + pattern);
    inputRef.current?.focus();
  }, []);

  const [, setShuffling] = useState(false);
  const handleShuffle = useCallback(() => {
    setShuffling(true);
    store.shuffleWotd();
    setTimeout(() => setShuffling(false), 300);
  }, [store]);

  const recentGroups = groupByDate(store.history.slice(0, 8));

  let itemIndex = 0;

  return (
    <div className="pb-28 min-h-screen">
      {/* Header */}
      <div className="px-6 pt-12 pb-6 max-w-[680px] mx-auto">
        <h1 
          className="font-display text-[clamp(2rem,6vw,3rem)] tracking-[-0.02em] text-text-primary leading-tight"
        >
          Lexicon
        </h1>
      </div>

      {/* Search */}
      <div className="px-6 max-w-[680px] mx-auto">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
              <SearchIcon size={20} />
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => store.setIsSearching(true)}
              placeholder="Look up a word..."
              className="w-full pl-11 pr-4 py-3 bg-elevated border border-border-divider rounded-[10px] text-text-primary placeholder:text-text-tertiary font-body text-base focus:border-accent-teal focus:ring-[3px] focus:ring-accent-teal/10 transition-all duration-200"
            />
          </div>
        </form>

        {/* Pattern helper keys */}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setShowPatternKeys(!showPatternKeys)}
            className="text-[0.6875rem] font-mono text-text-tertiary uppercase tracking-[0.04em] hover:text-text-secondary transition-colors"
          >
            {showPatternKeys ? 'Hide' : 'Wildcards'}
          </button>
          {showPatternKeys && (
            <div className="flex gap-1.5 page-enter">
              {[
                { key: '?', label: 'Any letter' },
                { key: '*', label: 'Zero or more' },
                { key: '@', label: 'Vowel' },
                { key: '#', label: 'Consonant' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => insertPattern(key)}
                  title={label}
                  className="w-12 h-12 flex items-center justify-center border border-text-disabled rounded-[8px] font-mono text-base text-text-secondary hover:bg-elevated hover:border-text-tertiary transition-all duration-150"
                >
                  {key}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Results */}
        {query && store.searchResults.length > 0 && (
          <div className="mt-4">
            <p className="text-[0.6875rem] font-mono text-text-tertiary uppercase tracking-[0.12em] mb-2">
              {store.searchResults.length} match{store.searchResults.length !== 1 ? 'es' : ''}
            </p>
            <div className="border border-border-divider rounded-[15px] overflow-hidden">
              {store.searchResults.slice(0, 20).map((word, i) => (
                <button
                  key={word}
                  onClick={() => handleResultClick(word)}
                  className="list-item-enter item-highlight w-full text-left px-4 py-3 text-base text-text-primary hover:bg-elevated active:bg-card-hover hover:translate-x-1 transition-all duration-200 border-b border-border-divider last:border-b-0 block"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  {capitalizeWords(word)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Word of the Day */}
      {!query && (
        <div className="px-6 mt-10 max-w-[680px] mx-auto page-enter">
          <div className="bg-elevated border border-border-divider p-6 rounded-[10px]">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[0.625rem] text-text-tertiary tracking-[0.04em] uppercase">
                  Word of the Day
                </p>
              </div>
              <button
                onClick={handleShuffle}
                className="w-8 h-8 flex items-center justify-center border border-text-disabled rounded-[8px] hover:border-text-tertiary transition-all duration-150"
                title="Shuffle"
              >
                <ShuffleIcon className="w-4 h-4 text-text-secondary" />
              </button>
            </div>
            <button
              onClick={() => store.lookupWord(store.wotd.word)}
              className="block mt-1 text-left group"
            >
              <h2 className="font-display text-[2rem] text-text-primary tracking-[-0.02em] group-hover:text-accent-teal group-hover:translate-x-1 transition-all duration-200">
                {capitalizeWords(store.wotd.word)}
              </h2>
              <p className="mt-2 text-[0.9375rem] text-text-secondary leading-relaxed">
                {capitalizeWords(store.wotd.definition)}
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Recent History — grouped by date */}
      {!query && store.history.length > 0 && (
        <div className="px-6 mt-10 max-w-[680px] mx-auto">
          <h3 className="text-[0.75rem] uppercase tracking-[0.12em] text-text-secondary mb-4 font-body font-medium">
            Recent Lookups
          </h3>
          <div>
            {recentGroups.map(group => (
              <div key={group.label}>
                <div className="section-date-header">{group.label}</div>
                {group.items.map((item) => {
                  const idx = itemIndex++;
                  return (
                    <button
                      key={item.word + item.timestamp}
                      onClick={() => store.lookupWord(item.word)}
                      className="list-item-enter item-highlight w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-elevated active:bg-card-hover transition-all duration-200 border-b border-border-divider"
                      style={{ animationDelay: `${idx * 0.04}s` }}
                    >
                      <span className="text-text-tertiary flex-shrink-0">
                        <SearchIcon size={16} />
                      </span>
                      <span className="text-base text-text-primary">{capitalizeWords(item.word)}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!query && store.history.length === 0 && (
        <div className="px-6 mt-16 max-w-[680px] mx-auto text-center">
          <p className="font-display text-[4rem] text-text-disabled leading-none">α</p>
          <h3 className="font-display text-[1.25rem] text-text-primary mt-4">Begin your journey</h3>
          <p className="text-text-tertiary mt-2 text-[0.9375rem]">
            Search for any word to discover its meaning, etymology, and connections.
          </p>
        </div>
      )}
    </div>
  );
}
