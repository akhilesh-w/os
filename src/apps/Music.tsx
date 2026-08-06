import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { PLAYLIST, ALBUM_LIST, type Track } from '../lib/music';
import { fetchLyrics, activeLineIndex, type Lyrics } from '../lib/lyrics';
import { playTick, playClick } from '../lib/sounds';
import { useWindowId } from '../components/Window';
import { useWindowStore } from '../store/windowStore';

const ALBUMS = Array.from(new Set(PLAYLIST.map(t => t.album))).sort();
const ARTISTS = Array.from(new Set(PLAYLIST.map(t => t.artist))).sort();

// ────────── Persisted state ──────────

function usePersistedState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [val, setVal] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);
  return [val, setVal];
}

// ────────── Types ──────────

type ScreenId =
  | 'main'
  | 'music'
  | 'coverflow'
  | 'songs'
  | 'albums'
  | 'album'
  | 'artists'
  | 'artist'
  | 'playlists'
  | 'extras'
  | 'clock'
  | 'settings'
  | 'shuffle-setting'
  | 'repeat-setting'
  | 'about'
  | 'now-playing';

interface Frame {
  id: ScreenId;
  param?: string;
  selected: number;
  scrollTop: number;
}

interface MenuItem {
  label: string;
  onSelect: () => void;
  rightLabel?: string;
  marker?: '♪' | '✓';
}

type Repeat = 'off' | 'one' | 'all';
type NpMode = 'normal' | 'volume' | 'scrub' | 'rating' | 'lyrics';

const VISIBLE_ITEMS = 7;
const LCD_W = 218;
const LCD_H = 162;

// ────────── Main ──────────

export default function Music() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  const [volume, setVolume] = usePersistedState('ipod:volume', 70);
  const [shuffle, setShuffle] = usePersistedState('ipod:shuffle', false);
  const [repeat, setRepeat] = usePersistedState<Repeat>('ipod:repeat', 'off');
  const [backlight, setBacklight] = usePersistedState('ipod:backlight', true);
  const [ratings, setRatings] = usePersistedState<number[]>(
    'ipod:ratings',
    new Array(PLAYLIST.length).fill(0)
  );

  // Seed the stack so the iPod opens on the song list (not the main menu).
  // Pre-pushing main + music means pressing MENU still walks back through
  // the natural Music → Main path, matching real iPod navigation.
  const [stack, setStack] = useState<Frame[]>([
    { id: 'main', selected: 0, scrollTop: 0 },
    { id: 'music', selected: 4, scrollTop: 0 },
    { id: 'songs', selected: 0, scrollTop: 0 },
  ]);
  const top = stack[stack.length - 1];

  const [npMode, setNpMode] = useState<NpMode>('normal');
  const npTimerRef = useRef<number | null>(null);

  const [battery, setBattery] = useState(92);
  useEffect(() => {
    const i = window.setInterval(() => {
      setBattery(b => (b > 6 ? b - 1 : 78 + Math.floor(Math.random() * 20)));
    }, 90_000);
    return () => clearInterval(i);
  }, []);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const i = window.setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const track = PLAYLIST[index];

  // Load the audio whenever the selected track changes.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    setStatus('loading');
    setCurrentTime(0);
    setDuration(0);
    a.src = track.src;
    a.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Drive play/pause off `isPlaying` + `index`. The first play() call right
  // after src+load can reject because the browser hasn't buffered enough
  // yet — so we also listen for `canplay` and retry there. This is what
  // makes the *first* press of play actually start the song instead of
  // silently failing and only working after a track change.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!isPlaying) {
      a.pause();
      return;
    }
    const attempt = () => {
      // Promise rejection is normal during loading; the canplay listener
      // below will fire once the buffer is ready and try again. Real
      // playback errors come through the audio element's onError.
      a.play().catch(() => {});
    };
    attempt();
    a.addEventListener('canplay', attempt);
    return () => {
      a.removeEventListener('canplay', attempt);
    };
  }, [isPlaying, index]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  // Toggle through the isPlaying state so the single play/pause effect above
  // is the only place that touches the audio element. The audio's own
  // onPlay/onPause handlers keep isPlaying in sync if the browser changes
  // playback state on its own (e.g. system media controls).
  const togglePlay = useCallback(() => {
    setIsPlaying(p => !p);
  }, []);

  const nextTrack = useCallback(() => {
    if (shuffle && PLAYLIST.length > 1) {
      let n: number;
      do {
        n = Math.floor(Math.random() * PLAYLIST.length);
      } while (n === index);
      setIndex(n);
      setIsPlaying(true);
      return;
    }
    setIndex(i => (i + 1) % PLAYLIST.length);
    setIsPlaying(true);
  }, [shuffle, index]);

  const prevTrack = useCallback(() => {
    const a = audioRef.current;
    if (a && a.currentTime > 3) {
      a.currentTime = 0;
      return;
    }
    setIndex(i => (i - 1 + PLAYLIST.length) % PLAYLIST.length);
  }, []);

  const handleTrackEnded = () => {
    if (repeat === 'one') {
      const a = audioRef.current;
      if (a) {
        a.currentTime = 0;
        a.play().catch(() => {});
      }
      return;
    }
    if (repeat === 'all' || shuffle) {
      nextTrack();
      return;
    }
    if (index < PLAYLIST.length - 1) {
      setIndex(i => i + 1);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  // Stack
  const push = useCallback((id: ScreenId, param?: string) => {
    playClick();
    setStack(s => [...s, { id, param, selected: 0, scrollTop: 0 }]);
  }, []);

  const pop = useCallback(() => {
    playClick();
    setStack(s => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  const setTopSel = useCallback((sel: number, items: MenuItem[]) => {
    setStack(s =>
      s.map((f, i) => {
        if (i !== s.length - 1) return f;
        let scrollTop = f.scrollTop;
        if (sel < scrollTop) scrollTop = sel;
        if (sel >= scrollTop + VISIBLE_ITEMS) scrollTop = sel - VISIBLE_ITEMS + 1;
        scrollTop = Math.max(0, Math.min(Math.max(0, items.length - VISIBLE_ITEMS), scrollTop));
        return { ...f, selected: sel, scrollTop };
      })
    );
  }, []);

  // Now-playing transient mode
  const resetNpTimer = useCallback(() => {
    if (npTimerRef.current != null) clearTimeout(npTimerRef.current);
    npTimerRef.current = window.setTimeout(() => setNpMode('normal'), 4500);
  }, []);

  // Center-button cycle on Now Playing: scrub → rating → volume → lyrics.
  // Lyrics is a full-screen mode with no auto-timeout; every other transient
  // mode falls back to normal after 4.5s of inactivity.
  const cycleNpMode = useCallback(() => {
    setNpMode(m => {
      const next: NpMode =
        m === 'normal' ? 'scrub'
        : m === 'scrub' ? 'rating'
        : m === 'rating' ? 'volume'
        : m === 'volume' ? 'lyrics'
        : 'normal';
      if (next === 'lyrics') {
        if (npTimerRef.current != null) clearTimeout(npTimerRef.current);
      } else {
        resetNpTimer();
      }
      return next;
    });
  }, [resetNpTimer]);

  const handleNpScroll = useCallback(
    (dir: 1 | -1) => {
      // Wheel default on Now Playing is seek (like Cover-Flow-era iPods) —
      // volume is still reachable through the center-button cycle.
      const mode: NpMode = npMode === 'normal' || npMode === 'lyrics' ? 'scrub' : npMode;
      if (mode === 'volume') {
        setVolume(v => Math.max(0, Math.min(100, v + dir * 4)));
      } else if (mode === 'scrub') {
        const a = audioRef.current;
        if (a && duration) {
          const next = Math.max(
            0,
            Math.min(duration, a.currentTime + dir * (duration > 120 ? 5 : 2))
          );
          a.currentTime = next;
          setCurrentTime(next);
        }
      } else if (mode === 'rating') {
        setRatings(rs => {
          const next = [...rs];
          next[index] = Math.max(0, Math.min(5, (next[index] ?? 0) + dir));
          return next;
        });
      }
      if (npMode === 'normal') {
        setNpMode('scrub');
        resetNpTimer();
      } else if (npMode !== 'lyrics') {
        resetNpTimer();
      }
    },
    [npMode, duration, index, resetNpTimer, setRatings, setVolume]
  );

  // Items per screen
  const itemsFor = useCallback(
    (frame: Frame): MenuItem[] => {
      switch (frame.id) {
        case 'main':
          return [
            { label: 'Music', onSelect: () => push('music'), rightLabel: '›' },
            { label: 'Extras', onSelect: () => push('extras'), rightLabel: '›' },
            { label: 'Settings', onSelect: () => push('settings'), rightLabel: '›' },
            {
              label: 'Shuffle Songs',
              onSelect: () => {
                const n = Math.floor(Math.random() * PLAYLIST.length);
                setShuffle(true);
                setIndex(n);
                setIsPlaying(true);
                push('now-playing');
              },
            },
            {
              label: 'Backlight',
              onSelect: () => setBacklight(b => !b),
              rightLabel: backlight ? 'On' : 'Off',
            },
            { label: 'Now Playing', onSelect: () => push('now-playing'), rightLabel: '›' },
          ];
        case 'music':
          return [
            { label: 'Cover Flow', onSelect: () => push('coverflow'), rightLabel: '›' },
            { label: 'Playlists', onSelect: () => push('playlists'), rightLabel: '›' },
            { label: 'Artists', onSelect: () => push('artists'), rightLabel: '›' },
            { label: 'Albums', onSelect: () => push('albums'), rightLabel: '›' },
            { label: 'Songs', onSelect: () => push('songs'), rightLabel: '›' },
          ];
        case 'coverflow':
          return ALBUM_LIST.map(a => ({
            label: a.name,
            onSelect: () => push('album', a.name),
          }));
        case 'songs':
          return PLAYLIST.map((t, i) => ({
            label: t.title,
            marker: i === index ? '♪' : undefined,
            onSelect: () => {
              setIndex(i);
              setIsPlaying(true);
              push('now-playing');
            },
          }));
        case 'albums':
          return ALBUMS.map(a => ({
            label: a,
            onSelect: () => push('album', a),
            rightLabel: '›',
          }));
        case 'album': {
          const album = frame.param;
          return PLAYLIST.map((t, i) => ({ t, i }))
            .filter(({ t }) => t.album === album)
            .map(({ t, i }) => ({
              label: t.title,
              marker: i === index ? '♪' : undefined,
              onSelect: () => {
                setIndex(i);
                setIsPlaying(true);
                push('now-playing');
              },
            }));
        }
        case 'artists':
          return ARTISTS.map(a => ({
            label: a,
            onSelect: () => push('artist', a),
            rightLabel: '›',
          }));
        case 'artist': {
          const artist = frame.param;
          return PLAYLIST.map((t, i) => ({ t, i }))
            .filter(({ t }) => t.artist === artist)
            .map(({ t, i }) => ({
              label: t.title,
              marker: i === index ? '♪' : undefined,
              onSelect: () => {
                setIndex(i);
                setIsPlaying(true);
                push('now-playing');
              },
            }));
        }
        case 'playlists':
          return [
            { label: 'On-The-Go', onSelect: () => push('songs'), rightLabel: '›' },
            { label: 'Recently Added', onSelect: () => push('songs'), rightLabel: '›' },
            { label: 'Top Rated', onSelect: () => push('songs'), rightLabel: '›' },
          ];
        case 'extras':
          return [
            { label: 'Clock', onSelect: () => push('clock'), rightLabel: '›' },
            { label: 'Notes', onSelect: () => push('about', 'notes') },
            { label: 'About', onSelect: () => push('about'), rightLabel: '›' },
          ];
        case 'settings':
          return [
            { label: 'About', onSelect: () => push('about'), rightLabel: '›' },
            {
              label: 'Shuffle',
              onSelect: () => push('shuffle-setting'),
              rightLabel: shuffle ? 'Songs' : 'Off',
            },
            {
              label: 'Repeat',
              onSelect: () => push('repeat-setting'),
              rightLabel: repeat === 'off' ? 'Off' : repeat === 'one' ? 'One' : 'All',
            },
            {
              label: 'Backlight',
              onSelect: () => setBacklight(b => !b),
              rightLabel: backlight ? 'On' : 'Off',
            },
            {
              label: 'Reset Ratings',
              onSelect: () => setRatings(new Array(PLAYLIST.length).fill(0)),
            },
          ];
        case 'shuffle-setting':
          return [
            {
              label: 'Off',
              marker: !shuffle ? '✓' : undefined,
              onSelect: () => {
                setShuffle(false);
                pop();
              },
            },
            {
              label: 'Songs',
              marker: shuffle ? '✓' : undefined,
              onSelect: () => {
                setShuffle(true);
                pop();
              },
            },
          ];
        case 'repeat-setting':
          return [
            {
              label: 'Off',
              marker: repeat === 'off' ? '✓' : undefined,
              onSelect: () => {
                setRepeat('off');
                pop();
              },
            },
            {
              label: 'One',
              marker: repeat === 'one' ? '✓' : undefined,
              onSelect: () => {
                setRepeat('one');
                pop();
              },
            },
            {
              label: 'All',
              marker: repeat === 'all' ? '✓' : undefined,
              onSelect: () => {
                setRepeat('all');
                pop();
              },
            },
          ];
        default:
          return [];
      }
    },
    [backlight, index, push, pop, repeat, setBacklight, setRatings, setRepeat, setShuffle, shuffle]
  );

  const currentItems = useMemo(() => itemsFor(top), [top, itemsFor]);

  const onScroll = useCallback(
    (dir: 1 | -1) => {
      playTick();
      if (top.id === 'now-playing') return handleNpScroll(dir);
      if (top.id === 'about' || top.id === 'clock') return;
      const items = currentItems;
      if (!items.length) return;
      const next = (top.selected + dir + items.length) % items.length;
      setTopSel(next, items);
    },
    [top, currentItems, setTopSel, handleNpScroll]
  );

  const onCenter = useCallback(() => {
    if (top.id === 'now-playing') return cycleNpMode();
    if (top.id === 'about' || top.id === 'clock') return;
    const items = currentItems;
    if (!items.length) return;
    items[Math.min(top.selected, items.length - 1)]?.onSelect();
  }, [top, currentItems, cycleNpMode]);

  const onMenu = useCallback(() => {
    if (stack.length === 1) return;
    pop();
  }, [stack.length, pop]);

  // Click a visible menu row directly (mouse/trackpad convenience).
  const onItemClick = useCallback(
    (idx: number) => {
      const items = currentItems;
      if (!items[idx]) return;
      setTopSel(idx, items);
      playClick();
      items[idx].onSelect();
    },
    [currentItems, setTopSel]
  );

  // Jump Cover Flow selection to a clicked side cover.
  const onCoverJump = useCallback(
    (idx: number) => {
      playTick();
      setTopSel(idx, currentItems);
    },
    [currentItems, setTopSel]
  );

  // Trackpad/mouse wheel anywhere over the LCD scrolls like the click wheel.
  const lcdWheelAccum = useRef(0);
  const onLcdWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      lcdWheelAccum.current += e.deltaY;
      const step = 28;
      while (lcdWheelAccum.current >= step) {
        onScroll(1);
        lcdWheelAccum.current -= step;
      }
      while (lcdWheelAccum.current <= -step) {
        onScroll(-1);
        lcdWheelAccum.current += step;
      }
    },
    [onScroll]
  );

  // Keyboard control while the iPod window is focused: arrows navigate,
  // Enter selects, Escape/Backspace = MENU, ←/→ = prev/next, Space toggles.
  const windowId = useWindowId();
  const isActiveWindow = useWindowStore(s => s.activeWindowId != null && s.activeWindowId === windowId);
  useEffect(() => {
    if (!isActiveWindow) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || t?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case 'ArrowUp': e.preventDefault(); onScroll(-1); break;
        case 'ArrowDown': e.preventDefault(); onScroll(1); break;
        case 'Enter': e.preventDefault(); playClick(); onCenter(); break;
        case 'Escape':
        case 'Backspace': e.preventDefault(); onMenu(); break;
        case 'ArrowLeft': e.preventDefault(); playClick(); prevTrack(); break;
        case 'ArrowRight': e.preventDefault(); playClick(); nextTrack(); break;
        case ' ': e.preventDefault(); playClick(); togglePlay(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActiveWindow, onScroll, onCenter, onMenu, prevTrack, nextTrack, togglePlay]);

  const lcdTitle = useMemo(() => {
    switch (top.id) {
      case 'main': return 'iPod';
      case 'music': return 'Music';
      case 'coverflow': return 'Cover Flow';
      case 'songs': return 'Songs';
      case 'albums': return 'Albums';
      case 'album': return top.param ?? 'Album';
      case 'artists': return 'Artists';
      case 'artist': return top.param ?? 'Artist';
      case 'playlists': return 'Playlists';
      case 'extras': return 'Extras';
      case 'clock': return 'Clock';
      case 'settings': return 'Settings';
      case 'shuffle-setting': return 'Shuffle';
      case 'repeat-setting': return 'Repeat';
      case 'about':
        return top.param === 'notes' ? 'Notes' : 'About';
      case 'now-playing': return 'Now Playing';
      default: return 'iPod';
    }
  }, [top]);

  const lcdBg = backlight ? '#c7d3b7' : '#7a8470';
  const lcdFg = '#1a2410';

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
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={e => {
          setDuration(e.currentTarget.duration || 0);
          setStatus('ready');
        }}
        onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleTrackEnded}
        onError={() => setStatus('error')}
      />

      <div
        className="chrome-outset flex flex-col items-center"
        style={{
          background: 'var(--plat-white)',
          width: 252,
          padding: 14,
          gap: 14,
        }}
      >
        <div
          className="chrome-inset"
          onWheel={onLcdWheel}
          style={{
            width: LCD_W,
            height: LCD_H,
            background: lcdBg,
            color: lcdFg,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            touchAction: 'none',
          }}
        >
          <LcdHeader
            title={lcdTitle}
            isPlaying={isPlaying}
            battery={battery}
            shuffle={shuffle}
            repeat={repeat}
            bg={lcdBg}
            fg={lcdFg}
          />
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {top.id === 'now-playing' ? (
              npMode === 'lyrics' ? (
                <LyricsView track={track} currentTime={currentTime} fg={lcdFg} bg={lcdBg} />
              ) : (
                <NowPlayingView
                  track={track}
                  index={index}
                  currentTime={currentTime}
                  duration={duration}
                  status={status}
                  volume={volume}
                  rating={ratings[index] ?? 0}
                  npMode={npMode}
                  fg={lcdFg}
                  bg={lcdBg}
                />
              )
            ) : top.id === 'coverflow' ? (
              <CoverFlowView
                selected={top.selected}
                fg={lcdFg}
                bg={lcdBg}
                onJump={onCoverJump}
                onOpen={onCenter}
              />
            ) : top.id === 'about' ? (
              <AboutView variant={top.param} />
            ) : top.id === 'clock' ? (
              <ClockView now={now} fg={lcdFg} bg={lcdBg} />
            ) : (
              <Menu
                items={currentItems}
                selected={top.selected}
                scrollTop={top.scrollTop}
                onItemClick={onItemClick}
              />
            )}
          </div>
        </div>

        <ClickWheel
          onScroll={onScroll}
          onCenter={onCenter}
          onMenu={onMenu}
          onPlayPause={togglePlay}
          onPrev={prevTrack}
          onNext={nextTrack}
        />
      </div>
    </div>
  );
}

// ────────── LCD header ──────────

function LcdHeader({
  title,
  isPlaying,
  battery,
  shuffle,
  repeat,
  bg,
  fg,
}: {
  title: string;
  isPlaying: boolean;
  battery: number;
  shuffle: boolean;
  repeat: Repeat;
  bg: string;
  fg: string;
}) {
  return (
    <div
      style={{
        background: fg,
        color: bg,
        fontFamily: 'var(--font-chicago)',
        fontSize: 11,
        padding: '2px 6px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        letterSpacing: '0.02em',
      }}
    >
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {title}
      </span>
      <span
        style={{
          display: 'inline-flex',
          gap: 4,
          alignItems: 'center',
          fontFamily: 'var(--font-monaco)',
          fontSize: 12,
        }}
      >
        {shuffle && <span title="Shuffle">⤮</span>}
        {repeat === 'one' && <span title="Repeat One">↻¹</span>}
        {repeat === 'all' && <span title="Repeat All">↻</span>}
        <span style={{ fontFamily: 'var(--font-monaco)', fontSize: 13, lineHeight: 1 }}>
          {isPlaying ? '▶' : '❙❙'}
        </span>
        <BatteryGlyph pct={battery} bg={bg} />
      </span>
    </div>
  );
}

function BatteryGlyph({ pct, bg }: { pct: number; bg: string }) {
  const filled = Math.max(0, Math.min(12, Math.round((pct / 100) * 12)));
  return (
    <span title={`${pct}%`} style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 2 }}>
      <span
        style={{
          display: 'inline-block',
          border: `1px solid ${bg}`,
          width: 14,
          height: 7,
          position: 'relative',
        }}
      >
        <span
          style={{
            display: 'block',
            height: '100%',
            width: `${(filled / 12) * 100}%`,
            background: bg,
          }}
        />
      </span>
      <span
        style={{
          display: 'inline-block',
          width: 1,
          height: 4,
          background: bg,
          marginLeft: 1,
        }}
      />
    </span>
  );
}

// ────────── Menu list ──────────

function Menu({
  items,
  selected,
  scrollTop,
  onItemClick,
}: {
  items: MenuItem[];
  selected: number;
  scrollTop: number;
  onItemClick?: (idx: number) => void;
}) {
  if (!items.length) {
    return <div style={{ padding: 8, fontSize: 11, opacity: 0.7 }}>(empty)</div>;
  }
  const visible = items.slice(scrollTop, scrollTop + VISIBLE_ITEMS);
  const hasScrollbar = items.length > VISIBLE_ITEMS;
  const thumbH = Math.max(12, (VISIBLE_ITEMS / items.length) * 100);
  const thumbTop = (scrollTop / Math.max(1, items.length - VISIBLE_ITEMS)) * (100 - thumbH);
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
      <div style={{ flex: 1, minWidth: 0, padding: '2px 0', display: 'flex', flexDirection: 'column' }}>
        {visible.map((item, i) => {
          const realIdx = i + scrollTop;
          const sel = realIdx === selected;
          return (
            <div
              key={realIdx}
              onClick={onItemClick ? () => onItemClick(realIdx) : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '1px 6px',
                background: sel ? '#1a2410' : 'transparent',
                color: sel ? '#c7d3b7' : '#1a2410',
                fontFamily: 'var(--font-chicago)',
                fontSize: 12,
                lineHeight: 1.4,
                cursor: onItemClick ? 'pointer' : undefined,
              }}
            >
              <span style={{ width: 8, textAlign: 'center' }}>{item.marker ?? ' '}</span>
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </span>
              {item.rightLabel && <span style={{ opacity: sel ? 1 : 0.7 }}>{item.rightLabel}</span>}
            </div>
          );
        })}
        <div style={{ flex: 1 }} />
      </div>
      {/* Classic iPod scrollbar — appears whenever the list overflows, so
          long lists are visibly longer than one screen. */}
      {hasScrollbar && (
        <div
          style={{
            width: 7,
            margin: '2px 1px 2px 0',
            border: '1px solid #1a2410',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${thumbTop}%`,
              height: `${thumbH}%`,
              background: '#1a2410',
            }}
          />
        </div>
      )}
    </div>
  );
}

// ────────── Now Playing ──────────

function NowPlayingView({
  track,
  index,
  currentTime,
  duration,
  status,
  volume,
  rating,
  npMode,
  fg,
  bg,
}: {
  track: Track;
  index: number;
  currentTime: number;
  duration: number;
  status: 'idle' | 'loading' | 'ready' | 'error';
  volume: number;
  rating: number;
  npMode: NpMode;
  fg: string;
  bg: string;
}) {
  const pct = duration > 0 ? currentTime / duration : 0;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 8, gap: 6, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0 }}>
        <div
          style={{
            width: 54,
            height: 54,
            flexShrink: 0,
            border: `1px solid ${fg}`,
            background: fg,
            overflow: 'hidden',
          }}
        >
          {track.cover ? (
            <img
              src={track.cover}
              alt=""
              width={54}
              height={54}
              style={{
                width: 54,
                height: 54,
                display: 'block',
                filter: 'grayscale(1) contrast(1.15) brightness(1.05)',
                opacity: 0.95,
              }}
            />
          ) : null}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', fontSize: 12, lineHeight: 1.15 }}>
          <Truncate text={track.title} bold />
          <Truncate text={track.artist} dim />
          <Truncate text={track.album} dim />
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 10, opacity: 0.75 }}>
            Track {index + 1} of {PLAYLIST.length}
            {status === 'loading' && ' · loading…'}
            {status === 'error' && ' · playback error'}
          </div>
        </div>
      </div>

      <NpControlStrip
        npMode={npMode}
        currentTime={currentTime}
        duration={duration}
        pct={pct}
        volume={volume}
        rating={rating}
        fg={fg}
        bg={bg}
      />
    </div>
  );
}

function NpControlStrip({
  npMode,
  currentTime,
  duration,
  pct,
  volume,
  rating,
  fg,
  bg,
}: {
  npMode: NpMode;
  currentTime: number;
  duration: number;
  pct: number;
  volume: number;
  rating: number;
  fg: string;
  bg: string;
}) {
  if (npMode === 'volume') {
    return <Bar label="Volume" fillPct={volume} fg={fg} bg={bg} rightLabel={`${volume}`} />;
  }
  if (npMode === 'scrub') {
    return (
      <Bar
        label={fmtTime(currentTime)}
        fillPct={pct * 100}
        fg={fg}
        bg={bg}
        rightLabel={`-${fmtTime(Math.max(0, duration - currentTime))}`}
        highlight
      />
    );
  }
  if (npMode === 'rating') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ fontSize: 11 }}>Rating</div>
        <div style={{ flex: 1, fontFamily: 'var(--font-monaco)', fontSize: 18, lineHeight: 1, letterSpacing: 2 }}>
          {'★'.repeat(rating) + '☆'.repeat(5 - rating)}
        </div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ height: 6, background: fg, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 1, bottom: 1, left: 1, right: 1, background: bg }} />
        <div
          style={{
            position: 'absolute',
            top: 1,
            bottom: 1,
            left: 1,
            width: `calc(${pct * 100}% - 2px)`,
            maxWidth: 'calc(100% - 2px)',
            background: fg,
            transition: 'width 200ms linear',
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          fontFamily: 'var(--font-monaco)',
          marginTop: 2,
          opacity: 0.85,
        }}
      >
        <span>{fmtTime(currentTime)}</span>
        <span>-{fmtTime(Math.max(0, duration - currentTime))}</span>
      </div>
    </div>
  );
}

function Bar({
  label,
  fillPct,
  fg,
  bg,
  rightLabel,
  highlight,
}: {
  label: string;
  fillPct: number;
  fg: string;
  bg: string;
  rightLabel?: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          fontFamily: 'var(--font-monaco)',
          marginBottom: 2,
        }}
      >
        <span>{label}</span>
        {rightLabel && <span>{rightLabel}</span>}
      </div>
      <div style={{ height: highlight ? 8 : 6, background: fg, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 1, bottom: 1, left: 1, right: 1, background: bg }} />
        <div
          style={{
            position: 'absolute',
            top: 1,
            bottom: 1,
            left: 1,
            width: `calc(${Math.max(0, Math.min(100, fillPct))}% - 2px)`,
            maxWidth: 'calc(100% - 2px)',
            background: fg,
          }}
        />
      </div>
    </div>
  );
}

// ────────── Cover Flow ──────────

/**
 * Wheel-driven Cover Flow: the selected album faces front, neighbors recede
 * with a rotateY tilt under a shared perspective. Center button opens the
 * album's track list. Covers get the same grayscale treatment as Now
 * Playing art so they read as part of the monochrome LCD.
 */
function CoverFlowView({
  selected,
  fg,
  bg,
  onJump,
  onOpen,
}: {
  selected: number;
  fg: string;
  bg: string;
  onJump?: (idx: number) => void;
  onOpen?: () => void;
}) {
  const sel = Math.min(selected, ALBUM_LIST.length - 1);
  const album = ALBUM_LIST[sel];
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative', perspective: 280, overflow: 'hidden' }}>
        {ALBUM_LIST.map((a, i) => {
          const off = i - sel;
          if (Math.abs(off) > 3) return null;
          const isCenter = off === 0;
          const x = off === 0 ? 0 : off * 34 + Math.sign(off) * 14;
          const size = isCenter ? 72 : 58;
          return (
            <div
              key={a.name}
              onClick={isCenter ? onOpen : onJump ? () => onJump(i) : undefined}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: size,
                height: size,
                marginLeft: -size / 2,
                marginTop: -size / 2 - 4,
                transform: `translateX(${x}px) rotateY(${isCenter ? 0 : off < 0 ? 55 : -55}deg)`,
                transition: 'transform 220ms ease, width 220ms ease, height 220ms ease',
                zIndex: 10 - Math.abs(off),
                border: `1px solid ${fg}`,
                background: fg,
                overflow: 'hidden',
                cursor: 'pointer',
              }}
            >
              {a.cover && (
                <img
                  src={a.cover}
                  alt=""
                  width={size}
                  height={size}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    objectFit: 'cover',
                    filter: `grayscale(1) contrast(1.15) brightness(${isCenter ? 1.05 : 0.75})`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', padding: '0 8px 5px', lineHeight: 1.2 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {album?.name}
        </div>
        <div style={{ fontSize: 10, opacity: 0.75 }}>
          {album?.artist} · {sel + 1} of {ALBUM_LIST.length}
        </div>
      </div>
      <div style={{ height: 3, background: bg }} />
    </div>
  );
}

// ────────── Lyrics ──────────

/**
 * Synced-lyrics screen (Now Playing → center button cycles to it). Synced
 * LRC lines auto-follow playback with the active line inverted; plain
 * lyrics render as a static sheet. Fetched from lrclib.net, cached per track.
 */
function LyricsView({
  track,
  currentTime,
  fg,
  bg,
}: {
  track: Track;
  currentTime: number;
  fg: string;
  bg: string;
}) {
  const [state, setState] = useState<'loading' | 'none' | 'ready'>('loading');
  const [lyrics, setLyrics] = useState<Lyrics | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setLyrics(null);
    fetchLyrics(track).then(l => {
      if (cancelled) return;
      setLyrics(l);
      setState(l ? 'ready' : 'none');
    });
    return () => {
      cancelled = true;
    };
  }, [track]);

  if (state === 'loading') {
    return <CenterNote fg={fg}>Looking up lyrics…</CenterNote>;
  }
  if (state === 'none' || !lyrics) {
    return <CenterNote fg={fg}>No lyrics found — probably an instrumental.</CenterNote>;
  }

  if (!lyrics.synced) {
    return (
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 8px', fontSize: 11, lineHeight: 1.45 }}>
        {lyrics.lines.map((l, i) => (
          <div key={i} style={{ minHeight: l.text ? undefined : 8 }}>{l.text}</div>
        ))}
      </div>
    );
  }

  const active = activeLineIndex(lyrics.lines, currentTime);
  const WINDOW = 5;
  const start = Math.max(0, Math.min(active - 2, lyrics.lines.length - WINDOW));
  const visible = lyrics.lines.slice(start, start + WINDOW);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '2px 6px',
        gap: 1,
      }}
    >
      {visible.map((l, i) => {
        const idx = start + i;
        const isActive = idx === active;
        return (
          <div
            key={idx}
            style={{
              fontSize: 11,
              lineHeight: 1.35,
              padding: '0 3px',
              background: isActive ? fg : 'transparent',
              color: isActive ? bg : fg,
              opacity: isActive ? 1 : 0.75,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {l.text || '♪'}
          </div>
        );
      })}
    </div>
  );
}

function CenterNote({ children, fg }: { children: ReactNode; fg: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 12,
        fontSize: 11,
        color: fg,
        opacity: 0.8,
      }}
    >
      {children}
    </div>
  );
}

// ────────── About / Notes ──────────

function AboutView({ variant }: { variant?: string }) {
  if (variant === 'notes') {
    return (
      <div style={{ flex: 1, overflow: 'auto', padding: 8, fontSize: 11, lineHeight: 1.45 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Notes from Akhilesh</div>
        <p>
          This iPod streams Creative-Commons audio from archive.org. Scroll the wheel to move
          through menus; on Now Playing the wheel seeks through the song. Tap the center button
          there to cycle scrub → rating → volume → lyrics. Lyrics come from lrclib.net, synced
          when available. Cover Flow lives under Music.
        </p>
        <p style={{ marginTop: 6 }}>
          Drop your own MP3s into <code>public/audio/</code> and reference them in{' '}
          <code>PLAYLIST</code> in <code>src/lib/music.ts</code>.
        </p>
      </div>
    );
  }
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 8, fontSize: 11, lineHeight: 1.4 }}>
      <Row k="Name" v="akhileshw's iPod" />
      <Row k="Songs" v={String(PLAYLIST.length)} />
      <Row k="Artists" v={String(ARTISTS.length)} />
      <Row k="Albums" v={String(ALBUMS.length)} />
      <Row k="Capacity" v="160 GB" />
      <Row k="Available" v="142.3 GB" />
      <Row k="Version" v="1.3 (akhilesh)" />
      <Row k="S/N" v="9C1A23K7QZ" />
      <Row k="Model" v="MA665LL" />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '1px 0',
        borderBottom: '1px dotted rgba(26,36,16,0.25)',
      }}
    >
      <span>{k}</span>
      <span style={{ opacity: 0.85 }}>{v}</span>
    </div>
  );
}

// ────────── Clock ──────────

function ClockView({ now, fg, bg }: { now: Date; fg: string; bg: string }) {
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-monaco)',
          fontSize: 36,
          lineHeight: 1,
          color: fg,
          background: bg,
        }}
      >
        {hh}:{mm}
      </div>
      <div style={{ fontFamily: 'var(--font-monaco)', fontSize: 12, opacity: 0.7 }}>{ss}</div>
      <div style={{ fontSize: 11, marginTop: 4 }}>{now.toDateString()}</div>
    </div>
  );
}

function Truncate({ text, bold, dim }: { text: string; bold?: boolean; dim?: boolean }) {
  return (
    <div
      title={text}
      style={{
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontWeight: bold ? 700 : 400,
        opacity: dim ? 0.78 : 1,
        fontSize: 12,
      }}
    >
      {text}
    </div>
  );
}

function fmtTime(secs: number): string {
  if (!Number.isFinite(secs) || secs < 0) return '0:00';
  const s = Math.floor(secs);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ────────── Click wheel ──────────

const ROTATE_STEP_DEG = 18;
const TAP_MAX_DEG = 9;

function ClickWheel({
  onScroll,
  onCenter,
  onMenu,
  onPlayPause,
  onPrev,
  onNext,
}: {
  onScroll: (dir: 1 | -1) => void;
  onCenter: () => void;
  onMenu: () => void;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const ringRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    active: false,
    lastAngle: 0,
    accum: 0,
    totalAbs: 0,
    startAngle: 0,
  });
  const wheelAccumRef = useRef(0);

  const tapButton = (angle: number): 'menu' | 'prev' | 'next' | 'play' => {
    if (angle >= -135 && angle < -45) return 'menu';
    if (angle >= -45 && angle < 45) return 'next';
    if (angle >= 45 && angle < 135) return 'play';
    return 'prev';
  };

  const fireTap = (which: 'menu' | 'prev' | 'next' | 'play') => {
    playClick();
    if (which === 'menu') onMenu();
    else if (which === 'prev') onPrev();
    else if (which === 'next') onNext();
    else onPlayPause();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const ring = ringRef.current;
    if (!ring) return;
    const rect = ring.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    const outerR = rect.width / 2;
    const innerR = outerR * 0.36;
    if (r < innerR || r > outerR + 4) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const a = (Math.atan2(dy, dx) * 180) / Math.PI;
    stateRef.current = {
      active: true,
      lastAngle: a,
      accum: 0,
      totalAbs: 0,
      startAngle: a,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = stateRef.current;
    if (!s.active) return;
    const ring = ringRef.current;
    if (!ring) return;
    const rect = ring.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const a = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
    let d = a - s.lastAngle;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    s.accum += d;
    s.totalAbs += Math.abs(d);
    s.lastAngle = a;
    while (s.accum >= ROTATE_STEP_DEG) {
      onScroll(1);
      s.accum -= ROTATE_STEP_DEG;
    }
    while (s.accum <= -ROTATE_STEP_DEG) {
      onScroll(-1);
      s.accum += ROTATE_STEP_DEG;
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = stateRef.current;
    if (!s.active) return;
    s.active = false;
    try {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
    } catch {}
    if (s.totalAbs < TAP_MAX_DEG) {
      fireTap(tapButton(s.startAngle));
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    wheelAccumRef.current += e.deltaY;
    const step = 28;
    while (wheelAccumRef.current >= step) {
      onScroll(1);
      wheelAccumRef.current -= step;
    }
    while (wheelAccumRef.current <= -step) {
      onScroll(-1);
      wheelAccumRef.current += step;
    }
  };

  const labelStyle: CSSProperties = {
    position: 'absolute',
    color: 'var(--plat-700)',
    fontFamily: 'var(--font-chicago)',
    fontSize: 11,
    letterSpacing: '0.05em',
    pointerEvents: 'none',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div style={{ position: 'relative', width: 196, height: 196 }}>
      <div
        ref={ringRef}
        className="chrome-outset"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'var(--plat-100)',
          touchAction: 'none',
          cursor: 'pointer',
        }}
      />
      <span style={{ ...labelStyle, top: 8, left: '50%', transform: 'translateX(-50%)' }}>MENU</span>
      <span style={{ ...labelStyle, left: 10, top: '50%', transform: 'translateY(-50%)' }}>
        <Glyph kind="prev" />
      </span>
      <span style={{ ...labelStyle, right: 10, top: '50%', transform: 'translateY(-50%)' }}>
        <Glyph kind="next" />
      </span>
      <span style={{ ...labelStyle, bottom: 8, left: '50%', transform: 'translateX(-50%)' }}>
        <Glyph kind="play" />
      </span>
      <button
        onClick={() => {
          playClick();
          onCenter();
        }}
        aria-label="Select"
        className="chrome-outset"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 68,
          height: 68,
          borderRadius: '50%',
          background: 'var(--plat-white)',
          cursor: 'default',
          padding: 0,
        }}
      />
    </div>
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
