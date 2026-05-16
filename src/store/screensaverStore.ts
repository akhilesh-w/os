import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ScreensaverStore {
  idleMs: number;
  enabled: boolean;
  forceOn: boolean;
  setIdleMs: (ms: number) => void;
  setEnabled: (b: boolean) => void;
  setForceOn: (b: boolean) => void;
}

export const useScreensaverStore = create<ScreensaverStore>()(
  persist(
    set => ({
      idleMs: 90_000,
      enabled: true,
      forceOn: false,
      setIdleMs: ms => set({ idleMs: ms }),
      setEnabled: b => set({ enabled: b }),
      setForceOn: b => set({ forceOn: b }),
    }),
    { name: 'os.akhileshw.xyz:screensaver:v1' }
  )
);
