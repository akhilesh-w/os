# Brand — os.akhileshw.xyz

_Status: locked — Classic Mac OS / Platinum aesthetic_

This project's brand is the **late-90s Apple Platinum** UI: System 7 / Mac OS 8 / Mac OS 9. The visual rules and tokens live in:

- `src/index.css` — CSS variables (`--plat-*`, `--font-*`) and chrome helper classes
- `CLAUDE.md` — full aesthetic spec, conventions, and what NOT to do

There is no shadcn theme to swap and no need to run `/brand-design`. If we ever want a multi-theme switcher (Platinum / Aqua / Win98) like ryOS does, the work would be adding additional CSS variable sets under a body class and a Control Panels app to toggle between them.

## Palette

- White `#ffffff`, light grays `#f5f5f5 → #cccccc`, mid grays `#aaaaaa → #666666`, black `#000000`
- Selection: System 7 navy `#000080` on white
- Terminal: green-on-black `#33ff66` on `#000000` (Monaco / VT323)

## Typography

- UI / menus / titles: **Pixelify Sans** (Chicago substitute)
- Body in apps: **Pixelify Sans** (Geneva substitute)
- Monospace / terminal: **VT323** (Monaco substitute)

Loaded from Google Fonts in `index.html`. Upgrade path: drop real ChicagoFLF / Geneva-9 / Monaco woff2 into `public/fonts/` and add `@font-face` declarations.

## Voice

Terse. Chicago-font terse. "About This Macintosh", not "About the Author". "Items: 6", not "Showing 6 results". Lean into the early-Apple wit.
