import { useEffect, useRef, useState } from 'react';
import { useWindowStore } from '../store/windowStore';
import { useDesktopStore } from '../store/desktopStore';
import { useSoundStore } from '../store/soundStore';
import { useScreensaverStore } from '../store/screensaverStore';
import { playBeep, playStartup } from '../lib/sounds';
import { APPS_BY_ID } from '../apps/registry';
import { useIsMobile } from '../lib/useIsMobile';
import type { MenuDefinition } from '../types';
import MenuBarDropdown from './MenuBarDropdown';

function RainbowApple() {
  return (
    <svg viewBox="0 0 14 17" width="13" height="15" aria-hidden="true">
      <defs>
        <linearGradient id="appleStripes" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5fb95e" />
          <stop offset="16.66%" stopColor="#5fb95e" />
          <stop offset="16.66%" stopColor="#fdd03a" />
          <stop offset="33.33%" stopColor="#fdd03a" />
          <stop offset="33.33%" stopColor="#f08a3c" />
          <stop offset="50%" stopColor="#f08a3c" />
          <stop offset="50%" stopColor="#e8423b" />
          <stop offset="66.66%" stopColor="#e8423b" />
          <stop offset="66.66%" stopColor="#a93a92" />
          <stop offset="83.33%" stopColor="#a93a92" />
          <stop offset="83.33%" stopColor="#3a7cd9" />
          <stop offset="100%" stopColor="#3a7cd9" />
        </linearGradient>
      </defs>
      <path
        fill="url(#appleStripes)"
        d="M11.624 8.964c-.02-2.155 1.76-3.187 1.84-3.238-1.001-1.464-2.56-1.664-3.115-1.687-1.327-.134-2.59.781-3.265.781-.674 0-1.715-.761-2.82-.74-1.45.021-2.788.842-3.534 2.139-1.506 2.61-.385 6.474 1.084 8.595.717 1.038 1.572 2.205 2.694 2.163 1.08-.044 1.488-.7 2.795-.7 1.305 0 1.674.7 2.819.677 1.164-.02 1.901-1.06 2.61-2.103.823-1.207 1.163-2.376 1.183-2.436-.026-.011-2.27-.872-2.291-3.45zM9.5 2.667c.598-.724 1-1.728.89-2.732-.86.035-1.901.572-2.518 1.293-.553.641-1.038 1.665-.91 2.65.96.074 1.939-.488 2.538-1.211z"
      />
    </svg>
  );
}

export default function MenuBar() {
  const [time, setTime] = useState(new Date());
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const windows = useWindowStore(s => s.windows);
  const activeWindowId = useWindowStore(s => s.activeWindowId);
  const openWindow = useWindowStore(s => s.openWindow);
  const closeWindow = useWindowStore(s => s.closeWindow);
  const resetDesktopPositions = useDesktopStore(s => s.resetPositions);
  const soundEnabled = useSoundStore(s => s.enabled);
  const toggleSound = useSoundStore(s => s.toggle);
  const sleep = useScreensaverStore(s => s.setForceOn);
  const isMobile = useIsMobile();

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const activeWindow = windows.find(w => w.id === activeWindowId);
  const activeApp = activeWindow ? APPS_BY_ID[activeWindow.appId] : null;
  const activeAppName = activeApp?.name ?? 'Finder';

  const closeActive = () => {
    if (activeWindowId) closeWindow(activeWindowId);
  };

  const menus: MenuDefinition[] = [
    {
      key: 'apple',
      label: 'apple',
      items: [
        { type: 'item', label: 'About This Macintosh', onSelect: () => openWindow('about') },
        { type: 'separator' },
        { type: 'item', label: 'Launcher', onSelect: () => openWindow('launcher') },
        { type: 'item', label: 'Calculator', disabled: true },
        { type: 'item', label: 'Chooser', disabled: true },
        { type: 'item', label: 'Control Panels', onSelect: () => openWindow('controls') },
        { type: 'item', label: 'Stickies', disabled: true },
        { type: 'separator' },
        { type: 'item', label: 'Sound', checked: soundEnabled, onSelect: toggleSound },
        { type: 'item', label: 'Startup Chime', onSelect: playStartup },
        { type: 'separator' },
        { type: 'item', label: 'Sleep', onSelect: () => sleep(true) },
        { type: 'item', label: 'Restart', onSelect: () => window.location.reload() },
        { type: 'item', label: 'Shut Down', disabled: true },
      ],
    },
    {
      key: 'app',
      label: activeAppName,
      items: [
        {
          type: 'item',
          label: `About ${activeAppName}`,
          onSelect: () => openWindow('about'),
          disabled: activeApp?.id === 'about',
        },
        { type: 'separator' },
        { type: 'item', label: 'Preferences…', onSelect: () => openWindow('controls') },
        { type: 'separator' },
        {
          type: 'item',
          label: `Quit ${activeAppName}`,
          shortcut: '⌘Q',
          onSelect: closeActive,
          disabled: !activeWindowId,
        },
      ],
    },
    {
      key: 'file',
      label: 'File',
      items: [
        {
          type: 'item',
          label: 'New Finder Window',
          shortcut: '⌘N',
          onSelect: () => openWindow('finder'),
        },
        { type: 'item', label: 'Open…', shortcut: '⌘O', disabled: true },
        { type: 'separator' },
        {
          type: 'item',
          label: 'Close Window',
          shortcut: '⌘W',
          onSelect: closeActive,
          disabled: !activeWindowId,
        },
        { type: 'item', label: 'Save', shortcut: '⌘S', disabled: true },
        { type: 'separator' },
        { type: 'item', label: 'Print…', shortcut: '⌘P', disabled: true },
      ],
    },
    {
      key: 'edit',
      label: 'Edit',
      items: [
        { type: 'item', label: 'Undo', shortcut: '⌘Z', disabled: true },
        { type: 'item', label: 'Redo', shortcut: '⌘⇧Z', disabled: true },
        { type: 'separator' },
        { type: 'item', label: 'Cut', shortcut: '⌘X', disabled: true },
        { type: 'item', label: 'Copy', shortcut: '⌘C', disabled: true },
        { type: 'item', label: 'Paste', shortcut: '⌘V', disabled: true },
        { type: 'separator' },
        { type: 'item', label: 'Select All', shortcut: '⌘A', disabled: true },
      ],
    },
    {
      key: 'view',
      label: 'View',
      items: [
        { type: 'item', label: 'as Icons', disabled: true },
        { type: 'item', label: 'as List', disabled: true },
        { type: 'separator' },
        { type: 'item', label: 'Clean Up Desktop', onSelect: resetDesktopPositions },
        { type: 'item', label: 'Show Toolbar', disabled: true },
      ],
    },
    {
      key: 'special',
      label: 'Special',
      items: [
        { type: 'item', label: 'Empty Trash…', disabled: true },
        { type: 'separator' },
        { type: 'item', label: 'Beep', onSelect: playBeep },
        { type: 'separator' },
        { type: 'item', label: 'Eject', disabled: true },
        { type: 'item', label: 'Restart', onSelect: () => window.location.reload() },
        { type: 'item', label: 'Shut Down', disabled: true },
      ],
    },
    {
      key: 'help',
      label: 'Help',
      items: [
        { type: 'item', label: 'Search Help…', disabled: true },
        { type: 'separator' },
        { type: 'item', label: 'About This Macintosh', onSelect: () => openWindow('about') },
      ],
    },
  ];

  // Cmd/Ctrl shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (!cmd) return;
      const key = e.key.toLowerCase();
      if (key === 'w' && activeWindowId) {
        e.preventDefault();
        closeWindow(activeWindowId);
      } else if (key === 'n') {
        e.preventDefault();
        openWindow('finder');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [activeWindowId, closeWindow, openWindow]);

  const timeStr = time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const currentMenu = menus.find(m => m.key === openMenuKey);
  const anchorEl = openMenuKey ? triggerRefs.current[openMenuKey] : null;
  const anchorLeft = anchorEl?.getBoundingClientRect().left ?? 0;

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 flex items-center justify-between z-[9999] select-none"
        style={{
          height: 22,
          background: 'var(--plat-white)',
          borderBottom: '1px solid var(--plat-900)',
          paddingLeft: 4,
          paddingRight: 10,
          fontFamily: 'var(--font-chicago)',
          fontSize: 13,
          color: 'var(--plat-900)',
        }}
      >
        <div className="flex items-center gap-0">
          {(isMobile
            ? menus.filter(m => m.key === 'apple' || m.key === 'app' || m.key === 'special')
            : menus
          ).map(menu => {
            const isOpen = openMenuKey === menu.key;
            const isAppleMenu = menu.key === 'apple';
            const isAppMenu = menu.key === 'app';
            return (
              <button
                key={menu.key}
                ref={el => {
                  if (menu.key) triggerRefs.current[menu.key] = el;
                }}
                className={`menu-item ${isOpen ? 'is-open' : ''}`}
                style={{
                  paddingTop: isAppleMenu ? 2 : 1,
                  fontWeight: isAppMenu ? 700 : 400,
                }}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label={isAppleMenu ? 'Apple menu' : menu.label}
                onMouseDown={e => e.stopPropagation()}
                onClick={() => setOpenMenuKey(prev => (prev === menu.key ? null : menu.key ?? null))}
                onMouseEnter={() => {
                  if (openMenuKey !== null) setOpenMenuKey(menu.key ?? null);
                }}
              >
                {isAppleMenu ? <RainbowApple /> : menu.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span
            className="menu-item"
            style={{ cursor: 'default', fontVariantNumeric: 'tabular-nums' }}
          >
            {timeStr}
          </span>
        </div>
      </div>

      {currentMenu && (
        <MenuBarDropdown
          anchorLeft={anchorLeft}
          items={currentMenu.items}
          onClose={() => setOpenMenuKey(null)}
        />
      )}
    </>
  );
}
