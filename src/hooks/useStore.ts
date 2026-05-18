import { useState, useCallback, useEffect, useRef } from 'react';
import type { DictionaryEntry, Bookmark, HistoryItem, CustomDictionary, ViewMode, POSFilter, SQLiteDictionaryInfo, DictionaryLanguage, SearchResult } from '../types';
import { WOTD_POOL, detectLanguage } from '../data/words';
import {
  loadPersistedSQLiteDictionaries,
  openSQLiteDictionaryFile,
  removePersistedSQLiteDictionary,
  savePersistedSQLiteDictionaries,
  SQLiteDictionaryDatabase,
  type StoredSQLiteDictionary,
} from '../data/sqliteDictionary';
import { resolveDictionaryLanguage } from '../utils/dictionaryLanguage';

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

function normalizeSQLiteDictionaryInfo(
  dictionary: StoredSQLiteDictionary,
  index: number,
): StoredSQLiteDictionary {
  return {
    ...dictionary,
    id: dictionary.id || `sqlite-${dictionary.importedAt || Date.now()}-${index}`,
    language: resolveDictionaryLanguage(dictionary),
    active: dictionary.active ?? true,
  };
}

function withSQLiteSource(entry: DictionaryEntry, dictionary: SQLiteDictionaryInfo): DictionaryEntry {
  return {
    ...entry,
    sourceDictionaryId: dictionary.id,
    sourceDictionaryName: dictionary.name,
    sourceLanguage: resolveDictionaryLanguage(dictionary),
  };
}

function sqliteSearchResult(word: string, dictionary: SQLiteDictionaryInfo): SearchResult {
  return {
    word,
    sourceDictionaryId: dictionary.id,
    sourceDictionaryName: dictionary.name,
    sourceLanguage: resolveDictionaryLanguage(dictionary),
  };
}

export function useStore() {
  // View state
  const [view, setView] = useState<ViewMode>('home');
  const [posFilter, setPosFilter] = useState<POSFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
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

  // Theme & appearance
  const [theme, setThemeState] = useState<ThemeMode>(() => loadJSON('lexicon-theme', 'dark'));
  const [fontSize, setFontSizeState] = useState<number>(() => loadJSON('lexicon-font-size', 16));
  const [uiSize, setUiSizeState] = useState<number>(() => loadJSON('lexicon-ui-size', 16));

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

  // Reading text size
  const setFontSize = useCallback((size: number) => {
    setFontSizeState(size);
    saveJSON('lexicon-font-size', size);
  }, []);

  // Interface scale
  const setUiSize = useCallback((size: number) => {
    setUiSizeState(size);
    saveJSON('lexicon-ui-size', size);
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${uiSize}px`;
  }, [uiSize]);

  // Dictionary file data stored in memory (too large for localStorage usually)
  const dictDataRef = useRef<Map<string, Record<string, any>>>(new Map());
  const sqliteDictionaryRefs = useRef<Map<string, SQLiteDictionaryDatabase>>(new Map());
  const sqliteStoredRef = useRef<Map<string, StoredSQLiteDictionary>>(new Map());
  const searchRequestRef = useRef(0);
  const refreshedEntryRef = useRef<string | null>(null);
  const [sqliteDictionaries, setSQLiteDictionaries] = useState<SQLiteDictionaryInfo[]>([]);
  const [sqliteReady, setSQLiteReady] = useState(false);
  const [sqliteLoading, setSQLiteLoading] = useState(true);

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

  // Load persisted SQLite dictionary databases
  useEffect(() => {
    let cancelled = false;

    async function loadSQLiteDictionaries() {
      setSQLiteLoading(true);
      try {
        const persisted = await loadPersistedSQLiteDictionaries();
        if (persisted.length === 0) {
          if (!cancelled) {
            setSQLiteDictionaries([]);
            setSQLiteReady(false);
          }
          return;
        }

        const opened: Array<{ stored: StoredSQLiteDictionary; database: SQLiteDictionaryDatabase }> = [];
        for (let index = 0; index < persisted.length; index++) {
          const stored = normalizeSQLiteDictionaryInfo(persisted[index], index);
          try {
            const database = await SQLiteDictionaryDatabase.open(stored.bytes);
            opened.push({ stored, database });
          } catch {
            // Skip invalid persisted databases instead of blocking the whole app.
          }
        }

        if (cancelled) {
          opened.forEach(({ database }) => database.close());
          return;
        }

        sqliteDictionaryRefs.current.forEach(database => database.close());
        sqliteDictionaryRefs.current.clear();
        sqliteStoredRef.current.clear();

        opened.forEach(({ stored, database }) => {
          sqliteDictionaryRefs.current.set(stored.id, database);
          sqliteStoredRef.current.set(stored.id, stored);
        });

        const infos = opened.map(({ stored }) => {
          const { bytes: _bytes, ...info } = stored;
          return info;
        });
        setSQLiteDictionaries(infos);
        setSQLiteReady(infos.length > 0);
        if (infos.length > 0) {
          await savePersistedSQLiteDictionaries(opened.map(({ stored }) => stored));
        }
      } catch {
        if (!cancelled) {
          sqliteDictionaryRefs.current.forEach(database => database.close());
          sqliteDictionaryRefs.current.clear();
          sqliteStoredRef.current.clear();
          setSQLiteDictionaries([]);
          setSQLiteReady(false);
        }
      } finally {
        if (!cancelled) setSQLiteLoading(false);
      }
    }

    loadSQLiteDictionaries();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const dictionariesToUpdate = sqliteDictionaries.filter(dictionary => (
      dictionary.language !== resolveDictionaryLanguage(dictionary)
    ));

    if (dictionariesToUpdate.length === 0) return;

    setSQLiteDictionaries(prev => prev.map(dictionary => ({
      ...dictionary,
      language: resolveDictionaryLanguage(dictionary),
    })));

    dictionariesToUpdate.forEach(dictionary => {
      const stored = sqliteStoredRef.current.get(dictionary.id);
      if (stored) {
        sqliteStoredRef.current.set(dictionary.id, {
          ...stored,
          language: resolveDictionaryLanguage(stored),
        });
      }
    });
    void savePersistedSQLiteDictionaries(Array.from(sqliteStoredRef.current.values()));
  }, [sqliteDictionaries]);

  const lookupSQLiteWord = useCallback((word: string, preferredDictionaryId?: string): DictionaryEntry | null => {
    const preferredDictionary = preferredDictionaryId
      ? sqliteDictionaries.find(dictionary => dictionary.id === preferredDictionaryId && dictionary.active)
      : undefined;
    const lookupOrder = preferredDictionary
      ? [preferredDictionary, ...sqliteDictionaries.filter(dictionary => dictionary.id !== preferredDictionary.id)]
      : sqliteDictionaries;

    for (const dictionary of lookupOrder) {
      if (!dictionary.active) continue;
      const database = sqliteDictionaryRefs.current.get(dictionary.id);
      const result = database?.lookupWord(word);
      if (result) return withSQLiteSource(result, dictionary);
    }
    return null;
  }, [sqliteDictionaries]);

  const activeSQLiteCount = sqliteDictionaries.filter(dictionary => dictionary.active).length;
  const activeLegacyDictionaryCount = dictionaries.filter(dictionary => dictionary.active).length;

  const addHistoryEntry = useCallback((word: string, entry?: DictionaryEntry) => {
    const normalized = word.toLowerCase();
    setHistory(prev => {
      const filtered = prev.filter(h => h.word.toLowerCase() !== normalized);
      const updated = [{
        word: normalized,
        timestamp: Date.now(),
        sourceDictionaryId: entry?.sourceDictionaryId,
        sourceDictionaryName: entry?.sourceDictionaryName,
        sourceLanguage: entry?.sourceLanguage,
      }, ...filtered].slice(0, 100);
      return updated;
    });
  }, []);

  // Fetch word definition
  const lookupWord = useCallback(async (word: string, addToStack = true, preferredDictionaryId?: string) => {
    const trimmed = word.trim().toLowerCase();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);
    setView('definition');

    // Check imported SQLite dictionary first
    const sqliteResult = lookupSQLiteWord(trimmed, preferredDictionaryId);

    if (sqliteResult) {
      addHistoryEntry(trimmed, sqliteResult);
      setCurrentEntry(sqliteResult);
      if (addToStack) {
        setWordStack(prev => [...prev.slice(0, stackIndex + 1), sqliteResult]);
        setStackIndex(prev => prev + 1);
      }
      setIsLoading(false);
      return;
    }

    // Check legacy JSON dictionaries
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
        if (localResult) {
          localResult = {
            ...localResult,
            sourceDictionaryId: dict.id,
            sourceDictionaryName: dict.name,
            sourceLanguage: dict.language,
          };
        }
        break;
      }
    }

    if (localResult) {
      addHistoryEntry(trimmed, localResult);
      setCurrentEntry(localResult);
      if (addToStack) {
        setWordStack(prev => [...prev.slice(0, stackIndex + 1), localResult]);
        setStackIndex(prev => prev + 1);
      }
      setIsLoading(false);
      return;
    }

    if (sqliteLoading) {
      setError('Dictionary database is still loading.');
    } else if (activeSQLiteCount === 0 && activeLegacyDictionaryCount === 0) {
      setError('Import or enable a dictionary database in Settings before looking up words.');
    } else {
      setError('Word not found in the active dictionary databases.');
    }
    addHistoryEntry(trimmed);
    setCurrentEntry(null);
    setIsLoading(false);
  }, [activeLegacyDictionaryCount, activeSQLiteCount, addHistoryEntry, dictionaries, lookupSQLiteWord, stackIndex, sqliteLoading]);

  useEffect(() => {
    if (!sqliteReady || !currentEntry || activeSQLiteCount === 0) return;

    const refreshKey = `${currentEntry.word.toLowerCase()}:${stackIndex}:${sqliteDictionaries.map(dictionary => `${dictionary.id}:${dictionary.importedAt}:${dictionary.active}`).join('|')}`;
    if (refreshedEntryRef.current === refreshKey) return;

    const refreshedEntry = lookupSQLiteWord(currentEntry.word, currentEntry.sourceDictionaryId);
    if (!refreshedEntry) return;

    refreshedEntryRef.current = refreshKey;
    setCurrentEntry(refreshedEntry);
    if (stackIndex >= 0) {
      setWordStack(prev => prev.map((entry, index) => (
        index === stackIndex ? refreshedEntry : entry
      )));
    }
  }, [activeSQLiteCount, currentEntry, lookupSQLiteWord, sqliteDictionaries, sqliteReady, stackIndex]);

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
  const searchDictionaries = useCallback(async (query: string) => {
    const requestId = ++searchRequestRef.current;

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    if (activeSQLiteCount > 0) {
      const seen = new Set<string>();
      const results: SearchResult[] = [];
      for (const dictionary of sqliteDictionaries) {
        if (!dictionary.active) continue;
        const database = sqliteDictionaryRefs.current.get(dictionary.id);
        if (!database) continue;
        for (const word of database.searchWords(query, 50)) {
          const key = `${dictionary.id}:${word.toLowerCase()}`;
          if (seen.has(key)) continue;
          seen.add(key);
          results.push(sqliteSearchResult(word, dictionary));
          if (results.length >= 50) break;
        }
        if (results.length >= 50) break;
      }
      if (requestId === searchRequestRef.current) {
        setSearchResults(results);
      }
      return;
    }

    // Check if query has wildcards
    const hasWildcards = /[?*@#]/.test(query);
    const results: SearchResult[] = [];

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
                const resultKey = `${dict.id}:${key.toLowerCase()}`;
                if (!results.some(result => `${result.sourceDictionaryId}:${result.word.toLowerCase()}` === resultKey)) {
                  results.push({
                    word: key,
                    sourceDictionaryId: dict.id,
                    sourceDictionaryName: dict.name,
                    sourceLanguage: dict.language,
                  });
                }
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
              const resultKey = `${dict.id}:${key.toLowerCase()}`;
              if (!results.some(result => `${result.sourceDictionaryId}:${result.word.toLowerCase()}` === resultKey)) {
                results.push({
                  word: key,
                  sourceDictionaryId: dict.id,
                  sourceDictionaryName: dict.name,
                  sourceLanguage: dict.language,
                });
              }
            }
          }
        }
      }
    }

    results.sort((a, b) => a.word.localeCompare(b.word));
    if (requestId === searchRequestRef.current) {
      setSearchResults(results);
    }
  }, [activeSQLiteCount, dictionaries, sqliteDictionaries]);

  const importSQLiteDictionary = useCallback(async (file: File, language: DictionaryLanguage = 'en') => {
    setSQLiteLoading(true);
    try {
      const imported = await openSQLiteDictionaryFile(file, language);
      const stored: StoredSQLiteDictionary = {
        ...imported.info,
        bytes: imported.bytes,
      };
      sqliteDictionaryRefs.current.set(imported.info.id, imported.database);
      sqliteStoredRef.current.set(imported.info.id, stored);
      setSQLiteDictionaries(prev => [...prev, imported.info]);
      setSQLiteReady(true);
      await savePersistedSQLiteDictionaries(Array.from(sqliteStoredRef.current.values()));
    } finally {
      setSQLiteLoading(false);
    }
  }, []);

  const toggleSQLiteDictionary = useCallback(async (id: string) => {
    const stored = sqliteStoredRef.current.get(id);
    if (stored) {
      const updatedStored = { ...stored, active: !stored.active };
      sqliteStoredRef.current.set(id, updatedStored);
      await savePersistedSQLiteDictionaries(Array.from(sqliteStoredRef.current.values()));
    }
    setSQLiteDictionaries(prev => prev.map(dictionary => (
      dictionary.id === id ? { ...dictionary, active: !dictionary.active } : dictionary
    )));
  }, []);

  const setSQLiteDictionaryLanguage = useCallback(async (id: string, language: DictionaryLanguage) => {
    const stored = sqliteStoredRef.current.get(id);
    if (stored) {
      sqliteStoredRef.current.set(id, { ...stored, language });
      await savePersistedSQLiteDictionaries(Array.from(sqliteStoredRef.current.values()));
    }
    setSQLiteDictionaries(prev => prev.map(dictionary => (
      dictionary.id === id ? { ...dictionary, language } : dictionary
    )));
  }, []);

  const removeSQLiteDictionary = useCallback(async (id: string) => {
    setSQLiteLoading(true);
    try {
      sqliteDictionaryRefs.current.get(id)?.close();
      sqliteDictionaryRefs.current.delete(id);
      sqliteStoredRef.current.delete(id);
      const remaining = Array.from(sqliteStoredRef.current.values());
      setSQLiteDictionaries(prev => prev.filter(dictionary => dictionary.id !== id));
      setSQLiteReady(remaining.length > 0);
      setSearchResults([]);
      if (remaining.length > 0) {
        await savePersistedSQLiteDictionaries(remaining);
      } else {
        await removePersistedSQLiteDictionary();
      }
    } finally {
      setSQLiteLoading(false);
    }
  }, []);

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
    sqliteDictionaries, sqliteReady, sqliteLoading, importSQLiteDictionary, toggleSQLiteDictionary, setSQLiteDictionaryLanguage, removeSQLiteDictionary,

    // WOTD
    wotd: WOTD_POOL[wotdIndex],
    shuffleWotd,

    // Theme & appearance
    theme, setTheme,
    fontSize, setFontSize,
    uiSize, setUiSize,
  };
}
