import { useEffect, useMemo, useState } from 'react';
import PixelIcon from '../components/PixelIcon';
import { APPS } from './registry';
import { useWindowStore } from '../store/windowStore';
import { useWindowId } from '../components/Window';
import { playClick } from '../lib/sounds';
import { PLAYLIST } from '../lib/music';
import { POSTS } from '../lib/posts';
import { useWindowCommands } from '../lib/windowCommands';

interface Entry {
  name: string;
  kind: string;
  size?: string;
  icon: string;
  navigateTo?: string;
  url?: string;
  appId?: string;
  openParams?: Record<string, unknown>;
}

interface Location {
  id: string;
  label: string;
  icon: string;
  section: 'favorites' | 'devices';
  getEntries: () => Entry[];
}

const PROJECTS: Entry[] = [
  { name: 'akhileshw.xyz', kind: 'website', size: '124K', icon: 'folder', url: 'https://akhileshw.xyz' },
  { name: 'dotfiles', kind: 'repo', size: '18K', icon: 'folder', url: 'https://github.com/akhilesh-w/dotfiles' },
  { name: 'log', kind: 'notebook', size: '8K', icon: 'document', url: 'https://github.com/akhilesh-w/log' },
  { name: 'sites', kind: 'repo', size: '32K', icon: 'folder', url: 'https://github.com/akhilesh-w/sites' },
  { name: 'gemini-design-plugin', kind: 'plugin', size: '46K', icon: 'folder', url: 'https://github.com/akhilesh-w/gemini-design-plugin' },
  { name: 'epoch', kind: 'app', size: '54K', icon: 'folder', url: 'https://github.com/akhilesh-w/epoch' },
];

const DOCUMENTS: Entry[] = POSTS.map(p => ({
  name: `${p.title}.txt`,
  kind: 'TextEdit document',
  size: `${Math.max(1, Math.ceil(p.content.length / 1024))}K`,
  icon: 'document',
  appId: 'text-edit',
  openParams: { windowKey: p.slug, slug: p.slug },
}));

const DESKTOP: Entry[] = [
  { name: 'Macintosh HD', kind: 'disk', size: '—', icon: 'macHD', navigateTo: 'mac-hd' },
  { name: 'Projects', kind: 'folder', size: '—', icon: 'folder-projects', navigateTo: 'projects' },
  { name: 'README', kind: 'document', size: '4K', icon: 'document' },
  { name: 'Trash', kind: 'folder', size: '—', icon: 'trash', navigateTo: 'trash' },
];

const MAC_HD: Entry[] = [
  { name: 'Applications', kind: 'folder', size: '—', icon: 'launcher', navigateTo: 'applications' },
  { name: 'Desktop', kind: 'folder', size: '—', icon: 'folder-desktop', navigateTo: 'desktop' },
  { name: 'Documents', kind: 'folder', size: '—', icon: 'folder-docs', navigateTo: 'documents' },
  { name: 'Music', kind: 'folder', size: '—', icon: 'folder-music', navigateTo: 'music' },
  { name: 'Projects', kind: 'folder', size: '—', icon: 'folder-projects', navigateTo: 'projects' },
  { name: 'Trash', kind: 'folder', size: '0K', icon: 'trash', navigateTo: 'trash' },
];

function musicEntries(): Entry[] {
  return PLAYLIST.map((t, i) => ({
    name: t.title,
    kind: t.artist,
    size: `${4 + ((i * 7) % 5)}.${(i * 3) % 10}M`,
    icon: 'audio',
    appId: 'music',
  }));
}

function applicationEntries(): Entry[] {
  return APPS.filter(a => !a.hideFromLauncher).map(a => ({
    name: a.name,
    kind: 'application',
    size: '—',
    icon: a.icon,
    appId: a.id,
  }));
}

const LOCATIONS: Location[] = [
  { id: 'mac-hd', label: 'Macintosh HD', icon: 'macHD', section: 'devices', getEntries: () => MAC_HD },
  { id: 'desktop', label: 'Desktop', icon: 'folder-desktop', section: 'favorites', getEntries: () => DESKTOP },
  { id: 'projects', label: 'Projects', icon: 'folder-projects', section: 'favorites', getEntries: () => PROJECTS },
  { id: 'applications', label: 'Applications', icon: 'launcher', section: 'favorites', getEntries: applicationEntries },
  { id: 'documents', label: 'Documents', icon: 'folder-docs', section: 'favorites', getEntries: () => DOCUMENTS },
  { id: 'music', label: 'Music', icon: 'folder-music', section: 'favorites', getEntries: musicEntries },
  { id: 'trash', label: 'Trash', icon: 'trash', section: 'favorites', getEntries: () => [] },
];

function totalSize(entries: Entry[]): string {
  const kb = entries.reduce((acc, e) => {
    const m = e.size?.match(/^(\d+)K/);
    return acc + (m ? parseInt(m[1], 10) : 0);
  }, 0);
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)}M` : `${kb}K`;
}

export default function Finder() {
  const openWindow = useWindowStore(s => s.openWindow);
  const setWindowTitle = useWindowStore(s => s.setWindowTitle);
  const windowId = useWindowId();
  const params = useWindowStore(s =>
    windowId ? s.windows.find(w => w.id === windowId)?.params : undefined
  );
  const initialLocId =
    typeof params?.locationId === 'string' && LOCATIONS.some(l => l.id === params.locationId)
      ? (params.locationId as string)
      : 'mac-hd';

  const [currentLocId, setCurrentLocId] = useState<string>(initialLocId);
  const [viewMode, setViewMode] = useState<'icons' | 'list'>('icons');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  // When the launcher hands us a (possibly new) locationId — including on a
  // re-open of an already-mounted Finder — navigate to it.
  useEffect(() => {
    const loc = params?.locationId;
    if (typeof loc === 'string' && LOCATIONS.some(l => l.id === loc)) {
      setCurrentLocId(loc);
      setSelected(null);
      setQuery('');
    }
  }, [params]);

  const location = LOCATIONS.find(l => l.id === currentLocId) ?? LOCATIONS[0];
  const entries = useMemo(() => {
    const all = location.getEntries();
    const q = query.trim().toLowerCase();
    return q ? all.filter(e => e.name.toLowerCase().includes(q)) : all;
  }, [location, query]);

  useEffect(() => {
    if (windowId) setWindowTitle(windowId, location.label);
  }, [windowId, location.label, setWindowTitle]);

  // Publish our menu-controllable commands so the MenuBar's View menu can
  // drive `viewMode`, and File → New Finder Window points back here.
  useEffect(() => {
    if (!windowId) return;
    useWindowCommands.getState().set(windowId, {
      view: viewMode,
      setView: setViewMode,
      newDocument: () => openWindow('finder'),
      newDocumentLabel: 'New Finder Window',
      newDocumentShortcut: '⌘N',
    });
    return () => useWindowCommands.getState().clear(windowId);
  }, [windowId, viewMode, openWindow]);

  const navigateTo = (locId: string) => {
    setCurrentLocId(locId);
    setSelected(null);
    setQuery('');
  };

  const handleOpen = (entry: Entry) => {
    playClick();
    if (entry.navigateTo) navigateTo(entry.navigateTo);
    else if (entry.url) window.open(entry.url, '_blank', 'noopener,noreferrer');
    else if (entry.appId) openWindow(entry.appId, entry.openParams);
  };

  const favorites = LOCATIONS.filter(l => l.section === 'favorites');
  const devices = LOCATIONS.filter(l => l.section === 'devices');

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--plat-white)', fontFamily: 'var(--font-geneva)' }}>
      {/* Toolbar */}
      <div
        className="flex items-center shrink-0 px-2"
        style={{
          height: 26,
          background: 'var(--plat-200)',
          borderBottom: '1px solid var(--plat-900)',
          gap: 6,
        }}
      >
        <ViewToggle value={viewMode} onChange={setViewMode} />
        <div style={{ width: 1, height: 16, background: 'var(--plat-500)' }} />
        <span
          style={{
            fontFamily: 'var(--font-chicago)',
            fontSize: 12,
            color: 'var(--plat-900)',
            paddingLeft: 4,
          }}
        >
          {location.label}
        </span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Find…"
          className="chrome-inset"
          style={{
            marginLeft: 'auto',
            width: 130,
            height: 18,
            padding: '0 5px',
            background: 'var(--plat-white)',
            fontFamily: 'var(--font-geneva)',
            fontSize: 11,
            outline: 'none',
          }}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className="shrink-0 overflow-auto"
          style={{
            width: 140,
            background: 'var(--plat-100)',
            borderRight: '1px solid var(--plat-900)',
            padding: '6px 0',
          }}
        >
          <SidebarSection label="DEVICES">
            {devices.map(loc => (
              <SidebarItem
                key={loc.id}
                location={loc}
                active={loc.id === currentLocId}
                onSelect={() => navigateTo(loc.id)}
              />
            ))}
          </SidebarSection>
          <SidebarSection label="FAVORITES">
            {favorites.map(loc => (
              <SidebarItem
                key={loc.id}
                location={loc}
                active={loc.id === currentLocId}
                onSelect={() => navigateTo(loc.id)}
              />
            ))}
          </SidebarSection>
        </aside>

        {/* Main pane */}
        <div className="flex-1 overflow-auto" onClick={() => setSelected(null)}>
          {entries.length === 0 ? (
            <EmptyState location={location} hasQuery={!!query} />
          ) : viewMode === 'icons' ? (
            <IconView
              entries={entries}
              selected={selected}
              onSelect={setSelected}
              onOpen={handleOpen}
            />
          ) : (
            <ListView
              entries={entries}
              selected={selected}
              onSelect={setSelected}
              onOpen={handleOpen}
            />
          )}
        </div>
      </div>

      {/* Status bar */}
      <div
        className="px-2 shrink-0 flex items-center"
        style={{
          background: 'var(--plat-100)',
          borderTop: '1px solid var(--plat-900)',
          fontSize: 11,
          height: 18,
          color: 'var(--plat-700)',
          gap: 8,
        }}
      >
        <span>
          {entries.length} item{entries.length === 1 ? '' : 's'}
          {entries.length > 0 && `, ${totalSize(entries)}`}
        </span>
        <span style={{ marginLeft: 'auto' }}>282K used · 9.9 MB available</span>
      </div>
    </div>
  );
}

function ViewToggle({ value, onChange }: { value: 'icons' | 'list'; onChange: (v: 'icons' | 'list') => void }) {
  const btnStyle = (active: boolean) => ({
    width: 24,
    height: 18,
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: active ? 'var(--plat-300)' : 'var(--plat-200)',
    cursor: 'pointer',
  });
  return (
    <div className="flex items-center">
      <button
        className={value === 'icons' ? 'chrome-inset' : 'chrome-outset'}
        style={btnStyle(value === 'icons')}
        onClick={() => onChange('icons')}
        title="Icon View"
        aria-pressed={value === 'icons'}
      >
        <IconViewGlyph />
      </button>
      <button
        className={value === 'list' ? 'chrome-inset' : 'chrome-outset'}
        style={{ ...btnStyle(value === 'list'), marginLeft: -1 }}
        onClick={() => onChange('list')}
        title="List View"
        aria-pressed={value === 'list'}
      >
        <ListViewGlyph />
      </button>
    </div>
  );
}

function IconViewGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="0" y="0" width="4" height="4" fill="currentColor" />
      <rect x="6" y="0" width="4" height="4" fill="currentColor" />
      <rect x="0" y="6" width="4" height="4" fill="currentColor" />
      <rect x="6" y="6" width="4" height="4" fill="currentColor" />
    </svg>
  );
}

function ListViewGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="0" y="1" width="10" height="1" fill="currentColor" />
      <rect x="0" y="4" width="10" height="1" fill="currentColor" />
      <rect x="0" y="7" width="10" height="1" fill="currentColor" />
    </svg>
  );
}

function SidebarSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          padding: '2px 10px',
          fontFamily: 'var(--font-chicago)',
          fontSize: 10,
          letterSpacing: 0.5,
          color: 'var(--plat-600)',
          userSelect: 'none',
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function SidebarItem({
  location,
  active,
  onSelect,
}: {
  location: Location;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        width: '100%',
        padding: '2px 10px',
        background: active ? 'var(--plat-select)' : 'transparent',
        color: active ? 'var(--plat-select-fg)' : 'var(--plat-900)',
        border: 'none',
        textAlign: 'left',
        cursor: 'default',
        fontFamily: 'var(--font-geneva)',
        fontSize: 12,
        outline: 'none',
      }}
    >
      <PixelIcon name={location.icon} size={14} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {location.label}
      </span>
    </button>
  );
}

function IconView({
  entries,
  selected,
  onSelect,
  onOpen,
}: {
  entries: Entry[];
  selected: string | null;
  onSelect: (name: string | null) => void;
  onOpen: (entry: Entry) => void;
}) {
  return (
    <div
      className="p-3"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
        gridAutoRows: 78,
        gap: 8,
        alignContent: 'start',
      }}
      onClick={e => e.stopPropagation()}
    >
      {entries.map(entry => {
        const isSelected = entry.name === selected;
        return (
          <div
            key={entry.name}
            onClick={e => {
              e.stopPropagation();
              onSelect(entry.name);
            }}
            onDoubleClick={() => onOpen(entry)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: 4,
              cursor: 'default',
              userSelect: 'none',
            }}
            title={entry.name}
          >
            <div
              style={{
                background: isSelected ? 'var(--plat-select)' : 'transparent',
                padding: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PixelIcon
                name={entry.icon}
                size={36}
                style={isSelected ? { color: 'var(--plat-white)' } : undefined}
              />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-geneva)',
                fontSize: 11,
                lineHeight: 1.1,
                textAlign: 'center',
                color: isSelected ? 'var(--plat-select-fg)' : 'var(--plat-900)',
                background: isSelected ? 'var(--plat-select)' : 'transparent',
                padding: isSelected ? '0 3px' : 0,
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {entry.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ListView({
  entries,
  selected,
  onSelect,
  onOpen,
}: {
  entries: Entry[];
  selected: string | null;
  onSelect: (name: string | null) => void;
  onOpen: (entry: Entry) => void;
}) {
  return (
    <div onClick={e => e.stopPropagation()}>
      <div
        className="flex items-center px-2 shrink-0 select-none sticky top-0"
        style={{
          background: 'var(--plat-100)',
          borderBottom: '1px solid var(--plat-900)',
          fontFamily: 'var(--font-chicago)',
          fontSize: 12,
          fontWeight: 500,
          height: 18,
          gap: 8,
          zIndex: 1,
        }}
      >
        <span style={{ width: 24 }} />
        <span style={{ flex: 1 }}>Name</span>
        <span style={{ width: 70, textAlign: 'right' }}>Size</span>
        <span style={{ width: 90 }}>Kind</span>
      </div>
      {entries.map((entry, i) => {
        const isSelected = entry.name === selected;
        return (
          <div
            key={entry.name}
            onClick={e => {
              e.stopPropagation();
              onSelect(entry.name);
            }}
            onDoubleClick={() => onOpen(entry)}
            className="flex items-center px-2 py-0.5"
            style={{
              gap: 8,
              fontSize: 12,
              cursor: 'default',
              userSelect: 'none',
              background: isSelected ? 'var(--plat-select)' : i % 2 ? 'var(--plat-white)' : 'var(--plat-50)',
              color: isSelected ? 'var(--plat-select-fg)' : 'var(--plat-900)',
              borderBottom: '1px solid var(--plat-100)',
            }}
          >
            <PixelIcon
              name={entry.icon}
              size={18}
              style={isSelected ? { color: 'var(--plat-white)' } : undefined}
            />
            <span style={{ flex: 1, fontWeight: 500 }}>{entry.name}</span>
            <span style={{ width: 70, textAlign: 'right', color: isSelected ? 'var(--plat-select-fg)' : 'var(--plat-700)' }}>
              {entry.size ?? '—'}
            </span>
            <span style={{ width: 90, color: isSelected ? 'var(--plat-select-fg)' : 'var(--plat-700)' }}>
              {entry.kind}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ location, hasQuery }: { location: Location; hasQuery: boolean }) {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--plat-600)',
        fontSize: 12,
        textAlign: 'center',
        padding: 24,
      }}
    >
      {hasQuery
        ? `No items match your search.`
        : location.id === 'trash'
        ? 'The Trash is empty.'
        : 'This folder is empty.'}
    </div>
  );
}
