import { create } from 'zustand';

/**
 * Per-window command registry. Apps register their menu-controllable
 * commands when they mount; the MenuBar reads from the active window's
 * entry to wire and enable per-app menu items.
 *
 * Think of it as a lightweight "the active window publishes what it can do,
 * the menu bar decides how to show it" — same way real Mac apps wire up
 * menu validation through the responder chain.
 *
 * Apps publish via a useEffect like:
 *
 *   useEffect(() => {
 *     if (!windowId) return;
 *     useWindowCommands.getState().set(windowId, { ... });
 *     return () => useWindowCommands.getState().clear(windowId);
 *   }, [windowId, viewMode, ...]);
 *
 * That keeps "what triggers a re-register" explicit at the call site.
 */

export interface AppCommands {
  /** Current Finder-style view mode (icons | list). Drives the ✓ in View menu. */
  view?: 'icons' | 'list';
  /** Switch Finder view mode. */
  setView?: (mode: 'icons' | 'list') => void;
  /** Spawn another instance of this app — e.g. "New Sticky", "New IE Window". */
  newDocument?: () => void;
  /** Label override for the "New" menu item — e.g. "New Sticky", "New Game". */
  newDocumentLabel?: string;
  /** Keyboard shortcut hint shown after the New menu label. */
  newDocumentShortcut?: string;
  /** Copy the current address bar / URL. */
  copyAddress?: () => void;
}

interface WindowCommandsStore {
  byWindow: Record<string, AppCommands>;
  set: (windowId: string, commands: AppCommands) => void;
  clear: (windowId: string) => void;
}

export const useWindowCommands = create<WindowCommandsStore>(set => ({
  byWindow: {},
  set: (windowId, commands) =>
    set(state => ({
      byWindow: { ...state.byWindow, [windowId]: commands },
    })),
  clear: windowId =>
    set(state => {
      if (!(windowId in state.byWindow)) return state;
      const next = { ...state.byWindow };
      delete next[windowId];
      return { byWindow: next };
    }),
}));
