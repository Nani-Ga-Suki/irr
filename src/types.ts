export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics?: Array<{
    text?: string;
    audio?: string;
  }>;
  meanings: Meaning[];
  etymology?: string;
  sourceUrls?: string[];
  origin?: string;
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms?: string[];
  antonyms?: string[];
}

export interface Definition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

export interface Bookmark {
  word: string;
  partOfSpeech: string;
  timestamp: number;
}

export interface HistoryItem {
  word: string;
  timestamp: number;
}

export interface CustomDictionary {
  id: string;
  name: string;
  language: 'en' | 'pt';
  entryCount: number;
  active: boolean;
  entries: Record<string, any>;
}

export interface SQLiteDictionaryInfo {
  name: string;
  size: number;
  importedAt: number;
  entryCount: number;
}

export type ViewMode = 'home' | 'definition' | 'bookmarks' | 'history' | 'settings';
export type POSFilter = 'all' | 'noun' | 'verb' | 'adjective' | 'adverb';
