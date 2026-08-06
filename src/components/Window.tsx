import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useWindowStore } from '../store/windowStore';
import { useThemeStore } from '../store/themeStore';
import { getTheme } from '../lib/themes';
import { useIsMobile } from '../lib/useIsMobile';
import type { WindowState } from '../types';

interface WindowProps {
  state: WindowState;
  children: ReactNode;
}

const WindowIdContext = createContext<string | null>(null);

/** Read the id of the window an app is rendered inside. Returns null outside a Window. */
export function useWindowId(): string | null {
  return useContext(WindowIdContext);
}

const MENU_BAR_HEIGHT = 22;
const MIN_VISIBLE = 40;
const MIN_WIDTH = 220;
const MIN_HEIGHT = 140;

interface ResizeDirs {
  left?: boolean;
  right?: boolean;
  top?: boolean;
  bottom?: boolean;
}

const EDGE = 5; // invisible hit-strip thickness along window edges
const CORNER = 12; // invisible hit-square at window corners

/** Invisible resize hit areas per theme resizeMode (the 'corner' mode uses only the visible size box). */
const EDGE_HANDLES: { key: string; dirs: ResizeDirs; cursor: string; style: React.CSSProperties; modes: Array<'edges' | 'bottom'> }[] = [
  { key: 'n', dirs: { top: true }, cursor: 'ns-resize', style: { top: 0, left: CORNER, right: CORNER, height: 4 }, modes: ['edges'] },
  { key: 's', dirs: { bottom: true }, cursor: 'ns-resize', style: { bottom: 0, left: CORNER, right: CORNER, height: EDGE }, modes: ['edges', 'bottom'] },
  { key: 'w', dirs: { left: true }, cursor: 'ew-resize', style: { left: 0, top: CORNER, bottom: CORNER, width: EDGE }, modes: ['edges'] },
  { key: 'e', dirs: { right: true }, cursor: 'ew-resize', style: { right: 0, top: CORNER, bottom: CORNER, width: EDGE }, modes: ['edges'] },
  { key: 'nw', dirs: { top: true, left: true }, cursor: 'nwse-resize', style: { top: 0, left: 0, width: CORNER, height: CORNER }, modes: ['edges'] },
  { key: 'ne', dirs: { top: true, right: true }, cursor: 'nesw-resize', style: { top: 0, right: 0, width: CORNER, height: CORNER }, modes: ['edges'] },
  { key: 'sw', dirs: { bottom: true, left: true }, cursor: 'nesw-resize', style: { bottom: 0, left: 0, width: CORNER, height: CORNER }, modes: ['edges', 'bottom'] },
  { key: 'se', dirs: { bottom: true, right: true }, cursor: 'nwse-resize', style: { bottom: 0, right: 0, width: CORNER, height: CORNER }, modes: ['edges', 'bottom'] },
];

export default function Window({ state: win, children }: WindowProps) {
  const closeWindow = useWindowStore(s => s.closeWindow);
  const minimizeWindow = useWindowStore(s => s.minimizeWindow);
  const maximizeWindow = useWindowStore(s => s.maximizeWindow);
  const focusWindow = useWindowStore(s => s.focusWindow);
  const updateWindowPosition = useWindowStore(s => s.updateWindowPosition);
  const updateWindowSize = useWindowStore(s => s.updateWindowSize);
  const isActive = useWindowStore(s => s.activeWindowId === win.id);
  const resizeMode = useThemeStore(s => getTheme(s.currentId).resizeMode);
  const isMobile = useIsMobile();
  const fullscreen = win.isMaximized || isMobile;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (win.isMaximized || isMobile) return;
      if ((e.target as HTMLElement).closest('.window-controls')) return;

      e.preventDefault();
      focusWindow(win.id);

      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startWinX = win.x;
      const startWinY = win.y;
      const pointerId = e.pointerId;
      const target = e.currentTarget;
      target.setPointerCapture(pointerId);

      const clamp = (x: number, y: number) => {
        const vw = document.documentElement.clientWidth;
        const vh = document.documentElement.clientHeight;
        return {
          x: Math.min(Math.max(MIN_VISIBLE - win.width, x), vw - MIN_VISIBLE),
          y: Math.min(Math.max(MENU_BAR_HEIGHT, y), vh - MIN_VISIBLE),
        };
      };

      const onMove = (ev: PointerEvent) => {
        const { x, y } = clamp(startWinX + ev.clientX - startMouseX, startWinY + ev.clientY - startMouseY);
        updateWindowPosition(win.id, x, y);
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
    },
    [win.id, win.x, win.y, win.width, win.isMaximized, isMobile, focusWindow, updateWindowPosition]
  );

  /**
   * Shared resize logic for the size box and (on themes that allow it) edge
   * handles. Dragging the left/top edges moves the window as it resizes so
   * the opposite edge stays put.
   */
  const startResize = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, dirs: ResizeDirs) => {
      if (win.isMaximized || isMobile) return;
      e.preventDefault();
      e.stopPropagation();
      focusWindow(win.id);

      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startX = win.x;
      const startY = win.y;
      const startW = win.width;
      const startH = win.height;
      const pointerId = e.pointerId;
      const target = e.currentTarget;
      target.setPointerCapture(pointerId);

      const onMove = (ev: PointerEvent) => {
        const vw = document.documentElement.clientWidth;
        const vh = document.documentElement.clientHeight;
        const dx = ev.clientX - startMouseX;
        const dy = ev.clientY - startMouseY;
        let x = startX;
        let y = startY;
        let w = startW;
        let h = startH;
        if (dirs.right) {
          w = Math.min(Math.max(MIN_WIDTH, startW + dx), Math.max(MIN_WIDTH, vw - startX));
        }
        if (dirs.bottom) {
          h = Math.min(Math.max(MIN_HEIGHT, startH + dy), Math.max(MIN_HEIGHT, vh - startY));
        }
        if (dirs.left) {
          // Cap growth at the current right edge's distance to x=0.
          w = Math.min(Math.max(MIN_WIDTH, startW - dx), startX + startW);
          x = startX + startW - w;
        }
        if (dirs.top) {
          h = Math.min(Math.max(MIN_HEIGHT, startH - dy), startY + startH - MENU_BAR_HEIGHT);
          y = startY + startH - h;
        }
        if (x !== startX || y !== startY) updateWindowPosition(win.id, x, y);
        updateWindowSize(win.id, w, h);
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
    },
    [win.id, win.x, win.y, win.width, win.height, win.isMaximized, isMobile, focusWindow, updateWindowPosition, updateWindowSize]
  );

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => startResize(e, { right: true, bottom: true }),
    [startResize]
  );

  const computedStyle = fullscreen
    ? {
        left: 0,
        top: MENU_BAR_HEIGHT,
        width: '100vw',
        height: isMobile
          ? `calc(100vh - ${MENU_BAR_HEIGHT}px - 64px)` // leave room for dock
          : `calc(100vh - ${MENU_BAR_HEIGHT}px)`,
      }
    : { left: win.x, top: win.y, width: win.width, height: win.height };

  // Genie: shrink toward the dock icon. We anchor `transform-origin` at the
  // dock-icon center (in window-local coords) and scale to ~0. The off-box
  // origin pulls the shrinking rectangle toward the dock visually.
  const winLeft = typeof computedStyle.left === 'number' ? computedStyle.left : 0;
  const winTop = typeof computedStyle.top === 'number' ? computedStyle.top : MENU_BAR_HEIGHT;
  const target = win.minimizeTarget;
  const originX = target ? target.x - winLeft : '50%';
  const originY = target ? target.y - winTop : '50%';

  return (
    <motion.div
      key={win.id}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{
        opacity: win.isMinimized ? 0 : 1,
        scale: win.isMinimized ? 0.04 : 1,
      }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={
        win.isMinimized
          ? { duration: 0.42, ease: [0.45, 0, 0.2, 1] }
          : { duration: 0.32, ease: [0.18, 0.9, 0.3, 1] }
      }
      className="absolute overflow-hidden flex flex-col group/window window-shadow"
      style={{
        ...computedStyle,
        zIndex: win.zIndex,
        border: '1px solid var(--plat-900)',
        background: 'var(--plat-white)',
        pointerEvents: win.isMinimized ? 'none' : 'auto',
        transformOrigin:
          typeof originX === 'number' ? `${originX}px ${originY}px` : `${originX} ${originY}`,
      }}
      onMouseDown={() => focusWindow(win.id)}
    >
      {/* Title bar */}
      <div
        className={`shrink-0 cursor-default select-none touch-none flex items-center ${isActive ? 'title-pinstripe' : 'title-inactive'}`}
        style={{
          height: 19,
          borderBottom: '1px solid var(--plat-900)',
          paddingLeft: 6,
          paddingRight: 6,
          position: 'relative',
        }}
        onPointerDown={handlePointerDown}
        onDoubleClick={() => maximizeWindow(win.id)}
      >
        {/* Left: close box */}
        <div className="window-controls flex items-center" style={{ zIndex: 1 }}>
          <button
            className={`pixel-box ${isActive ? '' : 'is-dim'}`}
            onClick={() => closeWindow(win.id)}
            aria-label="Close"
            title="Close"
          />
        </div>

        {/* Centered title — opaque background covers the pinstripes */}
        <div
          className="absolute left-1/2 -translate-x-1/2 px-2 flex items-center"
          style={{
            background: isActive ? 'var(--plat-100)' : 'var(--plat-100)',
            height: 17,
            top: 1,
            fontFamily: 'var(--font-chicago)',
            fontSize: 13,
            fontWeight: isActive ? 500 : 400,
            color: isActive ? 'var(--plat-900)' : 'var(--plat-500)',
            maxWidth: 'calc(100% - 100px)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            letterSpacing: '0.02em',
          }}
        >
          {win.title}
        </div>

        {/* Right: collapse + zoom */}
        <div className="window-controls ml-auto flex items-center gap-1" style={{ zIndex: 1 }}>
          <button
            className={`pixel-box is-collapse ${isActive ? '' : 'is-dim'}`}
            onClick={() => minimizeWindow(win.id)}
            aria-label="Collapse"
            title="Collapse"
          />
          <button
            className={`pixel-box is-zoom ${isActive ? '' : 'is-dim'}`}
            onClick={() => maximizeWindow(win.id)}
            aria-label="Zoom"
            title="Zoom"
          />
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-auto"
        style={{ background: 'var(--plat-white)' }}
      >
        <WindowIdContext.Provider value={win.id}>
          {children}
        </WindowIdContext.Provider>
      </div>

      {/* Size box (bottom-right resize grip) — Mac OS 8 style */}
      {!fullscreen && (
        <div
          className="size-box"
          onPointerDown={handleResizePointerDown}
          aria-label="Resize"
          title="Resize"
        />
      )}

      {/* Edge/corner resize hit areas — Windows 98/XP resize from every
          edge; NeXTSTEP from its bottom bar. Invisible, sit above content. */}
      {!fullscreen && resizeMode !== 'corner' &&
        EDGE_HANDLES.filter(h => h.modes.includes(resizeMode)).map(h => (
          <div
            key={h.key}
            onPointerDown={e => startResize(e, h.dirs)}
            style={{
              position: 'absolute',
              zIndex: 4,
              touchAction: 'none',
              cursor: h.cursor,
              ...h.style,
            }}
          />
        ))}
    </motion.div>
  );
}
