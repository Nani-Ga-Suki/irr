import type { Store } from '../hooks/storeTypes';
import type { ViewMode } from '../types';
import type React from 'react';
import { HouseIcon, BookmarkIcon, GearIcon } from './Icons';

interface BottomNavProps {
  store: Store;
}

const BookmarkNavIcon = ({ className = '' }: { className?: string }) => (
  <BookmarkIcon className={className} filled={false} />
);

const NAV_ITEMS: { view: ViewMode; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { view: 'home', label: 'Home', Icon: HouseIcon },
  { view: 'bookmarks', label: 'Saved', Icon: BookmarkNavIcon },
  { view: 'settings', label: 'Settings', Icon: GearIcon },
];

export function BottomNav({ store }: BottomNavProps) {
  return (
    <nav
      className="glass-nav fixed bottom-0 left-0 right-0 z-50"
    >
      <div className="max-w-[680px] mx-auto flex items-center justify-around px-4 py-2">
        {NAV_ITEMS.map(({ view, label, Icon }) => {
          const isActive = store.view === view || 
            (view === 'home' && store.view === 'definition');

          return (
            <button
              key={view}
              type="button"
              onClick={() => {
                if (view === 'home') {
                  store.setView('home');
                } else {
                  store.setView(view);
                }
              }}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors duration-150 ${
                isActive ? 'text-accent-teal' : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[0.625rem] font-mono tracking-[0.04em] uppercase">
                {label}
              </span>
            </button>
          );
        })}
      </div>
      {/* Safe area padding for mobile */}
      <div className="h-[env(safe-area-inset-bottom,0px)]" />
    </nav>
  );
}
