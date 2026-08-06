/**
 * Theme registry. Each theme is applied via a `data-theme` attribute on
 * <html>; corresponding CSS variable overrides and selectors live in
 * src/index.css. Sounds and fonts are theme-aware too: see lib/sounds.ts.
 *
 * Platinum is the project's home identity (matches CLAUDE.md). The other
 * themes are escape hatches the user can opt into from Control Panels;
 * each ships with its own default wallpaper.
 */

export type ThemeId = 'platinum' | 'aqua' | 'winxp' | 'win98' | 'nextstep';

export interface Theme {
  id: ThemeId;
  name: string;
  /** Tagline shown in the Control Panels picker. */
  description: string;
  /** Era for the About panel ("Macintosh System Platinum", etc.). */
  systemLabel: string;
  /** Snapped automatically when this theme is selected. */
  defaultWallpaperId: string;
  /** Used by sounds.ts to pick a synthesis recipe per theme. */
  soundProfile: 'platinum' | 'aqua' | 'winxp' | 'win98' | 'nextstep';
}

export const THEMES: Theme[] = [
  {
    id: 'platinum',
    name: 'Platinum',
    description: 'Mac OS 8 / 9 — chunky pixel chrome, navy selection, pinstripe title bars.',
    systemLabel: 'Macintosh System Platinum',
    defaultWallpaperId: 'stippled-gray',
    soundProfile: 'platinum',
  },
  {
    id: 'aqua',
    name: 'Aqua',
    description: 'Mac OS X 10.0–10.4 — soft gradients, traffic lights, Lucida Grande.',
    systemLabel: 'Mac OS X · Aqua',
    defaultWallpaperId: 'azul',
    soundProfile: 'aqua',
  },
  {
    id: 'winxp',
    name: 'Windows XP',
    description: 'Luna Blue — bright blue title bars, rounded chrome, Tahoma type.',
    systemLabel: 'Microsoft Windows XP · Luna',
    defaultWallpaperId: 'bliss',
    soundProfile: 'winxp',
  },
  {
    id: 'win98',
    name: 'Windows 98',
    description: 'Classic Win9x gray — chunky 3D bevels, navy title bar, MS Sans.',
    systemLabel: 'Microsoft Windows 98',
    defaultWallpaperId: 'win98-teal',
    soundProfile: 'win98',
  },
  {
    id: 'nextstep',
    name: 'NeXTSTEP',
    description: 'Steve Jobs\'s NeXT (1989) — dark slate with diagonal hatch, Helvetica.',
    systemLabel: 'NeXTSTEP · NeXT Computer',
    defaultWallpaperId: 'nextstep-slate',
    soundProfile: 'nextstep',
  },
];

export const THEMES_BY_ID = Object.fromEntries(THEMES.map(t => [t.id, t])) as Record<ThemeId, Theme>;

export function getTheme(id: string): Theme {
  return THEMES_BY_ID[id as ThemeId] ?? THEMES[0];
}
