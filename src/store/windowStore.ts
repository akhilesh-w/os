import { create } from 'zustand';
import type { WindowState } from '../types';
import { APPS_BY_ID } from '../apps/registry';
import { playOpen, playClose } from '../lib/sounds';

interface WindowStore {
  windows: WindowState[];
  maxZIndex: number;
  activeWindowId: string | null;
  openWindow: (appId: string) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updateWindowPosition: (id: string, x: number, y: number) => void;
  updateWindowSize: (id: string, width: number, height: number) => void;
  setWindowTitle: (id: string, title: string) => void;
}

let windowIdCounter = 0;

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  maxZIndex: 10,
  activeWindowId: null,

  openWindow: (appId) => {
    const app = APPS_BY_ID[appId];
    if (!app) return;

    if (app.externalUrl) {
      window.open(app.externalUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const { windows, maxZIndex } = get();
    const existing = windows.find(w => w.appId === appId);
    if (existing) {
      set(state => ({
        maxZIndex: state.maxZIndex + 1,
        activeWindowId: existing.id,
        windows: state.windows.map(w =>
          w.id === existing.id
            ? { ...w, zIndex: state.maxZIndex + 1, isMinimized: false }
            : w
        ),
      }));
      return;
    }

    const offset = (windows.length % 8) * 24;
    const newWindow: WindowState = {
      id: `window-${++windowIdCounter}`,
      appId,
      title: app.name,
      x: 80 + offset,
      y: 50 + offset,
      width: app.defaultWidth,
      height: app.defaultHeight,
      isMinimized: false,
      isMaximized: false,
      zIndex: maxZIndex + 1,
    };
    set(state => ({
      windows: [...state.windows, newWindow],
      maxZIndex: state.maxZIndex + 1,
      activeWindowId: newWindow.id,
    }));
    playOpen();
  },

  closeWindow: (id) => {
    const existed = get().windows.some(w => w.id === id);
    set(state => ({
      windows: state.windows.filter(w => w.id !== id),
      activeWindowId: state.activeWindowId === id ? null : state.activeWindowId,
    }));
    if (existed) playClose();
  },

  minimizeWindow: (id) => {
    set(state => ({
      windows: state.windows.map(w =>
        w.id === id ? { ...w, isMinimized: true } : w
      ),
      activeWindowId: state.activeWindowId === id ? null : state.activeWindowId,
    }));
  },

  maximizeWindow: (id) => {
    set(state => ({
      windows: state.windows.map(w =>
        w.id === id ? { ...w, isMaximized: !w.isMaximized } : w
      ),
    }));
  },

  focusWindow: (id) => {
    set(state => ({
      maxZIndex: state.maxZIndex + 1,
      activeWindowId: id,
      windows: state.windows.map(w =>
        w.id === id ? { ...w, zIndex: state.maxZIndex + 1 } : w
      ),
    }));
  },

  updateWindowPosition: (id, x, y) => {
    set(state => ({
      windows: state.windows.map(w =>
        w.id === id ? { ...w, x, y } : w
      ),
    }));
  },

  updateWindowSize: (id, width, height) => {
    set(state => ({
      windows: state.windows.map(w =>
        w.id === id ? { ...w, width, height } : w
      ),
    }));
  },

  setWindowTitle: (id, title) => {
    set(state => ({
      windows: state.windows.map(w =>
        w.id === id ? { ...w, title } : w
      ),
    }));
  },
}));
