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
    id: 'azul',
    name: 'Azul',
    style: {
      backgroundColor: '#a8b9d4',
      backgroundImage:
        'radial-gradient(circle, #7689a8 0.8px, transparent 1.4px),' +
        'radial-gradient(circle, #c9d4e6 0.8px, transparent 1.4px)',
      backgroundSize: '6px 6px, 6px 6px',
      backgroundPosition: '0 0, 3px 3px',
    },
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
    id: 'linen',
    name: 'Linen',
    style: {
      backgroundColor: '#ece4d2',
      backgroundImage:
        'repeating-linear-gradient(0deg, rgba(120,100,70,0.18) 0 1px, transparent 1px 3px),' +
        'repeating-linear-gradient(90deg, rgba(120,100,70,0.12) 0 1px, transparent 1px 3px)',
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
    id: 'graph-paper',
    name: 'Graph Paper',
    style: {
      backgroundColor: '#e8eef5',
      backgroundImage:
        'linear-gradient(rgba(60,90,140,0.18) 1px, transparent 1px),' +
        'linear-gradient(90deg, rgba(60,90,140,0.18) 1px, transparent 1px),' +
        'linear-gradient(rgba(60,90,140,0.07) 1px, transparent 1px),' +
        'linear-gradient(90deg, rgba(60,90,140,0.07) 1px, transparent 1px)',
      backgroundSize: '40px 40px, 40px 40px, 8px 8px, 8px 8px',
    },
  },
  {
    id: 'confetti',
    name: 'Confetti',
    style: {
      backgroundColor: '#dadada',
      backgroundImage:
        'radial-gradient(circle at 12% 18%, #e84a3b 1.6px, transparent 2px),' +
        'radial-gradient(circle at 78% 32%, #3a7cd9 1.6px, transparent 2px),' +
        'radial-gradient(circle at 34% 68%, #fdd03a 1.6px, transparent 2px),' +
        'radial-gradient(circle at 62% 84%, #5fb95e 1.6px, transparent 2px),' +
        'radial-gradient(circle at 48% 44%, #a93a92 1.6px, transparent 2px),' +
        'radial-gradient(circle at 90% 60%, #f08a3c 1.6px, transparent 2px)',
      backgroundSize: '48px 48px',
    },
  },
  {
    id: 'houndstooth',
    name: 'Houndstooth',
    style: {
      backgroundColor: '#e8e8e8',
      backgroundImage:
        'linear-gradient(45deg, #2a2a2a 12%, transparent 12.5%, transparent 87%, #2a2a2a 87.5%),' +
        'linear-gradient(45deg, #2a2a2a 12%, transparent 12.5%, transparent 87%, #2a2a2a 87.5%)',
      backgroundSize: '14px 14px',
      backgroundPosition: '0 0, 7px 7px',
    },
  },
  {
    id: 'argyle',
    name: 'Argyle',
    style: {
      backgroundColor: '#6a4f3b',
      backgroundImage:
        'linear-gradient(45deg, #3f2c20 25%, transparent 25%, transparent 75%, #3f2c20 75%),' +
        'linear-gradient(45deg, #3f2c20 25%, transparent 25%, transparent 75%, #3f2c20 75%),' +
        'linear-gradient(0deg, rgba(255,220,180,0.4) 1px, transparent 1px),' +
        'linear-gradient(90deg, rgba(255,220,180,0.4) 1px, transparent 1px)',
      backgroundSize: '40px 40px, 40px 40px, 40px 40px, 40px 40px',
      backgroundPosition: '0 0, 20px 20px, 20px 0, 0 20px',
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
    id: 'ocean',
    name: 'Ocean',
    style: {
      backgroundColor: '#1f4a78',
      backgroundImage:
        'repeating-linear-gradient(180deg, rgba(255,255,255,0.10) 0 1px, transparent 1px 8px),' +
        'repeating-linear-gradient(90deg, rgba(0,30,60,0.25) 0 1px, transparent 1px 14px)',
    },
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    style: {
      backgroundColor: '#0b1226',
      backgroundImage:
        'radial-gradient(circle at 15% 22%, #ffffff 0.6px, transparent 1.2px),' +
        'radial-gradient(circle at 72% 18%, #ffffff 0.6px, transparent 1.2px),' +
        'radial-gradient(circle at 38% 65%, #ffe9c2 0.7px, transparent 1.3px),' +
        'radial-gradient(circle at 86% 78%, #cfd8ff 0.6px, transparent 1.2px),' +
        'radial-gradient(circle at 50% 40%, #ffffff 0.5px, transparent 1px),' +
        'radial-gradient(ellipse at 30% 80%, rgba(120,90,180,0.25), transparent 50%)',
      backgroundSize: '90px 110px, 140px 100px, 70px 90px, 110px 120px, 40px 50px, 100% 100%',
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
  {
    id: 'bliss',
    name: 'Bliss',
    style: {
      background:
        'linear-gradient(to bottom, #4a8edf 0%, #87b6e9 45%, #6fbf6f 58%, #3aa14a 100%)',
    },
  },
  {
    id: 'win98-teal',
    name: 'Win98 Teal',
    style: { backgroundColor: '#008080' },
  },
  {
    id: 'nextstep-slate',
    name: 'NeXTSTEP Slate',
    style: {
      backgroundColor: '#535a64',
      backgroundImage:
        'repeating-linear-gradient(45deg, rgba(0,0,0,0.18) 0 1px, transparent 1px 4px),' +
        'repeating-linear-gradient(-45deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 4px)',
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
