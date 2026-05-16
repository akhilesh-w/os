import type { CSSProperties } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Wallpaper {
  id: string;
  name: string;
  style: CSSProperties;
}

export const WALLPAPERS: Wallpaper[] = [
  {
    id: 'stippled-gray',
    name: 'Stippled Gray',
    style: {
      backgroundColor: '#aaaaaa',
      backgroundImage:
        'linear-gradient(45deg, #888 25%, transparent 25%),' +
        'linear-gradient(-45deg, #888 25%, transparent 25%),' +
        'linear-gradient(45deg, transparent 75%, #888 75%),' +
        'linear-gradient(-45deg, transparent 75%, #888 75%)',
      backgroundSize: '4px 4px',
      backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0',
    },
  },
  {
    id: 'platinum',
    name: 'Platinum',
    style: { backgroundColor: '#cfcfcf' },
  },
  {
    id: 'bondi',
    name: 'Bondi',
    style: {
      backgroundColor: '#3d7e7c',
      backgroundImage:
        'repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 4px),' +
        'repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 4px)',
    },
  },
  {
    id: 'stationery',
    name: 'Stationery',
    style: {
      backgroundColor: '#f3ecd9',
      backgroundImage: 'radial-gradient(circle, #cdc29a 1px, transparent 1.5px)',
      backgroundSize: '8px 8px',
    },
  },
  {
    id: 'spring-grass',
    name: 'Spring Grass',
    style: {
      backgroundColor: '#7ea36a',
      backgroundImage:
        'linear-gradient(45deg, #5e8c4d 25%, transparent 25%),' +
        'linear-gradient(-45deg, #5e8c4d 25%, transparent 25%),' +
        'linear-gradient(45deg, transparent 75%, #5e8c4d 75%),' +
        'linear-gradient(-45deg, transparent 75%, #5e8c4d 75%)',
      backgroundSize: '4px 4px',
      backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0',
    },
  },
  {
    id: 'pinstripe',
    name: 'Pinstripe',
    style: {
      backgroundColor: '#e8e8e8',
      backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 2px, #b8b8b8 2px 3px)',
    },
  },
  {
    id: 'random-patterns',
    name: 'Random Patterns',
    style: {
      backgroundColor: '#bdbdbd',
      backgroundImage:
        'repeating-linear-gradient(45deg, #888 0 1px, transparent 1px 4px),' +
        'repeating-linear-gradient(-45deg, #999 0 1px, transparent 1px 5px)',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    style: {
      backgroundColor: '#101626',
      backgroundImage:
        'radial-gradient(circle at 25% 30%, #fff 0.5px, transparent 1px),' +
        'radial-gradient(circle at 75% 70%, #fff 0.5px, transparent 1px),' +
        'radial-gradient(circle at 50% 50%, #aab 0.5px, transparent 1px)',
      backgroundSize: '60px 80px, 90px 120px, 30px 40px',
    },
  },
];

const WALLPAPERS_BY_ID = Object.fromEntries(WALLPAPERS.map(w => [w.id, w]));

export function getWallpaper(id: string): Wallpaper {
  return WALLPAPERS_BY_ID[id] ?? WALLPAPERS[0];
}

interface WallpaperStore {
  currentId: string;
  setCurrent: (id: string) => void;
}

export const useWallpaperStore = create<WallpaperStore>()(
  persist(
    set => ({
      currentId: 'stippled-gray',
      setCurrent: id => set({ currentId: id }),
    }),
    { name: 'os.akhileshw.xyz:wallpaper:v1' }
  )
);
