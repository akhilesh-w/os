# os.akhileshw.xyz

Personal portfolio rendered as a **Classic Mac OS / System 7 / Platinum** desktop in the browser. Inspired by [ryOS](https://os.ryo.lu/). See `TASKS.md` for the prioritized feature backlog — this file describes the codebase as it stands.

## Aesthetic — important

This is **not modern macOS Sonoma**. The look is the late-90s Apple Platinum theme:

- Light gray dithered/stippled desktop pattern (Bayer 50% gray)
- Square windows with **3D platinum chrome** — 1px black outer border, white-top/dark-bottom inset bevel, pinstripe title bar
- **Chicago-style pixel font** for menus and titles (using Google Fonts Pixelify Sans as a substitute; can be swapped to real ChicagoFLF later)
- **VT323** for terminal (Monaco substitute)
- **Pixel-art SVG icons** — no emoji anywhere
- Hard offset drop shadow (no soft blur)
- Selection color is `#000080` (System 7 navy blue)
- Title bar shows pinstripes when active, flat gray when inactive
- Close box on the **left**, collapse + zoom on the **right** (Mac OS 8 platinum layout)

Anything you add must match this era. If you find yourself reaching for `backdrop-filter: blur(...)`, `rounded-2xl`, soft pastel gradients, or emoji icons — stop. Those are wrong-era. The visual references are System 7, Mac OS 8, and Mac OS 9.

## Stack

- **Vite 5** + **React 19** + **TypeScript** (strict)
- **Tailwind CSS** for layout; CSS variables + inline `style={}` for platinum chrome details
- **Zustand** for window state
- **Framer Motion** for window open/close animations (fast, 120ms — Platinum was effectively instant)
- **Google Fonts**: Pixelify Sans (UI), VT323 (mono), loaded via `<link>` in `index.html`

Scripts: `npm run dev`, `npm run build`, `npm run preview`.

If `npm run dev` fails with `_lazy_load_nvm: command not found`, the user's shell config is recursive; use the direct nvm path: `/Users/<you>/.nvm/versions/node/<version>/bin/npm`.

## Design tokens — use these, do not invent

Defined as CSS variables in `src/index.css`:

| Variable | Value | Use |
|---|---|---|
| `--plat-white` | `#ffffff` | Window content backgrounds |
| `--plat-50` | `#f5f5f5` | Alt rows |
| `--plat-100` | `#e8e8e8` | Title bar inset, toolbars |
| `--plat-200` | `#dddddd` | Buttons, dock surface |
| `--plat-300` | `#cccccc` | Pressed states |
| `--plat-400`–`700` | grays | Borders, dim text |
| `--plat-900` | `#000000` | Borders, primary text |
| `--plat-shadow` | `rgba(0,0,0,0.55)` | Drop shadows |
| `--plat-select` | `#000080` | Selected row background |
| `--plat-select-fg` | `#ffffff` | Selected row text |
| `--font-chicago` | Pixelify Sans, fallbacks | UI font |
| `--font-geneva` | Pixelify Sans, fallbacks | Body in apps |
| `--font-monaco` | VT323, fallbacks | Terminal/code |

Helper CSS classes in `src/index.css`:

| Class | Effect |
|---|---|
| `.desktop-pattern` | Dithered 50% gray Bayer pattern |
| `.chrome-outset` | Raised platinum bevel (buttons, dock) |
| `.chrome-inset` | Pressed/sunken platinum bevel |
| `.title-pinstripe` | Active window title bar with 6 horizontal lines |
| `.title-inactive` | Flat-gray inactive title bar |
| `.pixel-box` / `.pixel-box.is-zoom` / `.pixel-box.is-collapse` | The three small window control buttons; glyphs reveal on window hover |
| `.window-shadow` | Hard offset pixel shadow |
| `.dock-bar` / `.dock-icon-btn` / `.dock-tooltip` | Dock surface + icon hit area + label tooltip |
| `.menu-item` | Menu bar item with black-on-hover highlight |
| `.finder-row` | Selectable list row (used in Finder, About, Music) |

## Architecture

```
App.tsx
├── MenuBar         — top bar: rainbow Apple, app menu, time
├── Desktop         — dithered wallpaper, desktop icons (top-right), Window renderer
│   └── Window      — platinum chrome (title bar + close/zoom/collapse), drag, AnimatePresence
│       └── <App>   — Finder / Terminal / About / Music
└── Dock            — bottom dock; DockIcon per registered app
```

### App registry (`src/apps/registry.ts`)

Single source of truth for every app: `id`, `name`, `icon` (refers to a PixelIcon name, not an emoji), `defaultWidth`, `defaultHeight`, `component`, optional `externalUrl`.

To add a new app:

1. Build the component in `src/apps/<Name>.tsx`.
2. Add an entry to `APPS` in `registry.ts`.
3. If you need a new icon, add a glyph to `ICONS` in `src/components/PixelIcon.tsx` — drawn as `<rect>` elements on a 16×16 grid for pixel-perfect crispness.

That's it. Dock, switcher, MenuBar pick it up automatically.

### PixelIcon (`src/components/PixelIcon.tsx`)

Inline-SVG icon set drawn on a 16×16 grid. Uses `shape-rendering="crispEdges"` and `image-rendering: pixelated` so they stay sharp at any size. Current icons: `finder`, `terminal`, `about`, `music`, `github`, `folder`, `document`, `trash`, `macHD`.

### Menu bar (`src/components/MenuBar.tsx` + `MenuBarDropdown.tsx`)

The Apple menu, the active-app menu, and File / Edit / View / Special / Help are all real dropdowns. Menu definitions live in `MenuBar.tsx` as `MenuDefinition[]`, built each render with closures over `useWindowStore` actions. Each menu has a stable `key` (e.g. `'apple'`, `'app'`, `'file'`) used to track which dropdown is open.

Menu type is in `src/types/index.ts`:

```ts
type MenuItem =
  | { type: 'item'; label: string; onSelect?: () => void; disabled?: boolean; shortcut?: string }
  | { type: 'separator' };

interface MenuDefinition { label: string; key?: string; items: MenuItem[]; }
```

Behavior:
- Click a label to toggle its dropdown. Clicking the open one closes it.
- While any dropdown is open, **hovering** another label switches to it (classic Mac).
- Click outside or press Escape to close.
- Menu button `onMouseDown` calls `stopPropagation` to keep the dropdown's document-level outside-click handler from closing the menu before its `onClick` toggles.
- The "app" menu changes label and contents based on the active window (`Quit Finder`, `Quit Terminal`, …).

Currently wired actions: About This Macintosh, Restart, New Finder Window (⌘N), Close Window (⌘W), Quit *App* (⌘Q). Most Edit/View items are intentionally disabled placeholders — wiring them up means routing focus into the active app, which we'll do per-app as needed.

To add a per-app menu later, the cleanest path is to extend `AppDefinition` with an optional `menus?: AppMenus` field (File/Edit/View overrides) and have `MenuBar.tsx` merge those over the defaults when an app is active.

### Window store (`src/store/windowStore.ts`)

`openWindow(appId)` / `closeWindow(id)` / `minimize` / `maximize` / `focus` / `updatePosition` / `updateSize`. Resolves title/size from registry. Re-opening an open app focuses (and restores) the existing window. External-URL apps short-circuit to `window.open`.

### Window component (`src/components/Window.tsx`)

- Title bar pinstriped when active, flat gray when inactive.
- Three controls: `pixel-box` (close, left), `pixel-box is-collapse` + `pixel-box is-zoom` (right).
- Glyphs (X, line, square) reveal on **window hover** via `.group/window:hover` — that's the canonical Mac OS 8 behavior (mouse over the window, all three appear).
- Inactive windows hide the controls entirely (also canonical — you click the title bar to focus, then click the control).
- Title text centered, sits in a `--plat-100` inset that masks the pinstripes behind it.
- Drag via pointer events (touch + mouse), position clamped so the window can't be dragged fully off-screen.
- Double-click title bar = maximize toggle.

## File layout

```
src/
├── App.tsx               — root: mounts MenuBar/Desktop/Dock, auto-opens initial windows
├── main.tsx              — ReactDOM root
├── index.css             — Tailwind directives + CSS variables + chrome helper classes
├── types/index.ts        — WindowState, AppDefinition
├── store/windowStore.ts  — Zustand: windows + actions
├── apps/
│   ├── registry.ts       — central APPS list
│   ├── Finder.tsx        — list view with pixel icons + status bar
│   ├── Terminal.tsx      — VT323, green-on-black, command history
│   ├── About.tsx         — "About This Macintosh"-style identity card
│   └── Music.tsx         — Music Box: pixel album art + chrome controls + playlist
└── components/
    ├── MenuBar.tsx           — top bar with rainbow Apple + menus + clock + keyboard shortcuts
    ├── MenuBarDropdown.tsx   — dropdown panel rendered under an open menu label
    ├── Desktop.tsx           — dithered wallpaper + desktop icons + Window renderer
    ├── Window.tsx            — platinum window chrome
    ├── Dock.tsx              — bottom dock container
    ├── DockIcon.tsx          — single dock button + tooltip
    └── PixelIcon.tsx         — inline-SVG icon set on a 16×16 grid
```

## Conventions

- **No emoji in UI.** All icons go through `PixelIcon`.
- **Use the CSS variables and helper classes.** Don't write new hex colors or new bevels — extend the helpers in `index.css`.
- **`font-family: var(--font-chicago)`** for UI text, `var(--font-geneva)` for body, `var(--font-monaco)` for code/numbers.
- **Square corners.** `border-radius` should be 0 or omitted unless intentional.
- **Hard shadows only.** No `box-shadow` with blur > 2px.
- **Tailwind v3** for layout (`flex`, `gap-*`, `px-*`); inline `style={}` for platinum-specific values (colors, bevels, fonts).
- **No comments unless WHY is non-obvious.**

## Roadmap (`TASKS.md`)

`TASKS.md` is the prioritized feature backlog — boot screen, menu dropdowns, dock magnification, wallpaper picker, Control Panels app, real Music ↔ Spotify, MDX blog, screensaver, mobile layout, etc. **Ordered roughly by priority**, but priorities can shift; confirm before starting a task you haven't been asked to do.

Now that we've committed to the Platinum aesthetic, when tackling TASKS.md items keep them in-era:

- **Boot screen (#1)** → classic "Welcome to Macintosh" splash with Happy Mac and Chicago text, not Apple-logo + modern progress bar.
- **Dock magnification (#4)** → minor scale on hover is fine, but no Aqua-style proximity field — that's an OS X feature.
- **Wallpaper picker (#6)** → built-in System 7/8 patterns: dither gray, blue-gray, Stationery, Bondi, Random Patterns.
- **System sounds (#8)** → use the real System 7 / Sosumi / startup chime samples (if licensing allows) or synthesize with Tone.js.
- **iPod / Music app (#10)** → already redone as a Music Box panel; can extend to a real iPod-clickwheel app later.
- **Blog / TextEdit (#11)** → SimpleText / TextEdit Classic look with Geneva body text.

## Things to be careful about

- **z-index**: `MenuBar` is `9999`, `Dock` is `9998`, windows are `10+`. Don't introduce other fixed layers without checking.
- **Pointer capture**: Window dragging uses `setPointerCapture` so we don't need document-level listeners.
- **External-URL "apps"** (like GitHub) have `defaultWidth: 0, defaultHeight: 0` — those values are never read because `openWindow` short-circuits to `window.open`.
- **Strict mode + Framer Motion**: React 19 strict mode double-runs effects. `openWindow` is idempotent (existing-window check), so the auto-open in `App.tsx` works correctly under strict mode.
- **Fonts are CDN-loaded** via `<link>` in `index.html`. If we want offline reliability, drop the woff2 files into `public/fonts/` and switch to `@font-face` declarations.

## Out of scope right now

- No git repository yet — `git init` when ready.
- No tests yet. If we add them, vitest + jsdom is the natural fit.
- No real Chicago/Geneva/Monaco fonts (we use Pixelify Sans + VT323 as substitutes). Can be swapped in by downloading e.g. ChicagoFLF and adding a `@font-face`.
