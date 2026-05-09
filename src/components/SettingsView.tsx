import { useCallback, useRef } from 'react';
import type { Store } from '../hooks/storeTypes';
import type { ThemeMode } from '../hooks/useStore';
import { PlusIcon, TrashIcon, FileIcon, ToggleOnIcon, ToggleOffIcon, SunIcon, MoonIcon, DropIcon } from './Icons';

interface SettingsViewProps {
  store: Store;
}

const THEME_OPTIONS: { key: ThemeMode; label: string; Icon: typeof SunIcon; preview: { bg: string; surface: string; text: string; accent: string } }[] = [
  {
    key: 'light',
    label: 'Light',
    Icon: SunIcon,
    preview: { bg: '#f5f0e8', surface: '#ffffff', text: '#1a1410', accent: '#a0620a' },
  },
  {
    key: 'dark',
    label: 'Dark',
    Icon: MoonIcon,
    preview: { bg: '#1a1a1a', surface: '#242424', text: '#e8e4dc', accent: '#5bb8b2' },
  },
  {
    key: 'amoled',
    label: 'AMOLED',
    Icon: DropIcon,
    preview: { bg: '#000000', surface: '#0a0a0a', text: '#d4d4d4', accent: '#d4a054' },
  },
];

export function SettingsView({ store }: SettingsViewProps) {
  const { dictionaries, importDictionary, toggleDictionary, removeDictionary, theme, setTheme, fontSize, setFontSize } = store;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (typeof data === 'object' && data !== null) {
        importDictionary(file.name, data);
      }
    } catch (err) {
      alert('Failed to parse dictionary file. Please ensure it\'s valid JSON.');
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [importDictionary]);

  return (
    <div className="pb-28 min-h-screen">
      <div className="px-6 pt-12 pb-4 max-w-[680px] mx-auto">
        <h1 className="font-display text-[clamp(1.75rem,5vw,2.5rem)] tracking-[-0.02em] text-text-primary leading-tight">
          Settings
        </h1>
        <p className="font-mono text-[0.6875rem] text-text-tertiary tracking-[0.04em] mt-1">
          Manage dictionaries & preferences
        </p>
      </div>

      {/* ═══ Theme Section ═══ */}
      <div className="px-6 mt-8 max-w-[680px] mx-auto">
        <h3 className="text-[0.75rem] uppercase tracking-[0.12em] text-text-secondary mb-4 font-body font-medium">
          Theme
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map(({ key, label, Icon, preview }) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={`theme-card ${theme === key ? 'active' : ''}`}
            >
              <div
                className="theme-card-preview"
                style={{ backgroundColor: preview.bg }}
              >
                <div
                  className="absolute top-2 left-2 right-2 h-3 rounded-[4px]"
                  style={{ backgroundColor: preview.surface }}
                />
                <div
                  className="absolute bottom-2 left-2 w-8 h-1.5 rounded-full"
                  style={{ backgroundColor: preview.accent }}
                />
                <span
                  className="absolute bottom-[6px] left-[10px] font-display text-[16px]"
                  style={{ color: preview.text }}
                >
                  Aa
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Icon size={14} className="text-text-tertiary" />
                <span className="text-[0.75rem] text-text-primary font-body">{label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Font Size Section ═══ */}
      <div className="px-6 mt-10 max-w-[680px] mx-auto">
        <h3 className="text-[0.75rem] uppercase tracking-[0.12em] text-text-secondary mb-4 font-body font-medium">
          Font Size
        </h3>
        <div className="bg-elevated border border-border-divider p-5 rounded-[10px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.75rem] font-mono text-text-tertiary">A</span>
            <span className="text-[0.875rem] font-mono text-text-secondary">{fontSize}px</span>
            <span className="text-[1.125rem] font-mono text-text-tertiary">A</span>
          </div>
          <input
            type="range"
            min={12}
            max={20}
            step={1}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full"
          />
          <p
            className="mt-4 text-text-secondary leading-relaxed border-t border-border-divider pt-4"
            style={{ fontSize: `${fontSize}px` }}
          >
            Preview text at {fontSize}px — The quick brown fox jumps over the lazy dog.
          </p>
        </div>
      </div>

      {/* ═══ Dictionaries Section ═══ */}
      <div className="px-6 mt-10 max-w-[680px] mx-auto">
        <h3 className="text-[0.75rem] uppercase tracking-[0.12em] text-text-secondary mb-4 font-body font-medium">
          Custom Dictionaries
        </h3>

        {dictionaries.length > 0 && (
          <div className="space-y-3 mb-4">
            {dictionaries.map((dict, i) => (
              <div
                key={dict.id}
                className="list-item-enter bg-elevated p-4 rounded-[15px] border border-border-divider flex items-center gap-4"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <FileIcon size={20} className="text-text-tertiary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-display text-base text-text-primary truncate">{dict.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[0.6875rem] text-text-tertiary tracking-[0.04em]">
                      {dict.entryCount.toLocaleString()} entries
                    </span>
                    <span className="inline-block px-1.5 py-0 text-[0.625rem] uppercase tracking-[0.08em] font-mono bg-card-hover text-text-secondary rounded-[6px]">
                      {dict.language}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleDictionary(dict.id)}
                  className="text-text-secondary hover:text-text-primary transition-colors"
                  title={dict.active ? 'Disable' : 'Enable'}
                >
                  {dict.active ? (
                    <ToggleOnIcon size={24} className="text-accent-teal" />
                  ) : (
                    <ToggleOffIcon size={24} className="text-text-tertiary" />
                  )}
                </button>
                <button
                  onClick={() => removeDictionary(dict.id)}
                  className="text-text-tertiary hover:text-accent-brick transition-colors"
                  title="Remove dictionary"
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Dictionary */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileImport}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-4 border border-dashed border-text-disabled rounded-[15px] flex items-center justify-center gap-2 text-text-secondary hover:border-text-tertiary hover:text-text-primary transition-all duration-200"
        >
          <PlusIcon size={20} />
          <span className="text-[0.875rem]">Import Dictionary (.json)</span>
        </button>

        <p className="mt-3 text-[0.6875rem] text-text-tertiary leading-relaxed">
          Import a JSON file with word entries. The format should be an object where keys are words 
          and values are definitions (string) or objects with <code className="font-mono bg-elevated px-1 rounded-[4px]">definition</code>, 
          <code className="font-mono bg-elevated px-1 rounded-[4px]">partOfSpeech</code>, and 
          <code className="font-mono bg-elevated px-1 rounded-[4px]">example</code> fields. 
          Language is auto-detected.
        </p>
      </div>

      {/* ═══ About Section ═══ */}
      <div className="px-6 mt-12 max-w-[480px] mx-auto">
        <h3 className="text-[0.75rem] uppercase tracking-[0.12em] text-text-secondary mb-4 font-body font-medium">
          About
        </h3>
        <div className="text-text-tertiary text-[0.875rem] leading-relaxed space-y-3">
          <p>
            <span className="font-display text-text-primary">Lexicon</span> is a personal dictionary 
            application designed for language discovery. It combines online lookup with offline 
            custom dictionaries for a hybrid reference experience.
          </p>
          <p>
            Powered by the free{' '}
            <a 
              href="https://dictionaryapi.dev" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-accent-teal hover:underline"
            >
              DictionaryAPI.dev
            </a>{' '}
            service for online lookups.
          </p>
          <p className="font-mono text-[0.6875rem] text-text-tertiary tracking-[0.04em]">
            Version 1.0.0 · Atelier Edition
          </p>
        </div>
      </div>
    </div>
  );
}
