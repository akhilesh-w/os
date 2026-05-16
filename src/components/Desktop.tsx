import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useWindowStore } from '../store/windowStore';
import { useDesktopStore, type IconPosition } from '../store/desktopStore';
import { useWallpaperStore, getWallpaper, WALLPAPERS } from '../store/wallpaperStore';
import { APPS_BY_ID } from '../apps/registry';
import Window from './Window';
import PixelIcon from './PixelIcon';
import ContextMenu from './ContextMenu';
import type { MenuItem } from '../types';

type DesktopIcon =
  | { id: string; label: string; icon: string; opens: string }
  | { id: string; label: string; icon: string; action: 'trash' };

const DESKTOP_ICONS: DesktopIcon[] = [
  { id: 'hd', label: 'Macintosh HD', icon: 'macHD', opens: 'finder' },
  { id: 'projects', label: 'Projects', icon: 'folder', opens: 'finder' },
  { id: 'readme', label: 'README', icon: 'document', opens: 'about' },
  { id: 'trash', label: 'Trash', icon: 'trash', action: 'trash' },
];

const ICON_W = 64;
const ICON_H = 52;
const MENU_BAR_HEIGHT = 22;
const DESKTOP_TOP_PADDING = 12;
const DOCK_SAFE_AREA = 76;
const DRAG_THRESHOLD_PX = 3;

function defaultPositionFor(iconId: string, viewportW: number): IconPosition {
  const idx = DESKTOP_ICONS.findIndex(i => i.id === iconId);
  const safeIdx = idx < 0 ? 0 : idx;
  return {
    x: Math.max(8, viewportW - ICON_W - 12),
    y: MENU_BAR_HEIGHT + DESKTOP_TOP_PADDING + safeIdx * (ICON_H + 18),
  };
}

function clampPosition(x: number, y: number, viewportW: number, viewportH: number): IconPosition {
  return {
    x: Math.min(Math.max(0, x), Math.max(0, viewportW - ICON_W)),
    y: Math.min(
      Math.max(MENU_BAR_HEIGHT + 2, y),
      Math.max(MENU_BAR_HEIGHT + 2, viewportH - ICON_H - DOCK_SAFE_AREA)
    ),
  };
}

export default function Desktop() {
  const windows = useWindowStore(s => s.windows);
  const openWindow = useWindowStore(s => s.openWindow);
  const positions = useDesktopStore(s => s.positions);
  const setPosition = useDesktopStore(s => s.setPosition);
  const resetPositions = useDesktopStore(s => s.resetPositions);
  const wallpaperId = useWallpaperStore(s => s.currentId);
  const setWallpaper = useWallpaperStore(s => s.setCurrent);
  const wallpaper = getWallpaper(wallpaperId);

  const [selected, setSelected] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const resolvedPositions = useMemo(() => {
    const out: Record<string, IconPosition> = {};
    for (const icon of DESKTOP_ICONS) {
      const stored = positions[icon.id];
      const pos = stored ?? defaultPositionFor(icon.id, viewport.w);
      out[icon.id] = clampPosition(pos.x, pos.y, viewport.w, viewport.h);
    }
    return out;
  }, [positions, viewport.w, viewport.h]);

  const handleActivate = (icon: DesktopIcon) => {
    if ('opens' in icon) openWindow(icon.opens);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>, icon: DesktopIcon) => {
    e.stopPropagation();
    setSelected(icon.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = resolvedPositions[icon.id];
    const target = e.currentTarget;
    const pointerId = e.pointerId;
    let dragging = false;

    try {
      target.setPointerCapture(pointerId);
    } catch {}

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragging && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD_PX) {
        dragging = true;
      }
      if (!dragging) return;
      const clamped = clampPosition(startPos.x + dx, startPos.y + dy, viewport.w, viewport.h);
      setPosition(icon.id, clamped.x, clamped.y);
    };

    const onUp = () => {
      try { target.releasePointerCapture(pointerId); } catch {}
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onUp);
    };

    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
  };

  const contextItems: MenuItem[] = [
    { type: 'item', label: 'New Folder', shortcut: '⌘⇧N', disabled: true },
    { type: 'separator' },
    {
      type: 'item',
      label: 'Get Info',
      onSelect: () => openWindow('about'),
    },
    {
      type: 'item',
      label: 'Clean Up Desktop',
      onSelect: resetPositions,
    },
    { type: 'separator' },
    {
      type: 'item',
      label: 'Change Wallpaper…',
      onSelect: () => openWindow('controls'),
    },
    ...WALLPAPERS.map(w => ({
      type: 'item' as const,
      label: '   ' + w.name,
      checked: w.id === wallpaperId,
      onSelect: () => setWallpaper(w.id),
    })),
    { type: 'separator' },
    {
      type: 'item',
      label: 'About This Macintosh',
      onSelect: () => openWindow('about'),
    },
  ];

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ ...wallpaper.style, paddingTop: MENU_BAR_HEIGHT }}
      onMouseDown={e => {
        if (e.target === e.currentTarget) setSelected(null);
      }}
      onContextMenu={e => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        setSelected(null);
        setContextMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      {DESKTOP_ICONS.map(icon => {
        const pos = resolvedPositions[icon.id];
        const isSelected = selected === icon.id;
        return (
          <button
            key={icon.id}
            className="flex flex-col items-center gap-1 outline-none focus-visible:outline-2 focus-visible:outline-dotted focus-visible:outline-black"
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              width: ICON_W,
              background: 'transparent',
              border: 'none',
              cursor: 'default',
              padding: 2,
              touchAction: 'none',
              userSelect: 'none',
            }}
            onPointerDown={e => handlePointerDown(e, icon)}
            onDoubleClick={e => {
              e.stopPropagation();
              handleActivate(icon);
            }}
          >
            <PixelIcon
              name={icon.icon}
              size={32}
              style={isSelected ? { filter: 'invert(1)' } : undefined}
            />
            <span
              style={{
                fontFamily: 'var(--font-chicago)',
                fontSize: 11,
                color: isSelected ? 'var(--plat-white)' : 'var(--plat-900)',
                background: isSelected ? 'var(--plat-900)' : 'var(--plat-white)',
                padding: '0 3px',
                border: '1px solid var(--plat-900)',
                lineHeight: '13px',
              }}
            >
              {icon.label}
            </span>
          </button>
        );
      })}

      <AnimatePresence>
        {windows.map(win => {
          const app = APPS_BY_ID[win.appId];
          const AppComponent = app?.component;
          if (!AppComponent) return null;
          return (
            <Window key={win.id} state={win}>
              <AppComponent />
            </Window>
          );
        })}
      </AnimatePresence>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
