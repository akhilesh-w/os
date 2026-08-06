import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWindowStore } from '../store/windowStore';
import { APPS_BY_ID } from '../apps/registry';
import PixelIcon from './PixelIcon';

/**
 * Classic ⌘+Tab app switcher. Hold ⌘ (or ⌥ — browsers can't intercept the
 * OS-level ⌘Tab on macOS, so ⌥Tab is the reliable binding) and press Tab to
 * cycle through open (non-minimized) windows. Release the modifier to focus
 * the highlighted one. Shift+Tab cycles in reverse. Escape cancels.
 *
 * We don't recompute the window list every Tab — once the switcher opens we
 * freeze the order so cycling doesn't jump around as focus changes underneath.
 */
export default function AppSwitcher() {
  const windows = useWindowStore(s => s.windows);
  const focusWindow = useWindowStore(s => s.focusWindow);

  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      const mod = cmd || e.altKey;
      if (mod && e.key === 'Tab') {
        e.preventDefault();
        // Registered in capture phase — stop the Tab here so focused app
        // inputs (Terminal autocomplete, text fields) never see it.
        e.stopPropagation();
        if (!open) {
          // Snapshot the currently visible windows, ordered by most-recent z.
          const visible = useWindowStore.getState().windows
            .filter(w => !w.isMinimized)
            .sort((a, b) => b.zIndex - a.zIndex)
            .map(w => w.id);
          if (visible.length === 0) return;
          setSnapshot(visible);
          // Start on the second window — the standard "switch to last app" feel.
          setSelectedIdx(visible.length > 1 ? 1 : 0);
          setOpen(true);
        } else {
          setSelectedIdx(i => {
            const len = snapshot.length;
            if (len === 0) return 0;
            return e.shiftKey ? (i - 1 + len) % len : (i + 1) % len;
          });
        }
      } else if (open && e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      } else if (open && e.key === '`' && cmd) {
        // ⌘+` is the same-app window cycle on macOS — we treat it like a reverse Tab.
        e.preventDefault();
        setSelectedIdx(i => {
          const len = snapshot.length;
          if (len === 0) return 0;
          return (i - 1 + len) % len;
        });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      // Closing on modifier release is what makes it feel native.
      if (open && (e.key === 'Meta' || e.key === 'Control' || e.key === 'Alt')) {
        const id = snapshot[selectedIdx];
        if (id) focusWindow(id);
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, [open, snapshot, selectedIdx, focusWindow]);

  // If the user closes a window mid-cycle, drop it from the snapshot.
  useEffect(() => {
    if (!open) return;
    const stillOpen = new Set(windows.map(w => w.id));
    const filtered = snapshot.filter(id => stillOpen.has(id));
    if (filtered.length !== snapshot.length) {
      if (filtered.length === 0) {
        setOpen(false);
      } else {
        setSnapshot(filtered);
        setSelectedIdx(i => Math.min(i, filtered.length - 1));
      }
    }
  }, [windows, snapshot, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="app-switcher"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 10500 }}
        >
          <div
            className="chrome-outset window-shadow"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              maxWidth: 'calc(100vw - 24px)',
              padding: 10,
              background: 'var(--plat-100)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              {snapshot.map((id, i) => {
                const win = windows.find(w => w.id === id);
                if (!win) return null;
                const app = APPS_BY_ID[win.appId];
                if (!app) return null;
                const sel = i === selectedIdx;
                return (
                  <div
                    key={id}
                    style={{
                      width: 56,
                      height: 56,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: sel ? 'var(--plat-select)' : 'transparent',
                      border: sel ? '1px solid var(--plat-900)' : '1px solid transparent',
                      color: sel ? 'var(--plat-select-fg)' : 'var(--plat-900)',
                    }}
                  >
                    <PixelIcon name={app.icon} size={40} />
                  </div>
                );
              })}
            </div>
            <div
              style={{
                color: 'var(--plat-900)',
                fontFamily: 'var(--font-chicago)',
                fontSize: 12,
                minHeight: 16,
                textAlign: 'center',
              }}
            >
              {(() => {
                const id = snapshot[selectedIdx];
                const win = windows.find(w => w.id === id);
                return win?.title ?? '';
              })()}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
