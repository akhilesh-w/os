import { create } from 'zustand';

interface SpotlightStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Visibility of the Spotlight launcher. Triggered globally by ⌘K / ⌘Space
 * (see App.tsx) and rendered as a top-layer overlay above everything else.
 */
export const useSpotlightStore = create<SpotlightStore>(set => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set(s => ({ isOpen: !s.isOpen })),
}));
