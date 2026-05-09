import { useState, useCallback, useEffect, useRef } from 'react';
import type { DictionaryEntry, Bookmark, HistoryItem, CustomDictionary, ViewMode, POSFilter } from '../types';
import { WOTD_POOL, detectLanguage } from '../data/words';

// localStorage helpers
function loadJSON<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded, silently fail */ }
}

export type ThemeMode = 'dark' | 'amoled' | 'light';

export function useStore() {
  // View state
  const [view, setView] = useState<ViewMode>('home');
  const [posFilter, setPosFilter] = useState<POSFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Current definition
  const [currentEntry, setCurrentEntry] = useState<DictionaryEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Session navigation stack
  const [wordStack, setWordStack] = useState<DictionaryEntry[]>([]);
  const [stackIndex, setStackIndex] = useState(-1);

  // Persistent data
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => loadJSON('lexicon-bookmarks', []));
  const [history, setHistory] = useState<HistoryItem[]>(() => loadJSON('lexicon-history', []));
  const [dictionaries, setDictionaries] = useState<CustomDictionary[]>(() => loadJSON('lexicon-dicts', []));

  // Theme & font size
  const [theme, setThemeState] = useState<ThemeMode>(() => loadJSON('lexicon-theme', 'dark'));
  const [fontSize, setFontSizeState] = useState<number>(() => loadJSON('lexicon-font-size', 16));

  // WOTD
  const [wotdIndex, setWotdIndex] = useState(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    return dayOfYear % WOTD_POOL.length;
  });

  // Persist
  useEffect(() => { saveJSON('lexicon-bookmarks', bookmarks); }, [bookmarks]);
  useEffect(() => { saveJSON('lexicon-history', history); }, [history]);

  // Apply theme
  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    saveJSON('lexicon-theme', t);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // Update body background for theme
    const themeColors: Record<ThemeMode, string> = {
      dark: '#1a1a1a',
      amoled: '#000000',
      light: '#f5f0e8',
    };
    document.body.style.backgroundColor = themeColors[theme];
    // Update meta theme-color
    const metaEl = document.querySelector('meta[name="theme-color"]');
    if (metaEl) metaEl.setAttribute('content', themeColors[theme]);
  }, [theme]);

  // Apply font size
  const setFontSize = useCallback((size: number) => {
    setFontSizeState(size);
    saveJSON('lexicon-font-size', size);
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  // Dictionary file data stored in memory (too large for localStorage usually)
  const dictDataRef = useRef<Map<string, Record<string, any>>>(new Map());

  // Load dictionary entries from stored data
  useEffect(() => {
    dictionaries.forEach(d => {
      if (!dictDataRef.current.has(d.id)) {
        // Try loading from localStorage as fallback
        const data = loadJSON(`lexicon-dict-data-${d.id}`, null);
        if (data) {
          dictDataRef.current.set(d.id, data);
        }
      }
    });
  }, [dictionaries]);

  // Fetch word definition
  const lookupWord = useCallback(async (word: string, addToStack = true) => {
    const trimmed = word.trim().toLowerCase();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);
    setView('definition');

    // Add to history
    setHistory(prev => {
      const filtered = prev.filter(h => h.word.toLowerCase() !== trimmed);
      const updated = [{ word: trimmed, timestamp: Date.now() }, ...filtered].slice(0, 100);
      return updated;
    });

    // Check local dictionaries first
    let localResult: DictionaryEntry | null = null;
    for (const dict of dictionaries) {
      if (!dict.active) continue;
      const entries = dictDataRef.current.get(dict.id);
      if (entries && entries[trimmed]) {
        const entry = entries[trimmed];
        // Normalize to DictionaryEntry format
        if (typeof entry === 'string') {
          localResult = {
            word: trimmed,
            meanings: [{
              partOfSpeech: 'noun',
              definitions: [{ definition: entry }],
            }],
          };
        } else if (entry.meanings) {
          localResult = { word: trimmed, ...entry };
        } else if (entry.definition) {
          localResult = {
            word: trimmed,
            meanings: [{
              partOfSpeech: entry.partOfSpeech || 'noun',
              definitions: [{ definition: entry.definition, example: entry.example }],
            }],
            etymology: entry.etymology,
          };
        }
        break;
      }
    }

    if (localResult) {
      setCurrentEntry(localResult);
      if (addToStack) {
        setWordStack(prev => [...prev.slice(0, stackIndex + 1), localResult]);
        setStackIndex(prev => prev + 1);
      }
      setIsLoading(false);
      return;
    }

    // Fall back to DictionaryAPI.dev
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        throw new Error('Word not found');
      }
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const entry: DictionaryEntry = {
          word: data[0].word,
          phonetic: data[0].phonetic,
          phonetics: data[0].phonetics,
          meanings: data[0].meanings || [],
          origin: data[0].origin,
          sourceUrls: data[0].sourceUrls,
        };
        // Merge meanings from all results
        for (let i = 1; i < data.length; i++) {
          if (data[i].meanings) {
            entry.meanings.push(...data[i].meanings);
          }
          if (!entry.phonetic && data[i].phonetic) {
            entry.phonetic = data[i].phonetic;
          }
          if (!entry.origin && data[i].origin) {
            entry.origin = data[i].origin;
          }
        }
        setCurrentEntry(entry);
        if (addToStack) {
          setWordStack(prev => [...prev.slice(0, stackIndex + 1), entry]);
          setStackIndex(prev => prev + 1);
        }
      } else {
        throw new Error('No definitions found');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to look up word');
      setCurrentEntry(null);
    }

    setIsLoading(false);
  }, [dictionaries, stackIndex]);

  // Session navigation
  const canGoBack = stackIndex > 0;
  const canGoForward = stackIndex < wordStack.length - 1;

  const goBack = useCallback(() => {
    if (canGoBack) {
      const newIndex = stackIndex - 1;
      setStackIndex(newIndex);
      setCurrentEntry(wordStack[newIndex]);
      setView('definition');
    }
  }, [canGoBack, stackIndex, wordStack]);

  const goForward = useCallback(() => {
    if (canGoForward) {
      const newIndex = stackIndex + 1;
      setStackIndex(newIndex);
      setCurrentEntry(wordStack[newIndex]);
      setView('definition');
    }
  }, [canGoForward, stackIndex, wordStack]);

  // Bookmarks
  const isBookmarked = useCallback((word: string) => {
    return bookmarks.some(b => b.word.toLowerCase() === word.toLowerCase());
  }, [bookmarks]);

  const toggleBookmark = useCallback((word: string, partOfSpeech: string = '') => {
    setBookmarks(prev => {
      const exists = prev.find(b => b.word.toLowerCase() === word.toLowerCase());
      if (exists) {
        return prev.filter(b => b.word.toLowerCase() !== word.toLowerCase());
      }
      return [{ word, partOfSpeech, timestamp: Date.now() }, ...prev];
    });
  }, []);

  // Remove individual history item
  const removeHistoryItem = useCallback((timestamp: number) => {
    setHistory(prev => {
      const updated = prev.filter(h => h.timestamp !== timestamp);
      saveJSON('lexicon-history', updated);
      return updated;
    });
  }, []);

  // Search with wildcard support
  const searchDictionaries = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // Check if query has wildcards
    const hasWildcards = /[?*@#]/.test(query);
    const results: string[] = [];

    if (hasWildcards) {
      // Convert pattern to regex
      let pattern = query.toLowerCase()
        .replace(/\?/g, '[a-z]')
        .replace(/\*/g, '[a-z]*')
        .replace(/@/g, '[aeiou]')
        .replace(/#/g, '[bcdfghjklmnpqrstvwxyz]');
      
      try {
        const regex = new RegExp(`^${pattern}$`, 'i');
        for (const dict of dictionaries) {
          if (!dict.active) continue;
          const entries = dictDataRef.current.get(dict.id);
          if (entries) {
            for (const key of Object.keys(entries)) {
              if (regex.test(key) && results.length < 50) {
                if (!results.includes(key)) results.push(key);
              }
            }
          }
        }
      } catch { /* invalid regex */ }
    } else {
      // Prefix search
      const lower = query.toLowerCase();
      for (const dict of dictionaries) {
        if (!dict.active) continue;
        const entries = dictDataRef.current.get(dict.id);
        if (entries) {
          for (const key of Object.keys(entries)) {
            if (key.toLowerCase().startsWith(lower) && results.length < 50) {
              if (!results.includes(key)) results.push(key);
            }
          }
        }
      }
    }

    results.sort();
    setSearchResults(results);
  }, [dictionaries]);

  // Import dictionary
  const importDictionary = useCallback((name: string, data: Record<string, any>) => {
    const keys = Object.keys(data);
    const language = detectLanguage(keys);
    const id = `dict-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    
    const dict: CustomDictionary = {
      id,
      name,
      language,
      entryCount: keys.length,
      active: true,
      entries: {},
    };

    dictDataRef.current.set(id, data);
    
    // Try to save to localStorage
    try {
      saveJSON(`lexicon-dict-data-${id}`, data);
    } catch { /* too large */ }

    setDictionaries(prev => {
      const updated = [...prev, dict];
      saveJSON('lexicon-dicts', updated);
      return updated;
    });
  }, []);

  const toggleDictionary = useCallback((id: string) => {
    setDictionaries(prev => {
      const updated = prev.map(d => d.id === id ? { ...d, active: !d.active } : d);
      saveJSON('lexicon-dicts', updated);
      return updated;
    });
  }, []);

  const removeDictionary = useCallback((id: string) => {
    dictDataRef.current.delete(id);
    localStorage.removeItem(`lexicon-dict-data-${id}`);
    setDictionaries(prev => {
      const updated = prev.filter(d => d.id !== id);
      saveJSON('lexicon-dicts', updated);
      return updated;
    });
  }, []);

  const shuffleWotd = useCallback(() => {
    setWotdIndex(prev => {
      let next = Math.floor(Math.random() * WOTD_POOL.length);
      while (next === prev) next = Math.floor(Math.random() * WOTD_POOL.length);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveJSON('lexicon-history', []);
  }, []);

  return {
    // View
    view, setView,
    posFilter, setPosFilter,
    searchQuery, setSearchQuery,
    searchResults, setSearchResults,
    isSearching, setIsSearching,

    // Definition
    currentEntry, isLoading, error,
    lookupWord,

    // Navigation
    canGoBack, canGoForward, goBack, goForward,

    // Bookmarks
    bookmarks, isBookmarked, toggleBookmark,

    // History
    history, clearHistory, removeHistoryItem,

    // Dictionaries
    dictionaries, importDictionary, toggleDictionary, removeDictionary,
    searchDictionaries,

    // WOTD
    wotd: WOTD_POOL[wotdIndex],
    shuffleWotd,

    // Theme & appearance
    theme, setTheme,
    fontSize, setFontSize,
  };
}
