import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface IconPosition {
  x: number;
  y: number;
}

interface DesktopStore {
  /** Persisted overrides keyed by icon id. Icons missing from this map fall back to runtime defaults. */
  positions: Record<string, IconPosition>;
  setPosition: (id: string, x: number, y: number) => void;
  resetPositions: () => void;
}

export const useDesktopStore = create<DesktopStore>()(
  persist(
    set => ({
      positions: {},
      setPosition: (id, x, y) =>
        set(state => ({ positions: { ...state.positions, [id]: { x, y } } })),
      resetPositions: () => set({ positions: {} }),
    }),
    { name: 'os.akhileshw.xyz:desktop-icons:v1' }
  )
);
