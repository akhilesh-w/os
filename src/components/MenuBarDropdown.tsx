import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { MenuItem } from '../types';

interface MenuBarDropdownProps {
  anchorLeft: number;
  items: MenuItem[];
  onClose: () => void;
  /** Move to the adjacent menu (ArrowLeft = -1, ArrowRight = +1). */
  onNavigate?: (dir: -1 | 1) => void;
  /** The label/glyph rendered in the menu bar for the trigger — drawn inside the dropdown's top inset to keep the visual line continuous, as in classic Mac. */
  triggerLabel?: ReactNode;
}

export default function MenuBarDropdown({ anchorLeft, items, onClose, onNavigate }: MenuBarDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Keyboard highlight — null until the user arrows in, so hover stays the
  // only highlight for mouse users (matching the classic feel). Mirrored in a
  // ref so the document-level key handler reads the current value without
  // re-subscribing on every arrow press.
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const selectedRef = useRef<number | null>(null);
  const select = (v: number | null) => {
    selectedRef.current = v;
    setSelectedIdx(v);
  };

  useEffect(() => {
    const enabledIdx = items
      .map((item, i) => (item.type === 'item' && !item.disabled ? i : -1))
      .filter(i => i >= 0);

    const step = (from: number | null, dir: -1 | 1): number | null => {
      if (enabledIdx.length === 0) return null;
      if (from === null) return dir === 1 ? enabledIdx[0] : enabledIdx[enabledIdx.length - 1];
      const pos = enabledIdx.indexOf(from);
      return enabledIdx[(pos + dir + enabledIdx.length) % enabledIdx.length];
    };

    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        select(step(selectedRef.current, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        select(step(selectedRef.current, -1));
      } else if (e.key === 'ArrowLeft' && onNavigate) {
        e.preventDefault();
        onNavigate(-1);
      } else if (e.key === 'ArrowRight' && onNavigate) {
        e.preventDefault();
        onNavigate(1);
      } else if ((e.key === 'Enter' || e.key === ' ') && selectedRef.current !== null) {
        e.preventDefault();
        const item = items[selectedRef.current];
        if (item?.type === 'item' && !item.disabled) {
          item.onSelect?.();
          onClose();
        }
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [items, onClose, onNavigate]);

  return (
    <div
      ref={ref}
      role="menu"
      style={{
        position: 'fixed',
        top: 22,
        left: anchorLeft,
        background: 'var(--plat-white)',
        border: '1px solid var(--plat-900)',
        boxShadow: '2px 2px 0 var(--plat-shadow), 1px 1px 0 var(--plat-shadow)',
        minWidth: 180,
        padding: '4px 0',
        fontFamily: 'var(--font-chicago)',
        fontSize: 13,
        zIndex: 10000,
      }}
    >
      {items.map((item, i) => {
        if (item.type === 'separator') {
          return (
            <div
              key={`sep-${i}`}
              style={{ margin: '4px 6px', height: 1, background: 'var(--plat-400)' }}
              aria-hidden="true"
            />
          );
        }
        const disabled = !!item.disabled;
        const kbdSelected = selectedIdx === i;
        return (
          <button
            key={`item-${i}`}
            role="menuitem"
            disabled={disabled}
            // Keep the previously-focused element focused (e.g. a textarea
            // being edited) so Cut/Copy/Paste/Select All target it via
            // execCommand. Without this, mousedown shifts focus to the
            // menu item and the edit commands find no selection.
            onMouseDown={e => e.preventDefault()}
            onMouseEnter={() => select(null)}
            onClick={() => {
              if (disabled) return;
              item.onSelect?.();
              onClose();
            }}
            className={`menu-dropdown-item ${kbdSelected ? 'is-kbd-selected' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: '1px 16px 1px 6px',
              border: 'none',
              color: disabled ? 'var(--plat-400)' : 'var(--plat-900)',
              cursor: disabled ? 'default' : 'default',
              fontFamily: 'var(--font-chicago)',
              fontSize: 13,
              textAlign: 'left',
              lineHeight: '18px',
              gap: 16,
            }}
          >
            <span style={{ width: 12, textAlign: 'center', fontWeight: 700 }} aria-hidden="true">
              {item.checked ? '✓' : ''}
            </span>
            <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>
            {item.shortcut && (
              <span
                style={{
                  fontSize: 12,
                  color: disabled ? 'var(--plat-400)' : 'var(--plat-700)',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
