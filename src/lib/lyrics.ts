import type { Track } from './music';

/**
 * Synced lyrics via lrclib.net — a free, keyless, CORS-open lyrics database.
 * Tries an exact artist+title match first, then falls back to search.
 * Results (including misses) are cached in localStorage so each track hits
 * the network at most once per browser.
 */

export interface LyricLine {
  /** Seconds from track start; -1 for unsynced plain-text lines. */
  time: number;
  text: string;
}

export interface Lyrics {
  synced: boolean;
  lines: LyricLine[];
}

type CacheEntry = { lyrics: Lyrics | null };

const CACHE_PREFIX = 'ipod:lyrics:v1:';
const memory = new Map<string, Lyrics | null>();

function cacheKey(track: Track): string {
  return `${track.artist}—${track.title}`.toLowerCase();
}

/** Parse LRC "[mm:ss.xx] text" into time-sorted lines. */
export function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of lrc.split('\n')) {
    const m = raw.match(/^\s*\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/);
    if (!m) continue;
    const time = parseInt(m[1], 10) * 60 + parseFloat(m[2]);
    lines.push({ time, text: m[3].trim() });
  }
  return lines.sort((a, b) => a.time - b.time);
}

interface LrclibRecord {
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
  instrumental?: boolean;
}

function toLyrics(rec: LrclibRecord | null): Lyrics | null {
  if (!rec || rec.instrumental) return null;
  if (rec.syncedLyrics) {
    const lines = parseLrc(rec.syncedLyrics);
    if (lines.length) return { synced: true, lines };
  }
  if (rec.plainLyrics) {
    const lines = rec.plainLyrics
      .split('\n')
      .map(text => ({ time: -1, text: text.trim() }));
    if (lines.some(l => l.text)) return { synced: false, lines };
  }
  return null;
}

/** Strip "feat. X" so lrclib's artist matching has a chance. */
function primaryArtist(artist: string): string {
  return artist.split(/\s+feat\./i)[0].trim();
}

export async function fetchLyrics(track: Track): Promise<Lyrics | null> {
  const key = cacheKey(track);
  if (memory.has(key)) return memory.get(key) ?? null;

  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (raw != null) {
      const entry = JSON.parse(raw) as CacheEntry;
      memory.set(key, entry.lyrics);
      return entry.lyrics;
    }
  } catch {}

  let lyrics: Lyrics | null = null;
  try {
    const params = new URLSearchParams({
      artist_name: primaryArtist(track.artist),
      track_name: track.title,
    });
    const res = await fetch(`https://lrclib.net/api/get?${params}`);
    if (res.ok) {
      lyrics = toLyrics((await res.json()) as LrclibRecord);
    } else if (res.status === 404) {
      const search = await fetch(
        `https://lrclib.net/api/search?q=${encodeURIComponent(
          `${primaryArtist(track.artist)} ${track.title}`
        )}`
      );
      if (search.ok) {
        const hits = (await search.json()) as LrclibRecord[];
        const best = hits.find(h => h.syncedLyrics) ?? hits.find(h => h.plainLyrics) ?? null;
        lyrics = toLyrics(best);
      }
    }
  } catch {
    // Offline / network error: report "no lyrics" but don't cache the miss,
    // so a later attempt can retry.
    memory.set(key, null);
    return null;
  }

  memory.set(key, lyrics);
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ lyrics } satisfies CacheEntry));
  } catch {}
  return lyrics;
}

/** Index of the lyric line active at `time`, or -1 before the first line. */
export function activeLineIndex(lines: LyricLine[], time: number): number {
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= time) idx = i;
    else break;
  }
  return idx;
}
