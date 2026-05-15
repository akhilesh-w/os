import { useEffect, useRef, useState } from 'react';

interface NowPlaying {
  isPlaying: boolean;
  title?: string;
  artist?: string;
  album?: string;
  albumImageUrl?: string;
  songUrl?: string;
  lastPlayedAt?: string;
}

type LoadState = 'loading' | 'ready' | 'error';
type Screen = 'now-playing' | 'menu';

const API_URL = '/api/now-playing';
const REFRESH_MS = 30_000;

export default function Music() {
  const [data, setData] = useState<NowPlaying | null>(null);
  const [status, setStatus] = useState<LoadState>('loading');
  const [screen, setScreen] = useState<Screen>('now-playing');
  const [tick, setTick] = useState(0);
  const fetchRef = useRef<AbortController | null>(null);

  const refresh = () => {
    fetchRef.current?.abort();
    const ctrl = new AbortController();
    fetchRef.current = ctrl;
    setStatus(s => (data ? s : 'loading'));
    fetch(API_URL, { signal: ctrl.signal, cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<NowPlaying>;
      })
      .then(json => {
        setData(json);
        setStatus('ready');
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setStatus('error');
      });
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => {
      clearInterval(id);
      fetchRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const openSong = () => {
    if (data?.songUrl) window.open(data.songUrl, '_blank', 'noopener,noreferrer');
  };

  const onCenter = () => {
    if (screen === 'menu') setScreen('now-playing');
    else openSong();
  };

  return (
    <div
      className="h-full w-full flex items-center justify-center"
      style={{
        background:
          'repeating-linear-gradient(45deg, var(--plat-200) 0 2px, var(--plat-100) 2px 4px)',
        padding: 12,
        fontFamily: 'var(--font-chicago)',
        color: 'var(--plat-900)',
      }}
    >
      <div
        className="chrome-outset flex flex-col items-center"
        style={{
          background: 'var(--plat-white)',
          width: 240,
          padding: 14,
          gap: 14,
        }}
      >
        {/* LCD screen */}
        <div
          className="chrome-inset"
          style={{
            width: '100%',
            height: 168,
            background: '#c7d3b7',
            color: '#1a2410',
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* LCD header (inverse) */}
          <div
            style={{
              background: '#1a2410',
              color: '#c7d3b7',
              fontFamily: 'var(--font-chicago)',
              fontSize: 11,
              padding: '2px 6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              letterSpacing: '0.02em',
            }}
          >
            <span>{screen === 'menu' ? 'iPod' : data?.isPlaying ? 'Now Playing' : 'Last Played'}</span>
            <span style={{ fontFamily: 'var(--font-monaco)', fontSize: 13, lineHeight: 1 }}>
              {data?.isPlaying ? '▶' : '❙❙'}
            </span>
          </div>

          {screen === 'now-playing' ? (
            <NowPlayingView data={data} status={status} tick={tick} />
          ) : (
            <MenuView onSelect={() => setScreen('now-playing')} onRefresh={refresh} />
          )}
        </div>

        {/* Clickwheel */}
        <ClickWheel
          onMenu={() => setScreen(s => (s === 'menu' ? 'now-playing' : 'menu'))}
          onPrev={refresh}
          onNext={refresh}
          onPlay={refresh}
          onCenter={onCenter}
        />
      </div>
    </div>
  );
}

function NowPlayingView({
  data,
  status,
  tick,
}: {
  data: NowPlaying | null;
  status: LoadState;
  tick: number;
}) {
  if (status === 'loading' && !data) {
    return <Centered>connecting…</Centered>;
  }
  if (status === 'error' && !data) {
    return <Centered>no signal</Centered>;
  }
  if (!data || !data.title) {
    return <Centered>nothing playing</Centered>;
  }

  const since = data.lastPlayedAt ? relativeTime(data.lastPlayedAt, tick) : null;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        padding: 8,
        gap: 8,
        minHeight: 0,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          flexShrink: 0,
          border: '1px solid #1a2410',
          background: '#1a2410',
          overflow: 'hidden',
          imageRendering: 'pixelated',
        }}
      >
        {data.albumImageUrl ? (
          <img
            src={data.albumImageUrl}
            alt=""
            width={56}
            height={56}
            style={{
              width: 56,
              height: 56,
              display: 'block',
              filter: 'grayscale(1) contrast(1.1) brightness(1.05)',
              opacity: 0.95,
            }}
          />
        ) : null}
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          fontSize: 12,
          lineHeight: 1.15,
        }}
      >
        <Marquee text={data.title} bold />
        <Marquee text={data.artist ?? ''} dim />
        <Marquee text={data.album ?? ''} dim />
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 10, opacity: 0.75 }}>
          {data.isPlaying ? '♪ live from Spotify' : since ? `played ${since}` : ''}
        </div>
      </div>
    </div>
  );
}

function MenuView({ onSelect, onRefresh }: { onSelect: () => void; onRefresh: () => void }) {
  const items = [
    { label: 'Now Playing', onClick: onSelect },
    { label: 'Refresh', onClick: onRefresh },
    { label: 'Source: Spotify', onClick: () => {} },
    { label: 'About', onClick: () => {} },
  ];
  const [sel, setSel] = useState(0);
  return (
    <div style={{ flex: 1, padding: 4, fontSize: 12, display: 'flex', flexDirection: 'column' }}>
      {items.map((it, i) => (
        <button
          key={it.label}
          onMouseEnter={() => setSel(i)}
          onClick={it.onClick}
          style={{
            textAlign: 'left',
            padding: '2px 6px',
            background: i === sel ? '#1a2410' : 'transparent',
            color: i === sel ? '#c7d3b7' : '#1a2410',
            fontFamily: 'var(--font-chicago)',
            fontSize: 12,
            border: 'none',
            cursor: 'default',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>{it.label}</span>
          <span>{i === sel ? '▶' : ''}</span>
        </button>
      ))}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        opacity: 0.75,
      }}
    >
      {children}
    </div>
  );
}

function Marquee({ text, bold, dim }: { text: string; bold?: boolean; dim?: boolean }) {
  if (!text) return <div style={{ height: 14 }} />;
  return (
    <div
      style={{
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontWeight: bold ? 700 : 400,
        opacity: dim ? 0.78 : 1,
        fontSize: 12,
      }}
      title={text}
    >
      {text}
    </div>
  );
}

function ClickWheel({
  onMenu,
  onPrev,
  onNext,
  onPlay,
  onCenter,
}: {
  onMenu: () => void;
  onPrev: () => void;
  onNext: () => void;
  onPlay: () => void;
  onCenter: () => void;
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: 180,
        height: 180,
      }}
    >
      <div
        className="chrome-outset"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'var(--plat-100)',
        }}
      />
      <WheelLabel pos="top" onClick={onMenu}>
        MENU
      </WheelLabel>
      <WheelLabel pos="left" onClick={onPrev}>
        <Glyph kind="prev" />
      </WheelLabel>
      <WheelLabel pos="right" onClick={onNext}>
        <Glyph kind="next" />
      </WheelLabel>
      <WheelLabel pos="bottom" onClick={onPlay}>
        <Glyph kind="play" />
      </WheelLabel>
      <button
        onClick={onCenter}
        aria-label="Select"
        className="chrome-outset"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--plat-white)',
          cursor: 'default',
          padding: 0,
        }}
      />
    </div>
  );
}

function WheelLabel({
  pos,
  onClick,
  children,
}: {
  pos: 'top' | 'left' | 'right' | 'bottom';
  onClick: () => void;
  children: React.ReactNode;
}) {
  const positions: Record<typeof pos, React.CSSProperties> = {
    top: { top: 10, left: '50%', transform: 'translateX(-50%)' },
    bottom: { bottom: 10, left: '50%', transform: 'translateX(-50%)' },
    left: { left: 12, top: '50%', transform: 'translateY(-50%)' },
    right: { right: 12, top: '50%', transform: 'translateY(-50%)' },
  };
  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute',
        ...positions[pos],
        background: 'transparent',
        border: 'none',
        padding: 4,
        fontFamily: 'var(--font-chicago)',
        fontSize: 11,
        color: 'var(--plat-700)',
        cursor: 'default',
        letterSpacing: '0.05em',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </button>
  );
}

function Glyph({ kind }: { kind: 'prev' | 'next' | 'play' }) {
  const bar = { width: 2, height: 8, background: 'var(--plat-700)' };
  if (kind === 'prev') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
        <span style={bar} />
        <Triangle dir="left" />
      </span>
    );
  }
  if (kind === 'next') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
        <Triangle dir="right" />
        <span style={bar} />
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      <span style={bar} />
      <span style={bar} />
      <Triangle dir="right" />
    </span>
  );
}

function Triangle({ dir }: { dir: 'left' | 'right' }) {
  const size = 4;
  return (
    <span
      style={{
        width: 0,
        height: 0,
        borderTop: `${size}px solid transparent`,
        borderBottom: `${size}px solid transparent`,
        ...(dir === 'left'
          ? { borderRight: `${size}px solid var(--plat-700)` }
          : { borderLeft: `${size}px solid var(--plat-700)` }),
      }}
    />
  );
}

function relativeTime(iso: string, _tick: number): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - then) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
