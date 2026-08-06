import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useVideosStore,
  parseYouTubeId,
  nextIndex,
  type Video,
} from '../store/videosStore';
import { playClick, playTape } from '../lib/sounds';
import { useWindowId } from '../components/Window';
import { useWindowCommands } from '../lib/windowCommands';

/**
 * Videos — a QuickTime-meets-VCR player in platinum chrome, in the spirit of
 * ryOS's Videos app. Playback is YouTube's own embedded player (YouTube
 * hosts and licenses the content; we just point at video ids), driven
 * through the official IFrame API so track-end advances the playlist.
 */

// ── Minimal YouTube IFrame API surface ──
interface YTPlayer {
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
      };
    }
  ) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number };
}

let ytApiPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise(resolve => {
    const w = window as unknown as {
      YT?: YTNamespace;
      onYouTubeIframeAPIReady?: () => void;
    };
    if (w.YT?.Player) {
      resolve(w.YT);
      return;
    }
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(w.YT as YTNamespace);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  });
  return ytApiPromise;
}

async function fetchVideoTitle(id: string): Promise<string> {
  try {
    const res = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`
    );
    if (res.ok) {
      const data = (await res.json()) as { title?: string };
      if (data.title) return data.title;
    }
  } catch {}
  return 'YouTube Video';
}

function fmtTime(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function Videos() {
  const videos = useVideosStore(s => s.videos);
  const currentIndex = useVideosStore(s => s.currentIndex);
  const shuffle = useVideosStore(s => s.shuffle);
  const repeat = useVideosStore(s => s.repeat);
  const setCurrentIndex = useVideosStore(s => s.setCurrentIndex);
  const addVideo = useVideosStore(s => s.addVideo);
  const removeVideo = useVideosStore(s => s.removeVideo);
  const toggleShuffle = useVideosStore(s => s.toggleShuffle);
  const toggleRepeat = useVideosStore(s => s.toggleRepeat);
  const resetLibrary = useVideosStore(s => s.resetLibrary);

  const video = videos[currentIndex];

  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showList, setShowList] = useState(false);
  const [adding, setAdding] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [osd, setOsd] = useState<string | null>(null);
  const osdTimerRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  // Keep advance logic out of stale closures.
  const stateRef = useRef({ currentIndex, shuffle, repeat, count: videos.length });
  stateRef.current = { currentIndex, shuffle, repeat, count: videos.length };

  const advance = useCallback(() => {
    const { currentIndex: cur, shuffle: sh, repeat: rp, count } = stateRef.current;
    const n = nextIndex(cur, count, sh, rp);
    if (n >= 0) setCurrentIndex(n);
    else setIsPlaying(false);
  }, [setCurrentIndex]);

  // Create the player once; it's destroyed when the window closes.
  useEffect(() => {
    let cancelled = false;
    const firstId = videos[stateRef.current.currentIndex]?.id;
    if (!hostRef.current || !firstId) return;
    loadYouTubeApi().then(YT => {
      if (cancelled || !hostRef.current) return;
      playerRef.current = new YT.Player(hostRef.current, {
        videoId: firstId,
        width: '100%',
        height: '100%',
        // controls:0 + the click-capture overlay hide YouTube's chrome so
        // playback reads as native; the TV-static layer masks load/pause.
        playerVars: { controls: 0, disablekb: 1, iv_load_policy: 3, fs: 0, rel: 0, playsinline: 1 },
        events: {
          onReady: () => setReady(true),
          onStateChange: e => {
            if (e.data === YT.PlayerState.ENDED) advance();
            setIsPlaying(e.data === YT.PlayerState.PLAYING);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track changes swap the loaded video.
  const lastLoadedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || !video) return;
    if (lastLoadedRef.current === null) {
      // First ready pass — the player was constructed with this id.
      lastLoadedRef.current = video.id;
      return;
    }
    if (lastLoadedRef.current !== video.id) {
      lastLoadedRef.current = video.id;
      setElapsed(0);
      playerRef.current?.loadVideoById(video.id);
    }
  }, [ready, video]);

  // LCD clock + duration (duration settles once metadata loads).
  useEffect(() => {
    const t = window.setInterval(() => {
      const p = playerRef.current;
      if (p && ready) {
        try {
          setElapsed(p.getCurrentTime() || 0);
          setDuration(p.getDuration() || 0);
        } catch {}
      }
    }, 500);
    return () => clearInterval(t);
  }, [ready]);

  // VCR-style OSD in the top-left: PLAY flashes briefly, PAUSE sticks.
  useEffect(() => {
    if (!ready) return;
    if (osdTimerRef.current != null) clearTimeout(osdTimerRef.current);
    if (isPlaying) {
      startedRef.current = true;
      setOsd('▶ PLAY');
      osdTimerRef.current = window.setTimeout(() => setOsd(null), 1600);
    } else if (startedRef.current) {
      setOsd('❙❙ PAUSE');
    }
  }, [isPlaying, ready]);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    playTape(isPlaying ? 'stop' : 'play');
    if (isPlaying) p.pauseVideo();
    else p.playVideo();
  }, [isPlaying]);

  const handleSeek = useCallback((seconds: number) => {
    const p = playerRef.current;
    if (!p) return;
    p.seekTo(seconds, true);
    setElapsed(seconds);
  }, []);

  const prev = useCallback(() => {
    playClick();
    setCurrentIndex(currentIndex > 0 ? currentIndex - 1 : videos.length - 1);
  }, [currentIndex, videos.length, setCurrentIndex]);

  const next = useCallback(() => {
    playClick();
    advance();
  }, [advance]);

  const handleAdd = useCallback(async () => {
    playClick();
    const input = window.prompt('Paste a YouTube link (or video id):');
    if (!input) return;
    const id = parseYouTubeId(input);
    if (!id) {
      window.alert("That doesn't look like a YouTube link.");
      return;
    }
    setAdding(true);
    const title = await fetchVideoTitle(id);
    addVideo({ id, title });
    setAdding(false);
    setShowList(true);
  }, [addVideo]);

  const selectVideo = useCallback(
    (i: number) => {
      playClick();
      setCurrentIndex(i);
      setShowList(false);
    },
    [setCurrentIndex]
  );

  // Contribute Controls + Library menus to the menu bar while active.
  const windowId = useWindowId();
  useEffect(() => {
    if (!windowId) return;
    useWindowCommands.getState().set(windowId, {
      menus: [
        {
          label: 'Controls',
          items: [
            { type: 'item', label: isPlaying ? 'Pause' : 'Play', onSelect: togglePlay },
            { type: 'item', label: 'Previous', onSelect: prev },
            { type: 'item', label: 'Next', onSelect: next },
            { type: 'separator' },
            { type: 'item', label: 'Shuffle', checked: shuffle, onSelect: () => { playClick(); toggleShuffle(); } },
            { type: 'item', label: 'Repeat', checked: repeat, onSelect: () => { playClick(); toggleRepeat(); } },
          ],
        },
        {
          label: 'Library',
          items: [
            { type: 'item', label: 'Add to Library…', onSelect: handleAdd },
            { type: 'separator' },
            ...videos.map((v, i) => ({
              type: 'item' as const,
              label: v.title,
              checked: i === currentIndex,
              onSelect: () => selectVideo(i),
            })),
            { type: 'separator' },
            { type: 'item', label: 'Reset Library', onSelect: () => { playClick(); resetLibrary(); } },
          ],
        },
      ],
    });
    return () => useWindowCommands.getState().clear(windowId);
  }, [windowId, videos, currentIndex, shuffle, repeat, isPlaying, togglePlay, prev, next, handleAdd, selectVideo, toggleShuffle, toggleRepeat, resetLibrary]);

  const btnStyle: React.CSSProperties = {
    fontFamily: 'var(--font-chicago)',
    fontSize: 11,
    padding: '2px 8px',
    background: 'var(--plat-200)',
    cursor: 'pointer',
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
  };

  return (
    <div
      className="h-full w-full flex flex-col"
      style={{ background: 'var(--plat-100)', fontFamily: 'var(--font-chicago)' }}
    >
      {/* Screen */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', background: '#000', border: '2px solid var(--plat-900)', margin: 6, marginBottom: 0 }}
      >
        {/* The player is 300px taller than the pane and shifted up 150px, so
            YouTube's title bar (top) and watermark (bottom-right) render
            outside the overflow-hidden crop — the ryOS trick. */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: -150, bottom: -150 }}>
          <div ref={hostRef} style={{ width: '100%', height: '100%' }} />
        </div>
        {/* TV static masks idle/paused/loading so YouTube's chrome never shows */}
        <TvStatic visible={!isPlaying} />
        {/* Click-capture layer: clicks toggle play through our API instead
            of engaging YouTube's own overlay UI */}
        <div
          onClick={videos.length ? togglePlay : undefined}
          style={{ position: 'absolute', inset: 0, zIndex: 2, cursor: videos.length ? 'pointer' : 'default' }}
        />
        {/* VCR on-screen display */}
        {osd && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 10,
              zIndex: 4,
              fontFamily: 'var(--font-monaco)',
              fontSize: 20,
              color: '#9fdc9f',
              textShadow: '1px 1px 0 #000, 0 0 6px rgba(0,0,0,0.8)',
              letterSpacing: '0.1em',
              pointerEvents: 'none',
            }}
          >
            {osd}
          </div>
        )}
        <SeekBar
          duration={duration}
          elapsed={elapsed}
          visible={hovered && duration > 0 && videos.length > 0}
          onSeek={handleSeek}
        />
        {videos.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7dc07d', fontFamily: 'var(--font-monaco)', fontSize: 16, textShadow: '0 0 4px #000', pointerEvents: 'none' }}>
            NO TAPE — press ADD
          </div>
        )}
        {showList && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 3,
              overflow: 'auto',
              background: 'var(--plat-white)',
              borderTop: '1px solid var(--plat-900)',
            }}
          >
            {videos.map((v: Video, i: number) => {
              const active = i === currentIndex;
              return (
                <div
                  key={v.id}
                  className="finder-row"
                  onClick={() => selectVideo(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 8px',
                    fontSize: 12,
                    cursor: 'pointer',
                    background: active ? 'var(--plat-select)' : undefined,
                    color: active ? 'var(--plat-select-fg)' : 'var(--plat-900)',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-monaco)', width: 22, textAlign: 'right', opacity: 0.7 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.title}
                    {v.artist ? <span style={{ opacity: 0.6 }}> — {v.artist}</span> : null}
                  </span>
                  <button
                    aria-label={`Remove ${v.title}`}
                    onClick={e => {
                      e.stopPropagation();
                      playClick();
                      removeVideo(v.id);
                    }}
                    style={{
                      fontFamily: 'var(--font-chicago)',
                      fontSize: 11,
                      padding: '0 4px',
                      cursor: 'pointer',
                      color: 'inherit',
                      opacity: 0.7,
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* LCD readout strip */}
      <div
        className="chrome-inset"
        style={{
          margin: 6,
          marginBottom: 0,
          background: '#0a0f0a',
          color: '#9fdc9f',
          fontFamily: 'var(--font-monaco)',
          display: 'flex',
          alignItems: 'baseline',
          gap: 14,
          padding: '3px 10px',
        }}
      >
        <Lcd label="Track" value={videos.length ? String(currentIndex + 1).padStart(2, '0') : '--'} />
        <Lcd label="Time" value={fmtTime(elapsed)} />
        <Lcd label="Title" value={video ? video.title : '—'} grow />
      </div>

      {/* Controls — right padding clears the window's resize grip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 6, paddingRight: 20 }}>
        <button className="chrome-outset" style={btnStyle} onClick={prev} aria-label="Previous">⏮</button>
        <button className="chrome-outset" style={btnStyle} onClick={togglePlay} aria-label="Play/Pause">
          {isPlaying ? '❙❙' : '▶'}
        </button>
        <button className="chrome-outset" style={btnStyle} onClick={next} aria-label="Next">⏭</button>
        <div style={{ flex: 1 }} />
        <button
          className={shuffle ? 'chrome-inset' : 'chrome-outset'}
          style={{ ...btnStyle, background: shuffle ? 'var(--plat-300)' : 'var(--plat-200)' }}
          onClick={() => { playClick(); toggleShuffle(); }}
        >
          SHUFFLE
        </button>
        <button
          className={repeat ? 'chrome-inset' : 'chrome-outset'}
          style={{ ...btnStyle, background: repeat ? 'var(--plat-300)' : 'var(--plat-200)' }}
          onClick={() => { playClick(); toggleRepeat(); }}
        >
          REPEAT
        </button>
        <button
          className={showList ? 'chrome-inset' : 'chrome-outset'}
          style={{ ...btnStyle, background: showList ? 'var(--plat-300)' : 'var(--plat-200)' }}
          onClick={() => { playClick(); setShowList(v => !v); }}
        >
          LIST
        </button>
        <button className="chrome-outset" style={btnStyle} onClick={handleAdd} disabled={adding}>
          {adding ? 'ADDING…' : 'ADD'}
        </button>
      </div>
    </div>
  );
}

/** Hover-reveal seek bar along the bottom of the screen; click or drag to seek. */
function SeekBar({
  duration,
  elapsed,
  visible,
  onSeek,
}: {
  duration: number;
  elapsed: number;
  visible: boolean;
  onSeek: (seconds: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const seekFromEvent = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || !duration) return;
      const r = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      onSeek(pct * duration);
    },
    [duration, onSeek]
  );

  const pct = duration > 0 ? Math.min(1, elapsed / duration) : 0;
  return (
    <div
      onPointerDown={e => {
        e.stopPropagation();
        draggingRef.current = true;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        seekFromEvent(e.clientX);
      }}
      onPointerMove={e => {
        if (draggingRef.current) seekFromEvent(e.clientX);
      }}
      onPointerUp={() => { draggingRef.current = false; }}
      onPointerCancel={() => { draggingRef.current = false; }}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 3,
        padding: '10px 12px 8px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 150ms linear',
        cursor: 'pointer',
        touchAction: 'none',
      }}
    >
      <div
        ref={trackRef}
        style={{ height: 6, border: '1px solid #9fdc9f', background: 'rgba(0,0,0,0.6)', position: 'relative' }}
      >
        <div
          style={{
            position: 'absolute',
            top: 1,
            bottom: 1,
            left: 1,
            width: `calc(${pct * 100}% - 2px)`,
            maxWidth: 'calc(100% - 2px)',
            background: '#9fdc9f',
          }}
        />
      </div>
    </div>
  );
}

/** Analog TV noise on a tiny canvas, pixel-scaled up — shown when paused. */
function TvStatic({ visible }: { visible: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const img = ctx.createImageData(canvas.width, canvas.height);
    const draw = () => {
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 256) | 0;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    };
    draw();
    const t = window.setInterval(draw, 90);
    return () => clearInterval(t);
  }, [visible]);
  if (!visible) return null;
  return (
    <canvas
      ref={canvasRef}
      width={160}
      height={120}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        width: '100%',
        height: '100%',
        imageRendering: 'pixelated',
        pointerEvents: 'none',
      }}
    />
  );
}

function Lcd({ label, value, grow }: { label: string; value: string; grow?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', minWidth: 0, flex: grow ? 1 : undefined }}>
      <span style={{ fontSize: 10, opacity: 0.55, letterSpacing: '0.08em' }}>{label}</span>
      <span
        style={{
          fontSize: 16,
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </span>
    </span>
  );
}
