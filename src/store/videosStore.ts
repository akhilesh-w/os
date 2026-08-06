import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Video {
  /** YouTube video id (the 11-char code). */
  id: string;
  title: string;
  artist?: string;
}

/**
 * Starter library — Apple history on YouTube, same spirit as ryOS's Videos
 * app. Playback happens inside YouTube's own player, so YouTube carries the
 * content licensing; we never host or proxy the media.
 */
export const DEFAULT_VIDEOS: Video[] = [
  { id: '3vq9p00T08I', title: 'Macintosh (1984)', artist: 'Apple Computer' },
  { id: '2B-XwPjn9YY', title: 'Macintosh Introduction (1984)', artist: 'Steve Jobs' },
  { id: 'VFP-VZtgb0s', title: 'iMac G3 vs PC Simplicity (1998)', artist: 'Apple Computer' },
  { id: 'dtaSDVpAo4c', title: 'Apple Back on Track (1998)', artist: 'Steve Jobs' },
  { id: 'Ko4V3G4NqII', title: 'Mac OS X Introduction (2000)', artist: 'Steve Jobs' },
  { id: 'mE_bDNaYAr8', title: 'iPod Ad (2001)', artist: 'Apple Computer' },
  { id: 'Mc_FiHTITHE', title: 'iPod Introduction (2001)', artist: 'Steve Jobs' },
  { id: 'b5P3QDm61go', title: 'iMac G4 "Lamp" Ad (2002)', artist: 'Apple Computer' },
  { id: 'VQKMoT-6XSg', title: 'iPhone Introduction (2007)', artist: 'Steve Jobs' },
  { id: 'EKBVLzOZyLw', title: 'On Focus', artist: 'Jony Ive' },
];

/** Extract a YouTube video id from any of the usual URL shapes (or a raw id). */
export function parseYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0];
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (url.hostname.endsWith('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      const m = url.pathname.match(/^\/(embed|shorts|live)\/([A-Za-z0-9_-]{11})/);
      if (m) return m[2];
    }
  } catch {}
  return null;
}

interface VideosStore {
  videos: Video[];
  currentIndex: number;
  shuffle: boolean;
  repeat: boolean;
  addVideo: (video: Video) => void;
  removeVideo: (id: string) => void;
  setCurrentIndex: (i: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  resetLibrary: () => void;
}

export const useVideosStore = create<VideosStore>()(
  persist(
    (set, get) => ({
      videos: DEFAULT_VIDEOS,
      currentIndex: 0,
      shuffle: false,
      repeat: true,
      addVideo: video =>
        set(s => {
          const existing = s.videos.findIndex(v => v.id === video.id);
          if (existing >= 0) return { currentIndex: existing };
          return { videos: [...s.videos, video], currentIndex: s.videos.length };
        }),
      removeVideo: id =>
        set(s => {
          const idx = s.videos.findIndex(v => v.id === id);
          if (idx < 0) return s;
          const videos = s.videos.filter(v => v.id !== id);
          let currentIndex = s.currentIndex;
          if (idx < currentIndex) currentIndex -= 1;
          currentIndex = Math.max(0, Math.min(currentIndex, videos.length - 1));
          return { videos, currentIndex };
        }),
      setCurrentIndex: i =>
        set(s => ({ currentIndex: Math.max(0, Math.min(i, s.videos.length - 1)) })),
      toggleShuffle: () => set(s => ({ shuffle: !s.shuffle })),
      toggleRepeat: () => set(s => ({ repeat: !s.repeat })),
      resetLibrary: () => set({ videos: DEFAULT_VIDEOS, currentIndex: 0 }),
    }),
    { name: 'os.akhileshw.xyz:videos:v1' }
  )
);

/** Pick the next index honoring shuffle/repeat; -1 means stop. */
export function nextIndex(
  current: number,
  count: number,
  shuffle: boolean,
  repeat: boolean
): number {
  if (count <= 0) return -1;
  if (shuffle && count > 1) {
    let n = current;
    while (n === current) n = Math.floor(Math.random() * count);
    return n;
  }
  if (current + 1 < count) return current + 1;
  return repeat ? 0 : -1;
}
