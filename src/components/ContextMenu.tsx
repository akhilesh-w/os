import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MenuItem } from '../types';

interface Props {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const nx = x + rect.width > vw - 4 ? Math.max(4, vw - rect.width - 4) : x;
    const ny = y + rect.height > vh - 4 ? Math.max(4, vh - rect.height - 4) : y;
    if (nx !== pos.x || ny !== pos.y) setPos({ x: nx, y: ny });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onResize = () => onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      onContextMenu={e => e.preventDefault()}
      style={{
        position: 'fixed',
        top: pos.y,
        left: pos.x,
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
              padding: '1px 16px 1px 6px',
              border: 'none',
              color: disabled ? 'var(--plat-400)' : 'var(--plat-900)',
              cursor: 'default',
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
