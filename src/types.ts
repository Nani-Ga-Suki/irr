export interface DictionaryEntry {
  word: string;
  sourceDictionaryId?: string;
  sourceDictionaryName?: string;
  sourceLanguage?: DictionaryLanguage;
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
  examples?: string[];
  synonyms?: string[];
  antonyms?: string[];
  broader?: string[];
  narrower?: string[];
}

export interface Bookmark {
  word: string;
  partOfSpeech: string;
  timestamp: number;
}

export interface HistoryItem {
  word: string;
  timestamp: number;
  sourceDictionaryId?: string;
  sourceDictionaryName?: string;
  sourceLanguage?: DictionaryLanguage;
}

export interface SearchResult {
  word: string;
  sourceDictionaryId?: string;
  sourceDictionaryName?: string;
  sourceLanguage?: DictionaryLanguage;
}

export interface CustomDictionary {
  id: string;
  name: string;
  language: DictionaryLanguage;
  entryCount: number;
  active: boolean;
  entries: Record<string, any>;
}

export type DictionaryLanguage = 'en' | 'pt' | 'es' | 'fr' | 'de' | 'it' | 'other';

export interface SQLiteDictionaryInfo {
  id: string;
  name: string;
  size: number;
  importedAt: number;
  entryCount: number;
  language: DictionaryLanguage;
  active: boolean;
}

export type ViewMode = 'home' | 'definition' | 'bookmarks' | 'history' | 'settings';
export type POSFilter = 'all' | 'noun' | 'verb' | 'adjective' | 'adverb';
