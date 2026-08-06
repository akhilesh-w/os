import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowId } from '../components/Window';
import { useWindowStore } from '../store/windowStore';
import { useWindowCommands } from '../lib/windowCommands';
import PixelIcon from '../components/PixelIcon';

/**
 * Internet Explorer with a Wayback Machine "Time Travel" mode.
 *
 * The signature ryOS app — browse the modern web in an iframe, or pick a
 * year and visit any URL as it existed then via web.archive.org. The
 * Wayback Machine's `if_` flag strips its own toolbar so the framed page
 * looks like the era it lived in.
 *
 * Most modern sites set X-Frame-Options: DENY which blocks plain iframes.
 * We can't detect that programmatically (cross-origin), but we surface a
 * "Try Time Travel" nudge after a few seconds of loading so the user has
 * a working escape hatch.
 */

interface HistoryEntry {
  url: string;
  /** Year selected when this entry was loaded; null = present-day. */
  year: number | null;
}

interface Bookmark {
  name: string;
  url: string;
}

const BOOKMARKS: Bookmark[] = [
  { name: 'akhileshw.xyz', url: 'https://akhileshw.xyz' },
  { name: 'GitHub', url: 'https://github.com/akhilesh-w' },
  { name: 'ryOS', url: 'https://os.ryo.lu' },
  { name: 'Hacker News', url: 'https://news.ycombinator.com' },
  { name: 'Wikipedia', url: 'https://en.wikipedia.org' },
  { name: 'YouTube', url: 'https://youtube.com' },
];

const TIME_TRAVEL_YEARS = [
  null,            // Present
  2020,
  2015,
  2010,
  2005,
  2001,            // dot-com era
  1999,
  1996,            // baby web
];

const HOME_URL = 'about:home';
const STORAGE_KEY = 'os.akhileshw.xyz:ie:v1';

interface PersistedIEState {
  history: HistoryEntry[];
  pos: number;
}

function loadState(): PersistedIEState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const v = JSON.parse(raw) as PersistedIEState;
      if (Array.isArray(v.history) && typeof v.pos === 'number') return v;
    }
  } catch {}
  return { history: [{ url: HOME_URL, year: null }], pos: 0 };
}

function saveState(s: PersistedIEState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

/** Normalize what the user typed into a real URL. */
function normalizeInput(raw: string): string {
  const t = raw.trim();
  if (!t) return HOME_URL;
  if (t === 'about:home' || t === 'home') return HOME_URL;
  // Looks like a URL?
  if (/^https?:\/\//i.test(t)) return t;
  // Bare domain (foo.bar / foo.bar/baz)
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(t)) return 'https://' + t;
  // Otherwise treat as a search query
  return 'https://duckduckgo.com/?q=' + encodeURIComponent(t);
}

/** Build the iframe URL: wraps with web.archive.org when a year is selected. */
function resolveIframeUrl(url: string, year: number | null): string {
  if (url === HOME_URL) return HOME_URL;
  if (year == null) return url;
  // The `if_` flag tells the Wayback Machine to serve the page without its
  // toolbar, so the embed feels like the actual era.
  return `https://web.archive.org/web/${year}0701000000if_/${url}`;
}

export default function InternetExplorer() {
  const windowId = useWindowId();
  const setWindowTitle = useWindowStore(s => s.setWindowTitle);

  const [persisted, setPersisted] = useState<PersistedIEState>(() => loadState());
  const current = persisted.history[persisted.pos] ?? { url: HOME_URL, year: null };

  const [addressInput, setAddressInput] = useState(
    current.url === HOME_URL ? '' : current.url
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showFrameWarning, setShowFrameWarning] = useState(false);
  const loadTimerRef = useRef<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    saveState(persisted);
  }, [persisted]);

  useEffect(() => {
    if (!windowId) return;
    const title =
      current.url === HOME_URL
        ? 'Internet Explorer'
        : current.year != null
        ? `${hostnameOf(current.url)} · ${current.year} — Internet Explorer`
        : `${hostnameOf(current.url)} — Internet Explorer`;
    setWindowTitle(windowId, title);
  }, [windowId, current.url, current.year, setWindowTitle]);

  // Reflect the current URL into the address bar whenever history moves
  // (back, forward, bookmark click) — but not while the user is typing.
  useEffect(() => {
    setAddressInput(current.url === HOME_URL ? '' : current.url);
  }, [current.url, current.year]);

  const navigateTo = useCallback(
    (url: string, year: number | null) => {
      const normalized = normalizeInput(url);
      setPersisted(prev => {
        // Drop forward history when navigating from middle of stack.
        const truncated = prev.history.slice(0, prev.pos + 1);
        // Dedupe: clicking the same entry again is a refresh, not a push.
        const last = truncated[truncated.length - 1];
        if (last && last.url === normalized && last.year === year) {
          return prev;
        }
        const nextHistory = [...truncated, { url: normalized, year }];
        return { history: nextHistory, pos: nextHistory.length - 1 };
      });
      // Trigger reload-warning timer even when URL didn't change.
      setIsLoading(normalized !== HOME_URL);
      setShowFrameWarning(false);
    },
    []
  );

  // Publish menu commands for the active window.
  const openIE = useWindowStore(s => s.openWindow);
  useEffect(() => {
    if (!windowId) return;
    useWindowCommands.getState().set(windowId, {
      newDocument: () =>
        openIE('internet-explorer', { windowKey: `ie-${Date.now()}` }),
      newDocumentLabel: 'New Internet Window',
      newDocumentShortcut: '⌘N',
      copyAddress:
        current.url === HOME_URL
          ? undefined
          : () => {
              navigator.clipboard?.writeText(current.url).catch(() => {});
            },
    });
    return () => useWindowCommands.getState().clear(windowId);
  }, [windowId, openIE, current.url]);

  const canBack = persisted.pos > 0;
  const canForward = persisted.pos < persisted.history.length - 1;

  const goBack = () => {
    if (canBack) setPersisted(p => ({ ...p, pos: p.pos - 1 }));
  };
  const goForward = () => {
    if (canForward) setPersisted(p => ({ ...p, pos: p.pos + 1 }));
  };
  const goHome = () => navigateTo(HOME_URL, null);

  const reload = () => {
    if (iframeRef.current && current.url !== HOME_URL) {
      // Re-set src to force a reload.
      const src = resolveIframeUrl(current.url, current.year);
      iframeRef.current.src = 'about:blank';
      requestAnimationFrame(() => {
        if (iframeRef.current) iframeRef.current.src = src;
      });
      setIsLoading(true);
      setShowFrameWarning(false);
    }
  };

  const submitAddress = (e: React.FormEvent) => {
    e.preventDefault();
    navigateTo(addressInput, current.year);
  };

  const setYear = (year: number | null) => {
    // Re-navigate to current URL with the new year. If we're on home, no-op.
    if (current.url === HOME_URL) return;
    navigateTo(current.url, year);
  };

  const iframeSrc = useMemo(
    () => resolveIframeUrl(current.url, current.year),
    [current.url, current.year]
  );

  // Loading state: show "loading" briefly. If the iframe is blocked by
  // X-Frame-Options we can't detect that directly — after 4s we surface
  // a Time Travel nudge.
  useEffect(() => {
    if (current.url === HOME_URL) {
      setIsLoading(false);
      setShowFrameWarning(false);
      return;
    }
    setIsLoading(true);
    setShowFrameWarning(false);
    if (loadTimerRef.current) window.clearTimeout(loadTimerRef.current);
    loadTimerRef.current = window.setTimeout(() => {
      // If still loading after a few seconds, hint at Time Travel.
      // We're not certain the iframe is blocked, but it's a useful hint.
      if (current.year == null) setShowFrameWarning(true);
    }, 4000);
    return () => {
      if (loadTimerRef.current) window.clearTimeout(loadTimerRef.current);
    };
  }, [current.url, current.year]);

  const onIframeLoad = () => {
    setIsLoading(false);
    if (loadTimerRef.current) window.clearTimeout(loadTimerRef.current);
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--plat-200)',
        fontFamily: 'var(--font-chicago)',
        fontSize: 12,
        color: 'var(--plat-900)',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 6px',
          background: 'var(--plat-100)',
          borderBottom: '1px solid var(--plat-400)',
        }}
      >
        <ToolButton onClick={goBack} disabled={!canBack} title="Back">◀</ToolButton>
        <ToolButton onClick={goForward} disabled={!canForward} title="Forward">▶</ToolButton>
        <ToolButton onClick={reload} disabled={current.url === HOME_URL} title="Reload">↻</ToolButton>
        <ToolButton onClick={goHome} title="Home">⌂</ToolButton>

        <form
          onSubmit={submitAddress}
          style={{ display: 'flex', flex: 1, marginLeft: 6, gap: 4 }}
        >
          <div
            className="chrome-inset"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              background: 'var(--plat-white)',
              padding: '2px 6px',
              gap: 6,
            }}
          >
            <span style={{ color: 'var(--plat-500)', fontSize: 11 }}>Address:</span>
            <input
              value={addressInput}
              onChange={e => setAddressInput(e.target.value)}
              placeholder="Type a URL or search…"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: 'var(--font-monaco)',
                fontSize: 13,
                color: 'var(--plat-900)',
              }}
            />
          </div>
          <button
            type="submit"
            className="chrome-outset"
            style={{
              padding: '2px 10px',
              background: 'var(--plat-200)',
              fontFamily: 'inherit',
              fontSize: 12,
              cursor: 'default',
            }}
          >
            Go
          </button>
        </form>
      </div>

      {/* Time Machine + bookmarks bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 6px',
          background: 'var(--plat-50)',
          borderBottom: '1px solid var(--plat-400)',
          fontSize: 11,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ color: 'var(--plat-700)', fontWeight: 700 }}>Time Machine:</span>
        <select
          value={current.year ?? 'now'}
          onChange={e => setYear(e.target.value === 'now' ? null : Number(e.target.value))}
          className="chrome-outset"
          style={{
            background: 'var(--plat-white)',
            padding: '0 2px',
            fontFamily: 'var(--font-chicago)',
            fontSize: 11,
            border: '1px solid var(--plat-900)',
            cursor: 'default',
          }}
          disabled={current.url === HOME_URL}
        >
          {TIME_TRAVEL_YEARS.map(y => (
            <option key={String(y)} value={y == null ? 'now' : y}>
              {y == null ? 'Today' : y}
            </option>
          ))}
        </select>
        <span style={{ width: 1, height: 14, background: 'var(--plat-400)' }} />
        <span style={{ color: 'var(--plat-700)', fontWeight: 700 }}>Bookmarks:</span>
        {BOOKMARKS.map(b => (
          <button
            key={b.url}
            onClick={() => navigateTo(b.url, current.year)}
            style={{
              background: 'transparent',
              border: 'none',
              fontFamily: 'inherit',
              fontSize: 11,
              color: 'var(--plat-700)',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '1px 3px',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--plat-select)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--plat-700)')}
          >
            {b.name}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, position: 'relative', background: 'var(--plat-white)' }}>
        {current.url === HOME_URL ? (
          <HomePage onPick={url => navigateTo(url, current.year)} />
        ) : (
          <>
            <iframe
              ref={iframeRef}
              key={iframeSrc /* force remount on URL change */}
              src={iframeSrc}
              title="Internet Explorer"
              onLoad={onIframeLoad}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: '#fff',
                display: 'block',
              }}
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
            />
            {isLoading && (
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: 'var(--plat-100)',
                  border: '1px solid var(--plat-900)',
                  padding: '2px 8px',
                  fontSize: 11,
                  fontFamily: 'var(--font-chicago)',
                  boxShadow: '1px 1px 0 var(--plat-shadow)',
                }}
              >
                Loading…
              </div>
            )}
            {showFrameWarning && current.year == null && (
              <div
                className="window-shadow"
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--plat-50)',
                  border: '1px solid var(--plat-900)',
                  padding: '6px 10px',
                  fontSize: 11,
                  fontFamily: 'var(--font-geneva)',
                  maxWidth: 'min(420px, calc(100% - 32px))',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ flex: 1 }}>
                  Site refusing to embed? Try{' '}
                  <strong>Time Machine</strong> → pick a year.
                </span>
                <button
                  onClick={() => setYear(2010)}
                  className="chrome-outset"
                  style={{
                    background: 'var(--plat-200)',
                    padding: '1px 8px',
                    fontSize: 11,
                    fontFamily: 'var(--font-chicago)',
                    cursor: 'default',
                  }}
                >
                  Try 2010
                </button>
                <button
                  onClick={() => setShowFrameWarning(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: 13,
                    color: 'var(--plat-700)',
                    cursor: 'pointer',
                    padding: '0 2px',
                  }}
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Status bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '2px 8px',
          background: 'var(--plat-100)',
          borderTop: '1px solid var(--plat-400)',
          fontSize: 10,
          color: 'var(--plat-700)',
          fontFamily: 'var(--font-geneva)',
          gap: 8,
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isLoading
            ? 'Loading…'
            : current.url === HOME_URL
            ? 'Done.'
            : current.year != null
            ? `${current.year} archive · ${current.url}`
            : current.url}
        </span>
        <span style={{ whiteSpace: 'nowrap' }}>
          {current.year != null ? 'via web.archive.org' : 'internet zone'}
        </span>
      </div>
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      className="chrome-outset"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: 'var(--plat-200)',
        width: 22,
        height: 22,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-chicago)',
        fontSize: 12,
        color: disabled ? 'var(--plat-500)' : 'var(--plat-900)',
        cursor: 'default',
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}

function HomePage({ onPick }: { onPick: (url: string) => void }) {
  return (
    <div
      style={{
        height: '100%',
        overflow: 'auto',
        padding: 24,
        background: 'var(--plat-white)',
        fontFamily: 'var(--font-geneva)',
      }}
    >
      <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PixelIcon name="browser" size={36} />
          <div>
            <div style={{ fontSize: 20, fontFamily: 'var(--font-chicago)', fontWeight: 700 }}>
              Internet Explorer
            </div>
            <div style={{ fontSize: 12, color: 'var(--plat-700)' }}>
              A window into the web — past and present.
            </div>
          </div>
        </div>

        <div
          className="chrome-inset"
          style={{
            background: 'var(--plat-50)',
            padding: 14,
            fontSize: 12,
            color: 'var(--plat-900)',
            lineHeight: 1.5,
          }}
        >
          <strong>Tip —</strong> Type a URL up top, or pick a year from{' '}
          <strong>Time Machine</strong> to visit any site as it existed back
          then (via web.archive.org). Some sites refuse to be framed; Time
          Travel almost always works around it.
        </div>

        <div>
          <SectionLabel>Start here</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
            {BOOKMARKS.map(b => (
              <button
                key={b.url}
                onClick={() => onPick(b.url)}
                className="chrome-outset"
                style={{
                  background: 'var(--plat-100)',
                  padding: '8px 10px',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  cursor: 'default',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontFamily: 'var(--font-chicago)', fontSize: 13, fontWeight: 700 }}>
                  {b.name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--plat-700)' }}>{hostnameOf(b.url)}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>Time travel</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
            <TimeBookmark onPick={onPick} url="https://apple.com" year={1996} label="apple.com · 1996" sub="Pre-iMac Apple" />
            <TimeBookmark onPick={onPick} url="https://google.com" year={1999} label="google.com · 1999" sub="Stanford-era Google" />
            <TimeBookmark onPick={onPick} url="https://yahoo.com" year={1996} label="yahoo.com · 1996" sub="The portal era" />
            <TimeBookmark onPick={onPick} url="https://nytimes.com" year={2001} label="nytimes.com · 2001" sub="Pre-9/11 front page" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TimeBookmark({
  onPick,
  url,
  year,
  label,
  sub,
}: {
  onPick: (url: string) => void;
  url: string;
  year: number;
  label: string;
  sub: string;
}) {
  return (
    <button
      onClick={() => {
        // Use Wayback for these — load directly via the resolver, not the
        // present-day URL.
        const src = `https://web.archive.org/web/${year}0701000000if_/${url}`;
        onPick(src);
      }}
      className="chrome-outset"
      style={{
        background: 'var(--plat-100)',
        padding: '8px 10px',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        cursor: 'default',
        fontFamily: 'inherit',
      }}
    >
      <span style={{ fontFamily: 'var(--font-chicago)', fontSize: 13, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 11, color: 'var(--plat-700)' }}>{sub}</span>
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: 'var(--plat-700)',
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
