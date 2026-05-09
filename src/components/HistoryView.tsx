import { useState, useCallback, useRef } from 'react';
import type { Store } from '../hooks/storeTypes';
import { TrashIcon, SearchIcon } from './Icons';
import { capitalizeWords } from '../utils/formatText';

interface HistoryViewProps {
  store: Store;
}

// ─── Date grouping ───────────────────────────────────────
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

// ─── Swipe-to-delete item ────────────────────────────────
function SwipeItem({
  children,
  onDelete,
}: {
  children: React.ReactNode;
  onDelete: () => void;
}) {
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
    const delta = e.touches[0].clientX - startXRef.current;
    const clamped = Math.min(0, Math.max(delta, -120));
    currentXRef.current = clamped;
    setOffset(clamped);
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
    if (currentXRef.current < -threshold) {
      setExiting(true);
      setTimeout(() => onDelete(), 300);
    } else {
      setOffset(0);
    }
  }, [onDelete]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    startXRef.current = e.clientX;
    isDraggingRef.current = true;
    currentXRef.current = 0;
    
    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = ev.clientX - startXRef.current;
      const clamped = Math.min(0, Math.max(delta, -120));
      currentXRef.current = clamped;
      setOffset(clamped);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      if (currentXRef.current < -threshold) {
        setExiting(true);
        setTimeout(() => onDelete(), 300);
      } else {
        setOffset(0);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [onDelete]);

  if (exiting) {
    return <div className="item-exit" style={{ overflow: 'hidden' }}>{children}</div>;
  }

  return (
    <div className="swipe-item">
      <div className="swipe-item-action">
        <TrashIcon size={20} />
      </div>
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

// ─── Confirmation Dialog ─────────────────────────────────
function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg text-text-primary">{title}</h3>
        <p className="mt-2 text-[0.875rem] text-text-secondary leading-relaxed">{message}</p>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-[10px] border border-border-divider text-text-secondary text-[0.875rem] hover:bg-elevated transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-[10px] bg-accent-brick text-white text-[0.875rem] hover:opacity-90 transition-opacity"
          >
            Clear all
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main HistoryView ────────────────────────────────────
export function HistoryView({ store }: HistoryViewProps) {
  const { history, clearHistory, removeHistoryItem } = store;
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleWordClick = useCallback((word: string) => {
    store.lookupWord(word);
  }, [store]);

  const historyGroups = groupByDate(history);

  return (
    <div className="pb-28 min-h-screen">
      <div className="px-6 pt-12 pb-4 max-w-[680px] mx-auto">
        <div>
          <h1 className="font-display text-[clamp(1.75rem,5vw,2.5rem)] tracking-[-0.02em] text-text-primary leading-tight">
            History
          </h1>
          <p className="font-mono text-[0.6875rem] text-text-tertiary tracking-[0.04em] mt-1">
            {history.length} entr{history.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>
      </div>

      <div className="px-6 max-w-[680px] mx-auto">
        {history.length === 0 ? (
          <div className="mt-20 text-center page-enter">
            <p className="text-text-tertiary text-[0.9375rem] leading-relaxed">
              No lookups yet.
            </p>
            <p className="text-text-disabled text-[0.8125rem] mt-1">
              Words you search for will appear here in chronological order.
            </p>
          </div>
        ) : (
          <div>
            {(() => {
              let idx = 0;
              return historyGroups.map(group => (
                <div key={group.label}>
                  <div className="section-date-header">{group.label}</div>
                  {group.items.map((item) => {
                    const currentIdx = idx++;
                    return (
                      <SwipeItem
                        key={item.word + item.timestamp}
                        onDelete={() => removeHistoryItem(item.timestamp)}
                      >
                        <button
                          onClick={() => handleWordClick(item.word)}
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

            {/* Clear all — below list */}
            <div className="pt-6 pb-2 flex justify-center">
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1.5 text-[0.8125rem] text-accent-brick hover:text-accent-brick/80 transition-colors px-4 py-2 rounded-[10px] border border-border-divider hover:bg-elevated"
              >
                <TrashIcon size={16} />
                <span>Clear all history</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showClearConfirm}
        title="Clear history?"
        message="This will permanently remove all your lookup history. This action cannot be undone."
        onConfirm={() => {
          clearHistory();
          setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
