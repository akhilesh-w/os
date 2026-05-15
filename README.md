# os.akhileshw.xyz

> A personal portfolio rendered as a 1997 Macintosh desktop.
> Live at **[os.akhileshw.xyz](https://os.akhileshw.xyz)**.

Inspired by [ryOS](https://os.ryo.lu/). Aims for the **Mac OS 8 Platinum** look — dithered desktop, pinstriped title bars, pixel-art icons, Chicago/Geneva-substitute fonts.

## What's in here

- Draggable windows with focus, minimize (collapse), maximize (zoom), and close
- Real menu bar dropdowns: Apple / app / File / Edit / View / Special / Help — hover-to-switch, click-outside to dismiss, ⌘W close, ⌘N new Finder window
- Desktop icons you can drag around; positions persist across refreshes (View → Clean Up Desktop resets them)
- Built-in apps:
  - **Finder** — project list
  - **About This Macintosh** — identity card
  - **Terminal** — fake shell with command history
  - **iPod** — live now-playing from Spotify via the [akhileshw.xyz](https://akhileshw.xyz) API

## Stack

Vite 5 · React 19 · TypeScript · Tailwind · Zustand · Framer Motion · Pixelify Sans + VT323 (Google Fonts).

## Run it

```bash
npm install
npm run dev
```

Build: `npm run build` → `dist/`. Deploys to Vercel as a static SPA; `vercel.json` rewrites `/api/now-playing` to the akhileshw.xyz API so the iPod has live data.

## Structure

```
src/
├── apps/         — built-in apps + central registry
├── components/   — MenuBar, Desktop, Window, Dock, PixelIcon, ...
├── store/        — Zustand stores (windows, desktop icons)
└── types/        — shared types
```

See [`CLAUDE.md`](./CLAUDE.md) for the architecture deep-dive (window store, menu dropdown system, platinum chrome CSS variables, how to add a new app) and [`TASKS.md`](./TASKS.md) for the feature backlog.

## Status

Early but functional. On the roadmap from `TASKS.md`: boot screen with Happy Mac, wallpaper picker with System 7 patterns, screensaver, mobile layout, and a TextEdit/blog app.

## Credits

Aesthetic and concept lovingly stolen from [ryo.lu](https://ryo.lu)'s [ryOS](https://os.ryo.lu/). Original Mac OS UI design © Apple, 1984–.

## License

MIT — see [`LICENSE`](./LICENSE).
