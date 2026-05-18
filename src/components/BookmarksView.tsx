import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Store } from '../hooks/storeTypes';
import type { Bookmark } from '../types';
import {
  TrashIcon, SearchIcon, BookmarkIcon,
  ShareIcon, PencilIcon, DotsThreeIcon,
  XIcon, CheckIcon, DownloadIcon, UploadIcon,
} from './Icons';
import { capitalizeWords } from '../utils/formatText';

interface BookmarksViewProps {
  store: Store;
}

type TabKey = 'saved' | 'history';

// ─── Date grouping ────────────────────────────────────────
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
  return order.filter(l => groups.has(l)).map(l => ({ label: l, items: groups.get(l)! }));
}

// ─── Swipe-to-delete item ─────────────────────────────────
function SwipeItem({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const [offset, setOffset] = useState(0);
  const [exiting, setExiting] = useState(false);
  const threshold = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    isDraggingRef.current = true;
    currentXRef.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const clamped = Math.min(0, Math.max(e.touches[0].clientX - startXRef.current, -120));
    currentXRef.current = clamped;
    setOffset(clamped);
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
    if (currentXRef.current < -threshold) { setExiting(true); setTimeout(() => onDelete(), 300); }
    else setOffset(0);
  }, [onDelete]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    startXRef.current = e.clientX;
    isDraggingRef.current = true;
    currentXRef.current = 0;
    const mv = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const clamped = Math.min(0, Math.max(ev.clientX - startXRef.current, -120));
      currentXRef.current = clamped;
      setOffset(clamped);
    };
    const up = () => {
      isDraggingRef.current = false;
      if (currentXRef.current < -threshold) { setExiting(true); setTimeout(() => onDelete(), 300); }
      else setOffset(0);
      window.removeEventListener('mousemove', mv);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', mv);
    window.addEventListener('mouseup', up);
  }, [onDelete]);

  if (exiting) return <div className="item-exit" style={{ overflow: 'hidden' }}>{children}</div>;

  return (
    <div className="swipe-item">
      <div className="swipe-item-action"><TrashIcon size={20} /></div>
      <div
        className="swipe-item-content"
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDraggingRef.current ? 'none' : 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Confirmation Dialog ──────────────────────────────────
function ConfirmDialog({ open, title, message, onConfirm, onCancel }: {
  open: boolean; title: string; message: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-box" onClick={e => e.stopPropagation()}>
        <h3 className="font-display text-lg text-text-primary">{title}</h3>
        <p className="mt-2 text-[0.875rem] text-text-secondary leading-relaxed">{message}</p>
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-[10px] border border-border-divider text-text-secondary text-[0.875rem] hover:bg-elevated transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-[10px] bg-accent-brick text-white text-[0.875rem] hover:opacity-90 transition-opacity">
            Clear all
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Animated Title ───────────────────────────────────────
function AnimatedTitle({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState(text);
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const pendingRef = useRef(text);

  useEffect(() => {
    if (text === displayed && phase === 'idle') return;
    if (text === displayed) return;
    pendingRef.current = text;
    setPhase('out');
  }, [text]);

  const handleAnimEnd = () => {
    if (phase === 'out') {
      setDisplayed(pendingRef.current);
      setPhase('in');
    } else if (phase === 'in') {
      setPhase('idle');
    }
  };

  const cls = phase === 'out' ? 'title-out' : phase === 'in' ? 'title-in' : '';

  return (
    <h1
      className={`font-display text-[clamp(1.75rem,5vw,2.5rem)] tracking-[-0.02em] text-text-primary leading-tight ${cls}`}
      onAnimationEnd={handleAnimEnd}
    >
      {displayed}
    </h1>
  );
}

// ─── Main BookmarksView ───────────────────────────────────
export function BookmarksView({ store }: BookmarksViewProps) {
  const { bookmarks, history, clearHistory, removeHistoryItem } = store;
  const [activeTab, setActiveTab] = useState<TabKey>('saved');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingWord, setEditingWord] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ top: 0, right: 0 });
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const contextMenuButtonRef = useRef<HTMLButtonElement>(null);
  const contextMenuPortalRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const isDragging = useRef(false);
  const deltaRef = useRef(0);

  const handleWordClick = useCallback((word: string, sourceDictionaryId?: string) => {
    if (editMode) return;
    store.lookupWord(word, true, sourceDictionaryId);
  }, [store, editMode]);

  const handleRemoveBookmark = useCallback((word: string) => {
    store.toggleBookmark(word);
  }, [store]);

  // Rename bookmark (re-add with new word)
  const handleRenameConfirm = useCallback(() => {
    if (!editingWord || !editValue.trim() || editValue.trim() === editingWord) {
      setEditingWord(null);
      return;
    }
    const bm = bookmarks.find(b => b.word === editingWord);
    if (bm) {
      store.toggleBookmark(editingWord); // remove old
      store.toggleBookmark(editValue.trim(), bm.partOfSpeech); // add new
    }
    setEditingWord(null);
  }, [editingWord, editValue, bookmarks, store]);

  // Tab swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX; isDragging.current = true; deltaRef.current = 0;
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    deltaRef.current = e.touches[0].clientX - startXRef.current;
  }, []);
  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (deltaRef.current < -60 && activeTab === 'saved') setActiveTab('history');
    else if (deltaRef.current > 60 && activeTab === 'history') setActiveTab('saved');
  }, [activeTab]);
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    startXRef.current = e.clientX; isDragging.current = true; deltaRef.current = 0;
  }, []);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return; deltaRef.current = e.clientX - startXRef.current;
  }, []);
  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (deltaRef.current < -60 && activeTab === 'saved') setActiveTab('history');
    else if (deltaRef.current > 60 && activeTab === 'history') setActiveTab('saved');
  }, [activeTab]);

  const updateContextMenuPosition = useCallback(() => {
    const rect = contextMenuButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setContextMenuPosition({
      top: rect.bottom + 6,
      right: Math.max(12, window.innerWidth - rect.right),
    });
  }, []);

  const handleContextMenuToggle = useCallback(() => {
    updateContextMenuPosition();
    setShowContextMenu(p => !p);
  }, [updateContextMenuPosition]);

  // Close context menu on outside click
  useEffect(() => {
    if (!showContextMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedButton = contextMenuButtonRef.current?.contains(target);
      const clickedMenu = contextMenuPortalRef.current?.contains(target);
      if (!clickedButton && !clickedMenu) {
        setShowContextMenu(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [showContextMenu]);

  useEffect(() => {
    if (!showContextMenu) return;
    updateContextMenuPosition();
    window.addEventListener('resize', updateContextMenuPosition);
    window.addEventListener('scroll', updateContextMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateContextMenuPosition);
      window.removeEventListener('scroll', updateContextMenuPosition, true);
    };
  }, [showContextMenu, updateContextMenuPosition]);

  // Share bookmarks list
  const handleShareBookmarks = useCallback(async () => {
    const text = bookmarks.map(b => b.word).join('\n');
    try {
      if (navigator.share) await navigator.share({ title: 'My Lexicon Bookmarks', text });
      else await navigator.clipboard.writeText(text);
    } catch { try { await navigator.clipboard.writeText(text); } catch {} }
  }, [bookmarks]);

  // Share history list
  const handleShareHistory = useCallback(async () => {
    const text = history.map(h => h.word).join('\n');
    try {
      if (navigator.share) await navigator.share({ title: 'My Lexicon History', text });
      else await navigator.clipboard.writeText(text);
    } catch { try { await navigator.clipboard.writeText(text); } catch {} }
  }, [history]);

  // Export bookmarks as JSON
  const handleExport = useCallback(() => {
    setShowContextMenu(false);
    const data = JSON.stringify(bookmarks, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'lexicon-bookmarks.json'; a.click();
    URL.revokeObjectURL(url);
  }, [bookmarks]);

  // Import bookmarks from JSON
  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as Bookmark[];
      if (Array.isArray(data)) {
        data.forEach(b => {
          if (b.word && !store.isBookmarked(b.word)) {
            store.toggleBookmark(b.word, b.partOfSpeech || '');
          }
        });
      }
    } catch { /* invalid file */ }
    if (importRef.current) importRef.current.value = '';
    setShowContextMenu(false);
  }, [store]);

  const savedGroups = groupByDate(bookmarks);
  const historyGroups = groupByDate(history);

  return (
    <div className="pb-28 min-h-screen">
      {/* ─── Header ─── */}
      <div className="sticky top-0 z-40 bg-canvas">
        <div className="px-6 pt-12 pb-2 max-w-[680px] mx-auto">
          <div className="flex items-start justify-between">
            <AnimatedTitle text={activeTab === 'saved' ? 'Saved' : 'History'} />

          {/* Header actions */}
          <div className="flex items-center gap-1 mt-1">
            {activeTab === 'saved' ? (
              <>
                {/* Share saved list */}
                <button
                  onClick={handleShareBookmarks}
                  className="w-9 h-9 flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors rounded-[8px] hover:bg-elevated"
                  title="Share bookmarks"
                >
                  <ShareIcon size={18} />
                </button>

                {/* Edit mode toggle */}
                <button
                  onClick={() => { setEditMode(p => !p); setEditingWord(null); }}
                  className={`w-9 h-9 flex items-center justify-center transition-colors rounded-[8px] ${
                    editMode ? 'text-accent-teal bg-elevated' : 'text-text-tertiary hover:text-text-primary hover:bg-elevated'
                  }`}
                  title={editMode ? 'Done editing' : 'Edit bookmarks'}
                >
                  <PencilIcon size={18} filled={editMode} />
                </button>

                {/* Context menu toggle */}
                <div className="relative" ref={contextMenuRef}>
                  <button
                    ref={contextMenuButtonRef}
                    onClick={handleContextMenuToggle}
                    className="w-9 h-9 flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors rounded-[8px] hover:bg-elevated"
                    title="More options"
                  >
                    <DotsThreeIcon size={18} />
                  </button>

                </div>

                {/* Hidden import file input */}
                <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
              </>
            ) : (
              <>
                {/* Share history */}
                <button
                  onClick={handleShareHistory}
                  className="w-9 h-9 flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors rounded-[8px] hover:bg-elevated"
                  title="Share history"
                >
                  <ShareIcon size={18} />
                </button>

                {/* Clear history */}
                {history.length > 0 && (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="w-9 h-9 flex items-center justify-center text-text-tertiary hover:text-accent-brick transition-colors rounded-[8px] hover:bg-elevated"
                    title="Clear all history"
                  >
                    <TrashIcon size={18} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Tab bar ─── */}
      <div className="px-6 max-w-[680px] mx-auto">
        <div className="relative flex border-b border-border-divider">
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-3 text-center text-[0.8125rem] font-mono tracking-[0.04em] uppercase transition-colors duration-200 ${
              activeTab === 'saved' ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            Saved
            <span className="ml-1.5 text-[0.6875rem] text-text-tertiary">{bookmarks.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-center text-[0.8125rem] font-mono tracking-[0.04em] uppercase transition-colors duration-200 ${
              activeTab === 'history' ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            History
            <span className="ml-1.5 text-[0.6875rem] text-text-tertiary">{history.length}</span>
          </button>
          <div
            className="tab-indicator absolute bottom-0 left-0 h-[2px] bg-accent-teal"
            style={{ width: '50%', transform: activeTab === 'history' ? 'translateX(100%)' : 'translateX(0)' }}
          />
        </div>
      </div>
      </div>

      {/* ─── Swipeable content ─── */}
      <div
        className="overflow-hidden max-w-[680px] mx-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={trackRef}
          className="tabs-track"
          style={{ transform: activeTab === 'history' ? 'translateX(-100%)' : 'translateX(0)' }}
        >
          {/* ═══ Saved tab ═══ */}
          <div className="tab-panel px-6">
            {bookmarks.length === 0 ? (
              <div className="mt-20 text-center page-enter">
                <p className="text-text-tertiary text-[0.9375rem] leading-relaxed">No saved words yet.</p>
                <p className="text-text-disabled text-[0.8125rem] mt-1">Bookmark words while reading definitions to build your collection.</p>
              </div>
            ) : (
              <div className="tab-content-enter" key="saved-content">
                {(() => {
                  let idx = 0;
                  return savedGroups.map(group => (
                    <div key={group.label}>
                      <div className="section-date-header">{group.label}</div>
                      {group.items.map(bookmark => {
                        const currentIdx = idx++;
                        const isEditing = editingWord === bookmark.word;

                        if (editMode) {
                          // ─── Edit mode row ───
                          return (
                            <div
                              key={bookmark.word}
                              className="list-item-enter w-full flex items-center gap-2 px-4 py-2.5 border-b border-border-divider"
                              style={{ animationDelay: `${currentIdx * 0.03}s` }}
                            >
                              {/* Delete button */}
                              <button
                                onClick={() => handleRemoveBookmark(bookmark.word)}
                                className="w-7 h-7 flex items-center justify-center text-accent-brick flex-shrink-0"
                              >
                                <XIcon size={16} />
                              </button>

                              {/* Editable field */}
                              {isEditing ? (
                                <input
                                  autoFocus
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') handleRenameConfirm(); if (e.key === 'Escape') setEditingWord(null); }}
                                  className="flex-1 bg-elevated text-text-primary text-base px-3 py-1.5 rounded-[8px] border border-accent-teal focus:outline-none"
                                />
                              ) : (
                                <button
                                  className="flex-1 text-left text-base text-text-primary"
                                  onClick={() => { setEditingWord(bookmark.word); setEditValue(bookmark.word); }}
                                >
                                  {capitalizeWords(bookmark.word)}
                                </button>
                              )}

                              {/* Confirm rename */}
                              {isEditing && (
                                <button
                                  onClick={handleRenameConfirm}
                                  className="w-7 h-7 flex items-center justify-center text-accent-teal flex-shrink-0"
                                >
                                  <CheckIcon size={16} />
                                </button>
                              )}
                            </div>
                          );
                        }

                        // ─── Normal swipe row ───
                        return (
                          <SwipeItem
                            key={bookmark.word}
                            onDelete={() => handleRemoveBookmark(bookmark.word)}
                          >
                            <button
                              onClick={() => handleWordClick(bookmark.word)}
                              className="list-item-enter item-highlight w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-elevated active:bg-card-hover transition-all duration-200 border-b border-border-divider"
                              style={{ animationDelay: `${currentIdx * 0.04}s` }}
                            >
                              <span className="text-text-tertiary flex-shrink-0">
                                <BookmarkIcon size={16} />
                              </span>
                              <div className="flex-1 min-w-0">
                                <span className="text-base text-text-primary block truncate">{capitalizeWords(bookmark.word)}</span>
                                {bookmark.partOfSpeech && (
                                  <span className="text-[0.6875rem] font-mono text-text-tertiary tracking-[0.04em]">{bookmark.partOfSpeech}</span>
                                )}
                              </div>
                            </button>
                          </SwipeItem>
                        );
                      })}
                    </div>
                  ));
                })()}

                {/* Done editing button */}
                {editMode && (
                  <div className="pt-5 pb-2 flex justify-center">
                    <button
                      onClick={() => { setEditMode(false); setEditingWord(null); }}
                      className="flex items-center gap-1.5 text-[0.8125rem] text-accent-teal px-4 py-2 rounded-[10px] border border-border-divider hover:bg-elevated"
                    >
                      <CheckIcon size={14} />
                      Done
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ═══ History tab ═══ */}
          <div className="tab-panel px-6">
            {history.length === 0 ? (
              <div className="mt-20 text-center page-enter">
                <p className="text-text-tertiary text-[0.9375rem] leading-relaxed">No lookups yet.</p>
                <p className="text-text-disabled text-[0.8125rem] mt-1">Words you search for will appear here in chronological order.</p>
              </div>
            ) : (
              <div className="tab-content-enter" key="history-content">
                {(() => {
                  let idx = 0;
                  return historyGroups.map(group => (
                    <div key={group.label}>
                      <div className="section-date-header">{group.label}</div>
                      {group.items.map(item => {
                        const currentIdx = idx++;
                        return (
                          <SwipeItem
                            key={item.word + item.timestamp}
                            onDelete={() => removeHistoryItem(item.timestamp)}
                          >
                            <button
                              onClick={() => handleWordClick(item.word, item.sourceDictionaryId)}
                              className="list-item-enter item-highlight w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-elevated active:bg-card-hover transition-all duration-200 border-b border-border-divider"
                              style={{ animationDelay: `${Math.min(currentIdx, 15) * 0.04}s` }}
                            >
                              <span className="text-text-tertiary flex-shrink-0">
                                <SearchIcon size={16} />
                              </span>
                              <span className="text-base text-text-primary flex-1 truncate">{capitalizeWords(item.word)}</span>
                            </button>
                          </SwipeItem>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation dialog */}
      <ConfirmDialog
        open={showClearConfirm}
        title="Clear history?"
        message="This will permanently remove all your lookup history. This action cannot be undone."
        onConfirm={() => { clearHistory(); setShowClearConfirm(false); }}
        onCancel={() => setShowClearConfirm(false)}
      />

      {showContextMenu && typeof document !== 'undefined' && createPortal(
        <div
          ref={contextMenuPortalRef}
          className="glass-menu fixed w-48 py-1"
          style={{
            minWidth: '180px',
            top: `${contextMenuPosition.top}px`,
            right: `${contextMenuPosition.right}px`,
            zIndex: 10000,
          }}
        >
          <button
            onClick={handleExport}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[0.875rem] text-text-primary hover:bg-card-hover transition-colors"
          >
            <DownloadIcon size={16} className="text-text-tertiary" />
            Export Bookmarks
          </button>
          <button
            onClick={() => { importRef.current?.click(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[0.875rem] text-text-primary hover:bg-card-hover transition-colors"
          >
            <UploadIcon size={16} className="text-text-tertiary" />
            Import Bookmarks
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
