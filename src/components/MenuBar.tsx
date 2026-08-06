import { useEffect, useRef, useState } from 'react';
import { useWindowStore } from '../store/windowStore';
import { useDesktopStore } from '../store/desktopStore';
import { useSoundStore } from '../store/soundStore';
import { useScreensaverStore } from '../store/screensaverStore';
import { useSpotlightStore } from '../store/spotlightStore';
import { useStickiesStore } from '../store/stickiesStore';
import { useWindowCommands } from '../lib/windowCommands';
import { playBeep, playStartup } from '../lib/sounds';
import { APPS_BY_ID } from '../apps/registry';
import { useIsMobile } from '../lib/useIsMobile';
import type { MenuDefinition } from '../types';
import MenuBarDropdown from './MenuBarDropdown';

function SpotlightGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="6" cy="6" r="3.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <line x1="9" y1="9" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

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

/**
 * Track whether the OS-level focused element is editable. Drives the Edit
 * menu's enabled state — Cut/Copy/Paste/Select All only make sense when
 * there's a text input target.
 */
function useEditableFocus(): boolean {
  const [editable, setEditable] = useState(false);
  useEffect(() => {
    const check = () => {
      const t = document.activeElement as HTMLElement | null;
      if (!t) {
        setEditable(false);
        return;
      }
      const tag = t.tagName?.toLowerCase();
      const isField =
        tag === 'input' || tag === 'textarea' || t.isContentEditable === true;
      setEditable(isField);
    };
    check();
    document.addEventListener('focusin', check);
    document.addEventListener('focusout', check);
    return () => {
      document.removeEventListener('focusin', check);
      document.removeEventListener('focusout', check);
    };
  }, []);
  return editable;
}

export default function MenuBar() {
  const [time, setTime] = useState(new Date());
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const windows = useWindowStore(s => s.windows);
  const activeWindowId = useWindowStore(s => s.activeWindowId);
  const openWindow = useWindowStore(s => s.openWindow);
  const closeWindow = useWindowStore(s => s.closeWindow);
  const closeAllForApp = useWindowStore(s => s.closeAllForApp);
  const resetDesktopPositions = useDesktopStore(s => s.resetPositions);
  const soundEnabled = useSoundStore(s => s.enabled);
  const toggleSound = useSoundStore(s => s.toggle);
  const sleep = useScreensaverStore(s => s.setForceOn);
  const openSpotlight = useSpotlightStore(s => s.open);
  const isMobile = useIsMobile();
  const editableFocus = useEditableFocus();
  const activeCmds = useWindowCommands(s =>
    activeWindowId ? s.byWindow[activeWindowId] : undefined
  );

  // Tick exactly on the minute so the clock never shows a stale minute.
  useEffect(() => {
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        setTime(new Date());
        schedule();
      }, 60_000 - (Date.now() % 60_000) + 50);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, []);

  const activeWindow = windows.find(w => w.id === activeWindowId);
  const activeApp = activeWindow ? APPS_BY_ID[activeWindow.appId] : null;
  const activeAppName = activeApp?.name ?? 'Finder';
  const activeAppId = activeApp?.id;

  const closeActive = () => {
    if (activeWindowId) closeWindow(activeWindowId);
  };

  const quitActive = () => {
    if (activeAppId) closeAllForApp(activeAppId);
  };

  /**
   * Cmd-N — when an app publishes its own `newDocument`, that wins (e.g.
   * Stickies → New Sticky). Otherwise fall back
   * to spawning a fresh Finder window.
   */
  const newForActiveApp = () => {
    if (activeCmds?.newDocument) activeCmds.newDocument();
    else openWindow('finder');
  };

  /**
   * Delegate to native execCommand so the browser handles selection
   * semantics correctly. Deprecated but still works in every browser as
   * of 2026 for cut/copy/selectAll. Paste is the exception — browsers
   * block execCommand('paste') for web content — so it falls back to the
   * async clipboard API and inserts at the caret manually.
   */
  const execEdit = (cmd: 'cut' | 'copy' | 'paste' | 'selectAll') => () => {
    let ok = false;
    try {
      ok = document.execCommand(cmd);
    } catch {}
    if (cmd === 'paste' && !ok) {
      navigator.clipboard?.readText?.().then(text => {
        if (!text) return;
        const el = document.activeElement;
        if (
          (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
          typeof el.selectionStart === 'number'
        ) {
          el.setRangeText(text, el.selectionStart, el.selectionEnd ?? el.selectionStart, 'end');
          // Let React's onChange see the externally-mutated value.
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }).catch(() => {});
    }
  };

  /**
   * Open all existing stickies as windows; create a default one if none
   * exist yet. Matches classic Stickies "all-notes-on-screen" behavior.
   */
  const openStickies = () => {
    const { list, create } = useStickiesStore.getState();
    let notes = list();
    if (notes.length === 0) {
      create();
      notes = useStickiesStore.getState().list();
    }
    for (const note of notes) {
      openWindow('stickies', { windowKey: note.id, stickyId: note.id });
    }
  };

  const newLabel = activeCmds?.newDocumentLabel ?? 'New Finder Window';
  const newShortcut = activeCmds?.newDocumentShortcut ?? '⌘N';
  const hasViewModes = !!activeCmds?.setView;

  const menus: MenuDefinition[] = [
    {
      key: 'apple',
      label: 'apple',
      items: [
        { type: 'item', label: 'About This Macintosh', onSelect: () => openWindow('about') },
        { type: 'separator' },
        { type: 'item', label: 'Calculator', onSelect: () => openWindow('calculator') },
        { type: 'item', label: 'Chooser', disabled: true },
        { type: 'item', label: 'Control Panels', onSelect: () => openWindow('controls') },
        { type: 'item', label: 'Internet Explorer', onSelect: () => openWindow('internet-explorer') },
        { type: 'item', label: 'Launcher', onSelect: () => openWindow('launcher') },
        { type: 'item', label: 'Stickies', onSelect: openStickies },
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
          onSelect: quitActive,
          disabled: !activeAppId,
        },
      ],
    },
    {
      key: 'file',
      label: 'File',
      items: [
        {
          type: 'item',
          label: newLabel,
          shortcut: newShortcut,
          onSelect: newForActiveApp,
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
        { type: 'item', label: 'Cut', shortcut: '⌘X', onSelect: execEdit('cut'), disabled: !editableFocus },
        {
          // If an input is focused, copy that selection (default browser
          // behavior). Otherwise fall back to the app's "primary copyable"
          // — e.g. IE's current URL.
          type: 'item',
          label: 'Copy',
          shortcut: '⌘C',
          onSelect: editableFocus ? execEdit('copy') : activeCmds?.copyAddress,
          disabled: !editableFocus && !activeCmds?.copyAddress,
        },
        { type: 'item', label: 'Paste', shortcut: '⌘V', onSelect: execEdit('paste'), disabled: !editableFocus },
        { type: 'separator' },
        { type: 'item', label: 'Select All', shortcut: '⌘A', onSelect: execEdit('selectAll'), disabled: !editableFocus },
      ],
    },
    {
      key: 'view',
      label: 'View',
      items: [
        {
          type: 'item',
          label: 'as Icons',
          checked: hasViewModes && activeCmds?.view === 'icons',
          onSelect: hasViewModes ? () => activeCmds!.setView!('icons') : undefined,
          disabled: !hasViewModes,
        },
        {
          type: 'item',
          label: 'as List',
          checked: hasViewModes && activeCmds?.view === 'list',
          onSelect: hasViewModes ? () => activeCmds!.setView!('list') : undefined,
          disabled: !hasViewModes,
        },
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

  // Cmd/Ctrl shortcuts: ⌘W close window, ⌘N delegates to active app's
  // newDocument, ⌘Q closes all windows of the active app. We don't fire
  // shortcuts while a menu dropdown is open — the dropdown owns its own
  // keyboard handling (Escape, etc.) in that mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (openMenuKey) return;
      const cmd = e.metaKey || e.ctrlKey;
      if (!cmd) return;
      const key = e.key.toLowerCase();
      if (key === 'w' && activeWindowId) {
        e.preventDefault();
        closeWindow(activeWindowId);
      } else if (key === 'n') {
        e.preventDefault();
        newForActiveApp();
      } else if (key === 'q' && activeAppId) {
        e.preventDefault();
        closeAllForApp(activeAppId);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openMenuKey, activeWindowId, activeAppId, activeCmds, closeWindow, openWindow, closeAllForApp]);

  const timeStr = time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const visibleMenus = isMobile
    ? menus.filter(m => m.key === 'apple' || m.key === 'app' || m.key === 'special')
    : menus;

  const currentMenu = menus.find(m => m.key === openMenuKey);
  const anchorEl = openMenuKey ? triggerRefs.current[openMenuKey] : null;
  const anchorLeft = anchorEl?.getBoundingClientRect().left ?? 0;

  // ←/→ inside an open dropdown hops to the adjacent menu, wrapping around.
  const navigateMenu = (dir: -1 | 1) => {
    const idx = visibleMenus.findIndex(m => m.key === openMenuKey);
    if (idx < 0) return;
    const next = visibleMenus[(idx + dir + visibleMenus.length) % visibleMenus.length];
    setOpenMenuKey(next.key ?? null);
  };

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
          {visibleMenus.map(menu => {
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
                // stopPropagation keeps the dropdown's outside-click closer from firing;
                // preventDefault keeps the menu trigger from stealing focus from a
                // currently-focused input so Edit menu commands stay valid.
                onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
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

        <div className="flex items-center" style={{ gap: 2 }}>
          <button
            className="menu-item"
            onMouseDown={e => e.stopPropagation()}
            onClick={() => openSpotlight()}
            aria-label="Spotlight"
            title="Spotlight (⌘K)"
            style={{ display: 'flex', alignItems: 'center', padding: '0 6px' }}
          >
            <SpotlightGlyph />
          </button>
          <span
            className="menu-item"
            style={{ cursor: 'default', fontVariantNumeric: 'tabular-nums', paddingLeft: 6 }}
          >
            {dateStr}  {timeStr}
          </span>
        </div>
      </div>

      {currentMenu && (
        <MenuBarDropdown
          key={currentMenu.key}
          anchorLeft={anchorLeft}
          items={currentMenu.items}
          onClose={() => setOpenMenuKey(null)}
          onNavigate={navigateMenu}
        />
      )}
    </>
  );
}
