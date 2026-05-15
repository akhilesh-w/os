import { useCallback, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useWindowStore } from '../store/windowStore';
import type { WindowState } from '../types';

interface WindowProps {
  state: WindowState;
  children: ReactNode;
}

const MENU_BAR_HEIGHT = 22;
const MIN_VISIBLE = 40;

export default function Window({ state: win, children }: WindowProps) {
  const closeWindow = useWindowStore(s => s.closeWindow);
  const minimizeWindow = useWindowStore(s => s.minimizeWindow);
  const maximizeWindow = useWindowStore(s => s.maximizeWindow);
  const focusWindow = useWindowStore(s => s.focusWindow);
  const updateWindowPosition = useWindowStore(s => s.updateWindowPosition);
  const isActive = useWindowStore(s => s.activeWindowId === win.id);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (win.isMaximized) return;
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
    [win.id, win.x, win.y, win.width, win.isMaximized, focusWindow, updateWindowPosition]
  );

  const computedStyle = win.isMaximized
    ? { left: 0, top: MENU_BAR_HEIGHT, width: '100vw', height: `calc(100vh - ${MENU_BAR_HEIGHT}px)` }
    : { left: win.x, top: win.y, width: win.width, height: win.height };

  return (
    <motion.div
      key={win.id}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className="absolute overflow-hidden flex flex-col group/window window-shadow"
      style={{
        ...computedStyle,
        zIndex: win.zIndex,
        border: '1px solid var(--plat-900)',
        background: 'var(--plat-white)',
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
        {children}
      </div>
    </motion.div>
  );
}
