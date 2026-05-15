import { useEffect, useRef, type ReactNode } from 'react';
import type { MenuItem } from '../types';

interface MenuBarDropdownProps {
  anchorLeft: number;
  items: MenuItem[];
  onClose: () => void;
  /** The label/glyph rendered in the menu bar for the trigger — drawn inside the dropdown's top inset to keep the visual line continuous, as in classic Mac. */
  triggerLabel?: ReactNode;
}

export default function MenuBarDropdown({ anchorLeft, items, onClose }: MenuBarDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

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
        return (
          <button
            key={`item-${i}`}
            role="menuitem"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              item.onSelect?.();
              onClose();
            }}
            className="menu-dropdown-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: '1px 16px 1px 18px',
              background: 'transparent',
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
