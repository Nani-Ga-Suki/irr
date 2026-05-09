import { useStore } from './hooks/useStore';
import { HomeView } from './components/HomeView';
import { DefinitionView } from './components/DefinitionView';
import { BookmarksView } from './components/BookmarksView';
import { SettingsView } from './components/SettingsView';
import { ActionPill } from './components/ActionPill';
import { BottomNav } from './components/BottomNav';

export default function App() {
  const store = useStore();

  const renderView = () => {
    switch (store.view) {
      case 'home':
        return <HomeView store={store} />;
      case 'definition':
        return <DefinitionView store={store} />;
      case 'bookmarks':
        return <BookmarksView store={store} />;
      case 'history':
        // History is now merged into bookmarks view
        return <BookmarksView store={store} />;
      case 'settings':
        return <SettingsView store={store} />;
      default:
        return <HomeView store={store} />;
    }
  };

  return (
    <div
      className="min-h-screen bg-canvas text-text-primary relative"
      data-theme={store.theme}
      style={{ fontSize: `${store.fontSize}px` }}
    >
      <div className="page-enter" key={store.view + (store.currentEntry?.word || '')}>
        {renderView()}
      </div>
      {store.view === 'definition' && store.currentEntry && (
        <ActionPill store={store} />
      )}
      <BottomNav store={store} />
    </div>
  );
}
