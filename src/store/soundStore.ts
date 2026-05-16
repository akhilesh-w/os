import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SoundStore {
  enabled: boolean;
  volume: number;
  toggle: () => void;
  setEnabled: (v: boolean) => void;
  setVolume: (v: number) => void;
}

export const useSoundStore = create<SoundStore>()(
  persist(
    set => ({
      enabled: true,
      volume: 70,
      toggle: () => set(s => ({ enabled: !s.enabled })),
      setEnabled: v => set({ enabled: v }),
      setVolume: v => set({ volume: Math.max(0, Math.min(100, v)) }),
    }),
    { name: 'os.akhileshw.xyz:sound:v2' }
  )
);
