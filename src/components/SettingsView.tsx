import { useCallback, useRef } from 'react';
import type { Store } from '../hooks/storeTypes';
import type { ThemeMode } from '../hooks/useStore';
import { PlusIcon, TrashIcon, FileIcon, CheckCircleIcon, SunIcon, MoonIcon, DropIcon } from './Icons';

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
  const {
    sqliteDictionary,
    sqliteLoading,
    importSQLiteDictionary,
    removeSQLiteDictionary,
    theme,
    setTheme,
    fontSize,
    setFontSize,
  } = store;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await importSQLiteDictionary(file);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import SQLite dictionary database.';
      alert(message);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [importSQLiteDictionary]);

  return (
    <div className="pb-28 min-h-screen">
      <div className="px-6 pt-12 pb-4 max-w-[680px] mx-auto">
        <h1 className="font-display text-[clamp(1.75rem,5vw,2.5rem)] tracking-[-0.02em] text-text-primary leading-tight">
          Settings
        </h1>
        <p className="font-mono text-[0.6875rem] text-text-tertiary tracking-[0.04em] mt-1">
          Manage dictionary database & preferences
        </p>
      </div>

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
            Preview text at {fontSize}px - The quick brown fox jumps over the lazy dog.
          </p>
        </div>
      </div>

      <div className="px-6 mt-10 max-w-[680px] mx-auto">
        <h3 className="text-[0.75rem] uppercase tracking-[0.12em] text-text-secondary mb-4 font-body font-medium">
          Dictionary Database
        </h3>

        {sqliteDictionary && (
          <div className="space-y-3 mb-4">
            <div className="list-item-enter bg-elevated p-4 rounded-[15px] border border-border-divider flex items-center gap-4">
              <FileIcon size={20} className="text-text-tertiary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-display text-base text-text-primary truncate">{sqliteDictionary.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[0.6875rem] text-text-tertiary tracking-[0.04em]">
                    {sqliteDictionary.entryCount.toLocaleString()} words
                  </span>
                  <span className="inline-block px-1.5 py-0 text-[0.625rem] uppercase tracking-[0.08em] font-mono bg-card-hover text-text-secondary rounded-[6px]">
                    SQLite
                  </span>
                </div>
              </div>
              <CheckCircleIcon size={22} className="text-accent-teal flex-shrink-0" />
              <button
                onClick={removeSQLiteDictionary}
                disabled={sqliteLoading}
                className="text-text-tertiary hover:text-accent-brick transition-colors disabled:opacity-40"
                title="Remove database"
              >
                <TrashIcon size={16} />
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".db,.db3,.sqlite,.sqlite3,application/x-sqlite3,application/vnd.sqlite3"
          onChange={handleFileImport}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={sqliteLoading}
          className="w-full py-4 border border-dashed border-text-disabled rounded-[15px] flex items-center justify-center gap-2 text-text-secondary hover:border-text-tertiary hover:text-text-primary transition-all duration-200 disabled:opacity-50"
        >
          <PlusIcon size={20} />
          <span className="text-[0.875rem]">
            {sqliteDictionary ? 'Replace SQLite Database' : 'Import SQLite Database'}
          </span>
        </button>

        <p className="mt-3 text-[0.6875rem] text-text-tertiary leading-relaxed">
          Import a SQLite file using the WordWeb-style schema with <code className="font-mono bg-elevated px-1 rounded-[4px]">unique_words</code>,
          {' '}<code className="font-mono bg-elevated px-1 rounded-[4px]">word_senses</code>,
          {' '}<code className="font-mono bg-elevated px-1 rounded-[4px]">definitions</code>, and
          {' '}<code className="font-mono bg-elevated px-1 rounded-[4px]">word_types</code> tables.
        </p>
      </div>

      <div className="px-6 mt-12 max-w-[480px] mx-auto">
        <h3 className="text-[0.75rem] uppercase tracking-[0.12em] text-text-secondary mb-4 font-body font-medium">
          About
        </h3>
        <div className="text-text-tertiary text-[0.875rem] leading-relaxed space-y-3">
          <p>
            <span className="font-display text-text-primary">Lexicon</span> is a personal dictionary
            application designed for language discovery. It reads definitions from an imported
            SQLite dictionary database and keeps lookup history on this device.
          </p>
          <p className="font-mono text-[0.6875rem] text-text-tertiary tracking-[0.04em]">
            Version 1.0.0 - Atelier Edition
          </p>
        </div>
      </div>
    </div>
  );
}
