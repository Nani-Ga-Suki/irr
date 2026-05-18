import { useState, useEffect, useRef, useCallback } from 'react';
import type { Store } from '../hooks/storeTypes';
import type { POSFilter } from '../types';
import { LinkedText } from './LinkedText';
import { ChevronLeftIcon } from './Icons';
import { capitalizeWords } from '../utils/formatText';

interface DefinitionViewProps {
  store: Store;
}

const POS_FILTERS: { label: string; value: POSFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Noun', value: 'noun' },
  { label: 'Verb', value: 'verb' },
  { label: 'Adj', value: 'adjective' },
  { label: 'Adv', value: 'adverb' },
];

const EXAMPLE_MARKER = '\u2022';
const NARROWER_MARKER = '\u2192';

interface RelationLineProps {
  marker: string;
  words?: string[];
  onWordClick: (word: string) => void;
  fontSize: string;
}

function RelationLine({ marker, words, onWordClick, fontSize }: RelationLineProps) {
  if (!words || words.length === 0) return null;

  const visibleWords = words.slice(0, 8);

  return (
    <div className="mt-1 flex items-baseline gap-2 text-text-secondary leading-relaxed" style={{ fontSize }}>
      <span className="w-4 flex-shrink-0 font-mono text-text-tertiary text-right" aria-hidden="true">
        {marker}
      </span>
      <span className="min-w-0">
        {visibleWords.map((word, index) => (
          <span key={`${marker}-${word}`}>
            <button
              onClick={() => onWordClick(word)}
              className="hover:text-text-primary transition-colors"
            >
              {capitalizeWords(word)}
            </button>
            {index < visibleWords.length - 1 && <span>, </span>}
          </span>
        ))}
      </span>
    </div>
  );
}

export function DefinitionView({ store }: DefinitionViewProps) {
  const { currentEntry, isLoading, error, posFilter, setPosFilter, fontSize } = store;
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [titleOverflows, setTitleOverflows] = useState(false);
  const titleInnerRef = useRef<HTMLHeadingElement>(null);

  // Check if title overflows
  useEffect(() => {
    if (titleInnerRef.current && titleRef.current) {
      setTitleOverflows(titleInnerRef.current.scrollWidth > titleRef.current.clientWidth);
    }
  }, [currentEntry?.word]);

  // Sticky header on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (titleRef.current) {
        const rect = titleRef.current.getBoundingClientRect();
        setShowStickyHeader(rect.bottom < 0);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top on entry change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentEntry?.word]);

  const handleWordClick = useCallback((word: string) => {
    store.lookupWord(word);
  }, [store]);

  if (isLoading) {
    return (
      <div className="pb-28 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-[4rem] text-text-disabled leading-none animate-pulse">…</p>
          <p className="text-text-tertiary mt-4 text-[0.9375rem]">Looking up word</p>
        </div>
      </div>
    );
  }

  if (error || !currentEntry) {
    return (
      <div className="pb-28 min-h-screen">
        <div className="px-6 pt-6 max-w-[680px] mx-auto">
          <button
            onClick={() => store.setView('home')}
            className="flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors mb-8"
          >
            <ChevronLeftIcon className="w-5 h-5" />
            <span className="text-[0.875rem]">Back</span>
          </button>
        </div>
        <div className="px-6 mt-16 max-w-[680px] mx-auto text-center">
          <p className="font-display text-[4rem] text-text-disabled leading-none">∅</p>
          <h3 className="font-display text-[1.25rem] text-text-primary mt-4">Word not found</h3>
          <p className="text-text-tertiary mt-2 text-[0.9375rem]">
            {error || 'No definitions available for this word.'}
          </p>
        </div>
      </div>
    );
  }

  // Filter meanings by POS
  const filteredMeanings = posFilter === 'all'
    ? currentEntry.meanings
    : currentEntry.meanings.filter(m => m.partOfSpeech.toLowerCase() === posFilter);

  // Aggregate antonyms for the section below the definition list
  const allAntonyms = new Set<string>();
  currentEntry.meanings.forEach(m => {
    m.antonyms?.forEach(a => allAntonyms.add(a));
    m.definitions.forEach(d => {
      d.antonyms?.forEach(a => allAntonyms.add(a));
    });
  });

  const phonetic = currentEntry.phonetic || 
    currentEntry.phonetics?.find(p => p.text)?.text || '';

  const etymology = currentEntry.origin || currentEntry.etymology || '';
  const definitionTextSize = `${fontSize}px`;
  const supportingTextSize = `${Math.max(12, fontSize - 1)}px`;

  return (
    <div className="pb-28 min-h-screen" ref={scrollRef}>
      {/* Sticky Header */}
      <div
        className={`definition-sticky-header fixed top-0 left-0 right-0 z-40 px-4 pt-3 ${showStickyHeader ? 'is-visible' : 'is-hidden pointer-events-none'}`}
        aria-hidden={!showStickyHeader}
      >
        <div className="max-w-[680px] mx-auto">
          <div className="glass-word-header px-3 py-2">
            <button
              tabIndex={showStickyHeader ? 0 : -1}
              onClick={() => store.setView('home')}
              className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors rounded-full hover:bg-elevated flex-shrink-0"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <h2 className="font-display text-lg text-text-primary tracking-[-0.02em] truncate pr-2 min-w-0 flex-1">
              {capitalizeWords(currentEntry.word)}
            </h2>
          </div>
        </div>
      </div>

      {/* Back button */}
      <div className="px-6 pt-6 max-w-[680px] mx-auto">
        <button
          onClick={() => store.setView('home')}
          className="flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronLeftIcon className="w-5 h-5" />
          <span className="text-[0.875rem]">Back</span>
        </button>
      </div>

      {/* Headword */}
      <div className="px-6 pt-6 pb-2 max-w-[680px] mx-auto" ref={titleRef}>
        <div className={titleOverflows ? 'marquee-container overflow-hidden' : ''}>
          <h1
            ref={titleInnerRef}
            className={`font-display tracking-[-0.02em] text-text-primary leading-tight whitespace-nowrap ${titleOverflows ? 'inline-block' : ''}`}
            style={{ 
              fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
              animation: titleOverflows ? 'marquee 10s linear infinite' : undefined,
            }}
          >
            {titleOverflows ? (
              <>
                {capitalizeWords(currentEntry.word)}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{capitalizeWords(currentEntry.word)}
              </>
            ) : capitalizeWords(currentEntry.word)}
          </h1>
        </div>
        {phonetic && (
          <p className="font-mono text-[0.9em] text-text-tertiary tracking-[0.04em] mt-1">
            {phonetic}
          </p>
        )}
      </div>

      {/* POS Chips */}
      <div className="px-6 mt-4 max-w-[680px] mx-auto">
        <div className="flex flex-wrap gap-2">
          {POS_FILTERS.map(f => {
            const hasEntries = f.value === 'all' || currentEntry.meanings.some(
              m => m.partOfSpeech.toLowerCase() === f.value
            );
            if (!hasEntries && f.value !== 'all') return null;
            return (
              <button
                key={f.value}
                onClick={() => setPosFilter(f.value)}
                className={`px-2 py-0.5 text-[0.6875rem] uppercase tracking-[0.04em] rounded-[8px] transition-all duration-150 font-mono ${
                  posFilter === f.value
                    ? 'bg-deep text-canvas'
                    : 'bg-card-hover text-text-secondary hover:text-text-primary'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Etymology */}
      {etymology && (
        <div className="px-6 mt-6 max-w-[680px] mx-auto">
          <div className="border-l-2 border-l-accent-brown bg-warm-card pl-4 pr-4 py-3 rounded-r-[15px]">
            <p className="text-[0.75rem] uppercase tracking-[0.12em] text-text-secondary mb-1 font-body font-medium">
              Etymology
            </p>
            <p className="text-text-secondary italic leading-relaxed" style={{ fontSize: supportingTextSize }}>
              <LinkedText text={etymology} onWordClick={handleWordClick} />
            </p>
          </div>
        </div>
      )}

      {/* Sense Blocks */}
      <div className="px-6 mt-6 max-w-[680px] mx-auto space-y-10">
        {filteredMeanings.map((meaning, mi) => (
          <div key={mi}>
            {/* POS Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-px bg-border-strong" />
              <h3 className="text-text-secondary text-[0.8125rem] tracking-[0.08em]" style={{ fontVariant: 'small-caps' }}>
                {meaning.partOfSpeech}
              </h3>
            </div>

            {/* Definitions */}
            <div className="space-y-5">
              {meaning.definitions.map((def, di) => (
                <div key={di} className="flex gap-4">
                  {/* Marginalia number */}
                  <div className="def-number w-6 flex-shrink-0 pt-0.5 text-right">
                    {di + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="leading-relaxed text-text-primary" style={{ fontSize: definitionTextSize }}>
                      <LinkedText text={capitalizeWords(def.definition)} onWordClick={handleWordClick} />
                    </p>
                    {(def.examples?.length ? def.examples : def.example ? [def.example] : []).map(example => (
                      <p key={example} className="mt-1.5 flex items-start gap-2 text-text-secondary italic leading-relaxed" style={{ fontSize: supportingTextSize }}>
                        <span className="text-text-tertiary not-italic" aria-hidden="true">{EXAMPLE_MARKER}</span>
                        <span className="min-w-0">
                          <LinkedText text={`"${capitalizeWords(example)}"`} onWordClick={handleWordClick} />
                        </span>
                      </p>
                    ))}
                    <RelationLine marker="=" words={def.synonyms} onWordClick={handleWordClick} fontSize={supportingTextSize} />
                    <RelationLine marker="~" words={def.broader} onWordClick={handleWordClick} fontSize={supportingTextSize} />
                    <RelationLine marker={NARROWER_MARKER} words={def.narrower} onWordClick={handleWordClick} fontSize={supportingTextSize} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Antonyms */}
      {allAntonyms.size > 0 && (
        <div className="px-6 mt-10 max-w-[680px] mx-auto">
          <div>
            <h4 className="text-[0.75rem] uppercase tracking-[0.12em] text-text-secondary mb-3 font-body font-medium">
              Antonyms
            </h4>
            <div className="flex flex-wrap gap-2">
              {Array.from(allAntonyms).slice(0, 12).map(ant => (
                <button
                  key={ant}
                  onClick={() => handleWordClick(ant)}
                  className="text-[0.8125rem] text-text-secondary border border-text-disabled px-3 py-1 rounded-[8px] hover:bg-deep hover:text-canvas hover:border-deep transition-all duration-150"
                >
                  {capitalizeWords(ant)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom spacer */}
      <div className="h-20" />
    </div>
  );
}
