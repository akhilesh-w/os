import { useEffect, useRef } from 'react';
import { useWindowId } from '../components/Window';
import { useWindowStore } from '../store/windowStore';
import { useStickiesStore, STICKY_COLOR_STYLES, type StickyColor } from '../store/stickiesStore';
import { useWindowCommands } from '../lib/windowCommands';

const COLORS: StickyColor[] = ['yellow', 'pink', 'blue', 'green', 'purple'];

/**
 * One Sticky per window. The Stickies app keys its window by the sticky id
 * via `windowKey`, so opening multiple stickies creates multiple windows.
 *
 * The "Stickies" Apple-menu item is what creates new stickies — see
 * `openStickies()` in MenuBar.tsx.
 */
export default function Stickies() {
  const windowId = useWindowId();
  const windows = useWindowStore(s => s.windows);
  const closeWindow = useWindowStore(s => s.closeWindow);
  const openWindow = useWindowStore(s => s.openWindow);
  const setWindowTitle = useWindowStore(s => s.setWindowTitle);

  const stickyId = windowId
    ? (windows.find(w => w.id === windowId)?.params?.stickyId as string | undefined)
    : undefined;

  const sticky = useStickiesStore(s => (stickyId ? s.stickies[stickyId] : undefined));
  const updateSticky = useStickiesStore(s => s.update);
  const removeSticky = useStickiesStore(s => s.remove);
  const setColor = useStickiesStore(s => s.setColor);
  const createSticky = useStickiesStore(s => s.create);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Opened with no stickyId (from Launcher / Finder / Spotlight). Act as a
  // redirector: open all existing stickies (or create one) and close this
  // empty wrapper window. Runs once.
  const redirectedRef = useRef(false);
  useEffect(() => {
    if (stickyId || !windowId || redirectedRef.current) return;
    redirectedRef.current = true;
    const { list, create } = useStickiesStore.getState();
    let notes = list();
    if (notes.length === 0) {
      create();
      notes = useStickiesStore.getState().list();
    }
    for (const note of notes) {
      openWindow('stickies', { windowKey: note.id, stickyId: note.id });
    }
    closeWindow(windowId);
  }, [stickyId, windowId, openWindow, closeWindow]);

  // Keep the window title in sync with the first line of the note.
  useEffect(() => {
    if (!windowId) return;
    const firstLine = (sticky?.content ?? '').split('\n')[0].trim();
    const t = firstLine ? firstLine.slice(0, 40) : 'Sticky';
    setWindowTitle(windowId, t);
  }, [windowId, sticky?.content, setWindowTitle]);

  // Publish "New Sticky" so the File menu lights up.
  useEffect(() => {
    if (!windowId || !stickyId) return;
    useWindowCommands.getState().set(windowId, {
      newDocument: () => {
        const s = createSticky();
        openWindow('stickies', { windowKey: s.id, stickyId: s.id });
      },
      newDocumentLabel: 'New Sticky',
      newDocumentShortcut: '⌘N',
    });
    return () => useWindowCommands.getState().clear(windowId);
  }, [windowId, stickyId, createSticky, openWindow]);

  // If the sticky disappears from the store (e.g. wiped storage), close the window.
  useEffect(() => {
    if (!windowId) return;
    if (stickyId && !sticky) closeWindow(windowId);
  }, [windowId, stickyId, sticky, closeWindow]);

  if (!sticky || !stickyId) {
    // Redirector — render nothing while the effect fans out the real windows.
    return null;
  }

  const palette = STICKY_COLOR_STYLES[sticky.color];

  const newSticky = () => {
    const s = createSticky();
    openWindow('stickies', { windowKey: s.id, stickyId: s.id });
  };

  const deleteThis = () => {
    if (!windowId) return;
    closeWindow(windowId);
    removeSticky(stickyId);
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: palette.bg,
        fontFamily: 'var(--font-geneva)',
      }}
    >
      {/* Mini-toolbar inside the sticky: color swatch + new + delete */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 6px',
          background: palette.bgDeep,
          borderBottom: '1px solid rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', gap: 3 }}>
          {COLORS.map(c => {
            const sel = sticky.color === c;
            const style = STICKY_COLOR_STYLES[c];
            return (
              <button
                key={c}
                onClick={() => setColor(stickyId, c)}
                title={c.charAt(0).toUpperCase() + c.slice(1)}
                aria-label={`Color ${c}`}
                style={{
                  width: 12,
                  height: 12,
                  background: style.bg,
                  border: sel ? '1px solid #000' : '1px solid rgba(0,0,0,0.35)',
                  boxShadow: sel ? '0 0 0 1px #fff inset' : 'none',
                  padding: 0,
                  cursor: 'default',
                }}
              />
            );
          })}
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={newSticky}
          title="New sticky"
          aria-label="New sticky"
          style={{
            width: 16,
            height: 14,
            background: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(0,0,0,0.5)',
            fontFamily: 'var(--font-chicago)',
            fontSize: 11,
            cursor: 'default',
            padding: 0,
            lineHeight: 1,
          }}
        >
          +
        </button>
        <button
          onClick={deleteThis}
          title="Delete this sticky"
          aria-label="Delete sticky"
          style={{
            width: 16,
            height: 14,
            background: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(0,0,0,0.5)',
            fontFamily: 'var(--font-chicago)',
            fontSize: 11,
            cursor: 'default',
            padding: 0,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={sticky.content}
        onChange={e => updateSticky(stickyId, e.target.value)}
        placeholder="Write a note…"
        spellCheck={false}
        style={{
          flex: 1,
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          padding: '8px 10px',
          resize: 'none',
          fontFamily: 'var(--font-geneva)',
          fontSize: 13,
          lineHeight: 1.45,
          color: '#1a1a1a',
        }}
      />
    </div>
  );
}
