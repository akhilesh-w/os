import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWindowStore } from '../store/windowStore';
import { useSpotlightStore } from '../store/spotlightStore';
import { useStickiesStore } from '../store/stickiesStore';
import { APPS } from '../apps/registry';
import { POSTS } from '../lib/posts';
import PixelIcon from './PixelIcon';

interface Result {
  /** Unique key for React. */
  key: string;
  kind: 'Application' | 'Document' | 'Project' | 'Music' | 'Note';
  label: string;
  detail?: string;
  icon: string;
  action: () => void;
}

const PROJECT_LINKS: { name: string; url: string; detail: string }[] = [
  { name: 'akhileshw.xyz', url: 'https://akhileshw.xyz', detail: 'Personal site' },
  { name: 'dotfiles', url: 'https://github.com/akhilesh-w/dotfiles', detail: 'Arch Linux config' },
  { name: 'log', url: 'https://github.com/akhilesh-w/log', detail: 'Notebook' },
  { name: 'sites', url: 'https://github.com/akhilesh-w/sites', detail: 'Garden of projects' },
  { name: 'gemini-design-plugin', url: 'https://github.com/akhilesh-w/gemini-design-plugin', detail: 'Gemini CLI plugin' },
  { name: 'epoch', url: 'https://github.com/akhilesh-w/epoch', detail: 'Goal tracking app' },
];

/**
 * Score `query` against `text`. Returns -1 for no match, otherwise a higher
 * number for better matches. Word-start matches are boosted; full prefix
 * matches the most.
 */
function fuzzyScore(query: string, text: string): number {
  if (!query) return 0;
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  if (t === q) return 1000;
  if (t.startsWith(q)) return 700;
  // Match at any word boundary (after space, dash, dot, slash)
  if (new RegExp(`(^|[\\s\\-./])${q.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`, 'i').test(text)) {
    return 400;
  }
  if (t.includes(q)) return 200;
  // Subsequence match — every char of q appears in order somewhere in t
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length ? 50 : -1;
}

export default function Spotlight() {
  const isOpen = useSpotlightStore(s => s.isOpen);
  const close = useSpotlightStore(s => s.close);
  const openWindow = useWindowStore(s => s.openWindow);
  const stickiesMap = useStickiesStore(s => s.stickies);
  const stickyOrder = useStickiesStore(s => s.order);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIdx(0);
      // Defer focus so the input is in the DOM
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const allResults = useMemo<Result[]>(() => {
    const out: Result[] = [];
    for (const app of APPS) {
      if (app.hideFromLauncher) continue;
      out.push({
        key: `app:${app.id}`,
        kind: 'Application',
        label: app.name,
        icon: app.icon,
        action: () => openWindow(app.id),
      });
    }
    for (const post of POSTS) {
      out.push({
        key: `post:${post.slug}`,
        kind: 'Document',
        label: post.title,
        detail: 'TextEdit document',
        icon: 'document',
        action: () => openWindow('text-edit', { windowKey: post.slug, slug: post.slug }),
      });
    }
    for (const p of PROJECT_LINKS) {
      out.push({
        key: `proj:${p.name}`,
        kind: 'Project',
        label: p.name,
        detail: p.detail,
        icon: 'folder',
        action: () => window.open(p.url, '_blank', 'noopener,noreferrer'),
      });
    }
    for (const id of stickyOrder) {
      const note = stickiesMap[id];
      if (!note) continue;
      const lines = note.content.split('\n').map(l => l.trim()).filter(Boolean);
      const firstLine = lines[0] ?? '';
      const rest = lines.slice(1).join(' ');
      const label = firstLine ? firstLine.slice(0, 60) : '(untitled sticky)';
      const detail = rest ? rest.slice(0, 80) : 'Sticky note';
      out.push({
        key: `sticky:${id}`,
        kind: 'Note',
        label,
        detail,
        icon: 'sticky',
        action: () => openWindow('stickies', { windowKey: id, stickyId: id }),
      });
    }
    return out;
  }, [openWindow, stickiesMap, stickyOrder]);

  const ranked = useMemo(() => {
    const q = query.trim();
    if (!q) return allResults.slice(0, 12);
    return allResults
      .map(r => ({
        r,
        score:
          Math.max(
            fuzzyScore(q, r.label),
            r.detail ? Math.floor(fuzzyScore(q, r.detail) * 0.5) : -1,
            Math.floor(fuzzyScore(q, r.kind) * 0.3)
          ),
      }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(x => x.r);
  }, [allResults, query]);

  useEffect(() => {
    if (selectedIdx >= ranked.length) setSelectedIdx(0);
  }, [ranked.length, selectedIdx]);

  const runResult = (r: Result | undefined) => {
    if (!r) return;
    r.action();
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => (ranked.length ? (i + 1) % ranked.length : 0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => (ranked.length ? (i - 1 + ranked.length) % ranked.length : 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      runResult(ranked[selectedIdx]);
      return;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
    <motion.div
      key="spotlight"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="fixed inset-0"
      style={{ zIndex: 11000, background: 'rgba(0,0,0,0.18)' }}
      onMouseDown={e => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <motion.div
        initial={{ y: -8, scale: 0.98, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ duration: 0.14, ease: [0.18, 0.9, 0.3, 1] }}
        className="window-shadow"
        // Centered via auto margins, NOT translateX — framer-motion owns the
        // transform for the y/scale entrance and would overwrite it.
        style={{
          position: 'absolute',
          top: '18%',
          left: 0,
          right: 0,
          marginLeft: 'auto',
          marginRight: 'auto',
          width: 540,
          maxWidth: 'calc(100vw - 24px)',
          background: 'var(--plat-white)',
          border: '1px solid var(--plat-900)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          className="chrome-inset"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            background: 'var(--plat-50)',
            borderBottom: '1px solid var(--plat-900)',
          }}
        >
          <SearchGlyph />
          <input
            ref={inputRef}
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIdx(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Spotlight"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: 'var(--font-chicago)',
              fontSize: 18,
              color: 'var(--plat-900)',
              padding: '4px 2px',
              cursor: 'text',
            }}
          />
          <kbd
            style={{
              fontFamily: 'var(--font-monaco)',
              fontSize: 11,
              color: 'var(--plat-600)',
              border: '1px solid var(--plat-400)',
              padding: '1px 5px',
            }}
            aria-hidden
          >
            esc
          </kbd>
        </div>

        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {ranked.length === 0 && (
            <div
              style={{
                padding: 20,
                textAlign: 'center',
                color: 'var(--plat-600)',
                fontSize: 12,
                fontFamily: 'var(--font-geneva)',
              }}
            >
              {query ? `No results for "${query}"` : 'No items.'}
            </div>
          )}
          {ranked.map((r, i) => {
            const sel = i === selectedIdx;
            return (
              <button
                key={r.key}
                onMouseEnter={() => setSelectedIdx(i)}
                onClick={() => runResult(r)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 12px',
                  background: sel ? 'var(--plat-select)' : 'transparent',
                  color: sel ? 'var(--plat-select-fg)' : 'var(--plat-900)',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-geneva)',
                  fontSize: 12,
                  outline: 'none',
                }}
              >
                <PixelIcon
                  name={r.icon}
                  size={22}
                  style={sel ? { color: 'var(--plat-select-fg)' } : undefined}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {r.label}
                  </div>
                  {r.detail && (
                    <div
                      style={{
                        fontSize: 11,
                        color: sel ? 'rgba(255,255,255,0.85)' : 'var(--plat-600)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {r.detail}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: sel ? 'rgba(255,255,255,0.85)' : 'var(--plat-500)',
                  }}
                >
                  {r.kind}
                </span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            padding: '4px 10px',
            background: 'var(--plat-100)',
            borderTop: '1px solid var(--plat-900)',
            fontSize: 10,
            color: 'var(--plat-700)',
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-geneva)',
          }}
        >
          <span>↑↓ navigate · ⏎ open · esc close</span>
          <span>{ranked.length} {ranked.length === 1 ? 'result' : 'results'}</span>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}

function SearchGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="6" cy="6" r="4" fill="none" stroke="var(--plat-700)" strokeWidth="1.5" />
      <line x1="9" y1="9" x2="12.5" y2="12.5" stroke="var(--plat-700)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
