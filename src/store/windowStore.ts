import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { WindowState } from '../types';
import { APPS_BY_ID } from '../apps/registry';
import { playOpen, playClose } from '../lib/sounds';

interface WindowStore {
  windows: WindowState[];
  maxZIndex: number;
  activeWindowId: string | null;
  launchTokens: Record<string, number>;
  openWindow: (appId: string, params?: Record<string, unknown>) => void;
  closeWindow: (id: string) => void;
  closeAllForApp: (appId: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updateWindowPosition: (id: string, x: number, y: number) => void;
  updateWindowSize: (id: string, width: number, height: number) => void;
  setWindowTitle: (id: string, title: string) => void;
}

let windowIdCounter = 0;
function nextWindowId(): string {
  windowIdCounter += 1;
  return `window-${Date.now().toString(36)}-${windowIdCounter}`;
}

export const useWindowStore = create<WindowStore>()(
  persist(
    (set, get) => ({
      windows: [],
      maxZIndex: 10,
      activeWindowId: null,
      launchTokens: {},

      openWindow: (appId, params) => {
        const app = APPS_BY_ID[appId];
        if (!app) return;

        if (app.externalUrl) {
          window.open(app.externalUrl, '_blank', 'noopener,noreferrer');
          return;
        }

        const { windows, maxZIndex } = get();
        // When params include a `windowKey`, allow multiple instances keyed by it
        // (e.g. one TextEdit window per post slug). Otherwise dedupe by appId.
        const windowKey = params?.windowKey;
        const existing =
          windowKey != null
            ? windows.find(w => w.appId === appId && w.params?.windowKey === windowKey)
            : windows.find(w => w.appId === appId && w.params?.windowKey == null);
        if (existing) {
          set(state => ({
            maxZIndex: state.maxZIndex + 1,
            activeWindowId: existing.id,
            windows: state.windows.map(w =>
              w.id === existing.id
                ? {
                    ...w,
                    zIndex: state.maxZIndex + 1,
                    isMinimized: false,
                    // Overwrite params on re-open so the app re-applies the intent
                    // (e.g. double-clicking Trash on the desktop while Finder is open
                    // navigates the existing Finder window to the trash location).
                    params: params ?? w.params,
                  }
                : w
            ),
          }));
          return;
        }

        const offset = (windows.length % 8) * 24;
        const newWindow: WindowState = {
          id: nextWindowId(),
          appId,
          title: app.name,
          x: 80 + offset,
          y: 50 + offset,
          width: app.defaultWidth,
          height: app.defaultHeight,
          isMinimized: false,
          isMaximized: false,
          zIndex: maxZIndex + 1,
          params,
        };
        set(state => ({
          windows: [...state.windows, newWindow],
          maxZIndex: state.maxZIndex + 1,
          activeWindowId: newWindow.id,
          launchTokens: { ...state.launchTokens, [appId]: (state.launchTokens[appId] ?? 0) + 1 },
        }));
        playOpen();
      },

      closeWindow: (id) => {
        const existed = get().windows.some(w => w.id === id);
        set(state => {
          const remaining = state.windows.filter(w => w.id !== id);
          // Promote the top remaining window to active so focus doesn't vanish.
          let nextActive = state.activeWindowId === id ? null : state.activeWindowId;
          if (state.activeWindowId === id && remaining.length > 0) {
            const top = [...remaining]
              .filter(w => !w.isMinimized)
              .sort((a, b) => b.zIndex - a.zIndex)[0];
            nextActive = top?.id ?? null;
          }
          return { windows: remaining, activeWindowId: nextActive };
        });
        if (existed) playClose();
      },

      closeAllForApp: (appId) => {
        const ids = get().windows.filter(w => w.appId === appId).map(w => w.id);
        if (ids.length === 0) return;
        set(state => {
          const remaining = state.windows.filter(w => w.appId !== appId);
          let nextActive = state.activeWindowId;
          if (state.activeWindowId && ids.includes(state.activeWindowId)) {
            const top = [...remaining]
              .filter(w => !w.isMinimized)
              .sort((a, b) => b.zIndex - a.zIndex)[0];
            nextActive = top?.id ?? null;
          }
          return { windows: remaining, activeWindowId: nextActive };
        });
        playClose();
      },

      minimizeWindow: (id) => {
        const win = get().windows.find(w => w.id === id);
        let target: { x: number; y: number } | undefined;
        if (win && typeof document !== 'undefined') {
          const dockEl = document.querySelector(`[data-app-id="${win.appId}"]`);
          const rect = dockEl?.getBoundingClientRect();
          if (rect) target = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
        set(state => {
          const wasActive = state.activeWindowId === id;
          const windows = state.windows.map(w =>
            w.id === id ? { ...w, isMinimized: true, minimizeTarget: target } : w
          );
          let nextActive = state.activeWindowId;
          if (wasActive) {
            const top = windows
              .filter(w => !w.isMinimized && w.id !== id)
              .sort((a, b) => b.zIndex - a.zIndex)[0];
            nextActive = top?.id ?? null;
          }
          return { windows, activeWindowId: nextActive };
        });
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
            w.id === id ? { ...w, zIndex: state.maxZIndex + 1, isMinimized: false } : w
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
    }),
    {
      name: 'os.akhileshw.xyz:windows:v1',
      storage: createJSONStorage(() => localStorage),
      // Persist the essentials only — drop the transient genie target
      // (recomputed on the next minimize) and launchTokens (only meaningful
      // for the dock-bounce animation, which we don't want to re-fire on reload).
      partialize: state => ({
        windows: state.windows.map(({ minimizeTarget: _t, ...rest }) => rest),
        maxZIndex: state.maxZIndex,
        activeWindowId: state.activeWindowId,
      }),
      // Drop stale entries: skip windows whose app is no longer registered;
      // clamp size+position to current viewport so a small viewport doesn't
      // hide everything.
      onRehydrateStorage: () => state => {
        if (!state) return;
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
        state.windows = state.windows
          .filter(w => APPS_BY_ID[w.appId])
          .map(w => ({
            ...w,
            x: Math.min(Math.max(w.x, -w.width + 40), vw - 40),
            y: Math.min(Math.max(w.y, 22), vh - 40),
          }));
        // If the previously active window was dropped, clear active.
        if (state.activeWindowId && !state.windows.some(w => w.id === state.activeWindowId)) {
          const top = state.windows
            .filter(w => !w.isMinimized)
            .sort((a, b) => b.zIndex - a.zIndex)[0];
          state.activeWindowId = top?.id ?? null;
        }
        // Keep the counter ahead of any restored zIndex.
        state.maxZIndex = Math.max(
          state.maxZIndex,
          ...state.windows.map(w => w.zIndex),
          10
        );
      },
    }
  )
);
