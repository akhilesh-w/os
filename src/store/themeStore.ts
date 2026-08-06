import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getTheme, type ThemeId } from '../lib/themes';
import { useWallpaperStore } from './wallpaperStore';

interface ThemeStore {
  currentId: ThemeId;
  /**
   * Set the active theme. Also snaps the desktop wallpaper to the theme's
   * default so the system feels coherent right after the switch.
   */
  setCurrent: (id: ThemeId) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    set => ({
      currentId: 'platinum',
      setCurrent: id => {
        const theme = getTheme(id);
        set({ currentId: theme.id });
        useWallpaperStore.getState().setCurrent(theme.defaultWallpaperId);
      },
    }),
    { name: 'os.akhileshw.xyz:theme:v1' }
  )
);
