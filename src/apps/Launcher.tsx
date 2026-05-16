import { useMemo, useState } from 'react';
import PixelIcon from '../components/PixelIcon';
import { APPS } from './registry';
import { useWindowStore } from '../store/windowStore';
import { playClick } from '../lib/sounds';

export default function Launcher() {
  const openWindow = useWindowStore(s => s.openWindow);
  const [query, setQuery] = useState('');

  const visibleApps = useMemo(
    () =>
      APPS.filter(a => !a.hideFromLauncher).filter(a =>
        a.name.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [query]
  );

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--plat-200)', fontFamily: 'var(--font-geneva)' }}
    >
      {/* Header strip — Launcher had a thin label band above the tile grid */}
      <div
        className="flex items-center shrink-0 px-2"
        style={{
          height: 22,
          background: 'var(--plat-100)',
          borderBottom: '1px solid var(--plat-900)',
          fontFamily: 'var(--font-chicago)',
          fontSize: 12,
          gap: 8,
        }}
      >
        <span>Applications</span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Find…"
          className="chrome-inset"
          style={{
            marginLeft: 'auto',
            width: 130,
            height: 16,
            padding: '0 4px',
            background: 'var(--plat-white)',
            fontFamily: 'var(--font-geneva)',
            fontSize: 11,
            outline: 'none',
          }}
        />
      </div>

      {/* Tile grid */}
      <div
        className="flex-1 overflow-auto p-3"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(86px, 1fr))',
          gridAutoRows: 84,
          gap: 10,
          alignContent: 'start',
        }}
      >
        {visibleApps.map(app => (
          <button
            key={app.id}
            className="chrome-outset flex flex-col items-center justify-center"
            style={{
              background: 'var(--plat-200)',
              padding: 4,
              gap: 4,
              cursor: 'pointer',
              outline: 'none',
            }}
            onMouseDown={e => {
              e.currentTarget.classList.remove('chrome-outset');
              e.currentTarget.classList.add('chrome-inset');
            }}
            onMouseUp={e => {
              e.currentTarget.classList.remove('chrome-inset');
              e.currentTarget.classList.add('chrome-outset');
            }}
            onMouseLeave={e => {
              e.currentTarget.classList.remove('chrome-inset');
              e.currentTarget.classList.add('chrome-outset');
            }}
            onClick={() => {
              playClick();
              openWindow(app.id);
            }}
            title={app.name}
          >
            <PixelIcon name={app.icon} size={32} />
            <span
              style={{
                fontFamily: 'var(--font-chicago)',
                fontSize: 11,
                lineHeight: 1,
                textAlign: 'center',
                color: 'var(--plat-900)',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {app.name}
            </span>
          </button>
        ))}
        {visibleApps.length === 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: 16,
              textAlign: 'center',
              color: 'var(--plat-600)',
              fontSize: 12,
            }}
          >
            No applications match "{query}".
          </div>
        )}
      </div>

      {/* Status bar */}
      <div
        className="px-2 shrink-0 flex items-center"
        style={{
          background: 'var(--plat-100)',
          borderTop: '1px solid var(--plat-900)',
          fontSize: 11,
          height: 16,
          color: 'var(--plat-700)',
        }}
      >
        {visibleApps.length} application{visibleApps.length === 1 ? '' : 's'}
      </div>
    </div>
  );
}
