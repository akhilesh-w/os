# os.akhileshw.xyz — Task List

Tasks to make the site match [ryos.ryo.lu](https://os.ryo.lu/), roughly in priority order.

| # | Task | Description |
|---|------|-------------|
| 1 | Boot/login screen | Startup animation — Apple logo, progress bar, fade into desktop. First impression like ryOS. |
| 2 | Authentic macOS Aqua window chrome | Brushed aluminum title bar, proper traffic light buttons (show × − + on hover), toolbar area, status bar, resize handle. |
| 3 | Menu bar dropdown menus | Clicking menu bar items opens real dropdowns. Each app registers its own items. Apple menu has About, Sleep, Shut Down. |
| 4 | Dock magnification & bounce | Proximity-based icon magnification on hover, bounce animation on launch, indicator dot for open apps, tooltip labels. |
| 5 | Desktop right-click context menu | Right-click desktop → Change Wallpaper, New Folder, Get Info, etc. |
| 6 | Wallpaper picker | 6–8 built-in wallpapers (CSS gradients + SVG patterns), picker in desktop menu or Control Panels. |
| 7 | Desktop icons | Draggable icons on desktop — Macintosh HD, Trash, app shortcuts. Double-click to open. |
| 8 | System sounds | Classic Mac sounds via Web Audio API: startup chime, open/close whoosh, error beep, click. Toggle in settings. |
| 9 | Control Panels app | System prefs: Appearance (wallpaper), Sound (toggle/volume), About This Mac (real gear from uses page). |
| 10 | ~~iPod / Music app upgrade~~ ✓ | ~~Replace placeholder with iPod-style UI + real Spotify now-playing via existing akhileshw.xyz API.~~ Done — LCD + chrome clickwheel, live data via Vite proxy + Vercel rewrite to `/api/now-playing`. |
| 11 | Blog / TextEdit app | TextEdit-style app rendering MDX blog posts. Each post opens in its own window. |
| 12 | Screensaver | Activates after ~2 min idle — starfield, floating clock, or photo slideshow. Click/key to dismiss. |
| 13 | Window minimize animation (genie effect) | Window "sucks" into dock on minimize using Framer Motion AnimatePresence. |
| 14 | Mobile / responsive layout | Full-screen windows on mobile, dock becomes bottom tab bar, menu bar adapts. |
