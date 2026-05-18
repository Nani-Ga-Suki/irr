import type { DictionaryLanguage } from '../types';

export const LANGUAGE_OPTIONS: Array<{ key: DictionaryLanguage; label: string }> = [
  { key: 'en', label: 'English' },
  { key: 'pt', label: 'Brazilian Portuguese' },
  { key: 'es', label: 'Spanish' },
  { key: 'fr', label: 'French' },
  { key: 'de', label: 'German' },
  { key: 'it', label: 'Italian' },
  { key: 'other', label: 'Other' },
];

export function languageLabel(language: DictionaryLanguage) {
  return LANGUAGE_OPTIONS.find(option => option.key === language)?.label ?? 'Other';
}

export function inferDictionaryLanguageFromName(name: string): DictionaryLanguage | null {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');

  if (/(^|_)(pt|pt_br|br|brazilian|portuguese|portugues)($|_)/.test(normalized)) return 'pt';
  if (/(^|_)(en|eng|english|wordweb)($|_)/.test(normalized)) return 'en';
  if (/(^|_)(es|spa|spanish|espanol)($|_)/.test(normalized)) return 'es';
  if (/(^|_)(fr|fre|fra|french|francais)($|_)/.test(normalized)) return 'fr';
  if (/(^|_)(de|ger|deu|german|deutsch)($|_)/.test(normalized)) return 'de';
  if (/(^|_)(it|ita|italian|italiano)($|_)/.test(normalized)) return 'it';

  return null;
}

export function resolveDictionaryLanguage(
  dictionary: { name?: string; language?: DictionaryLanguage },
): DictionaryLanguage {
  const inferred = dictionary.name ? inferDictionaryLanguageFromName(dictionary.name) : null;

  if (dictionary.language && dictionary.language !== 'en') {
    return dictionary.language;
  }

  return inferred || dictionary.language || 'en';
}
