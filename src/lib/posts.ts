export interface Post {
  slug: string;
  title: string;
  date: string;
  content: string;
}

const welcome = `# Welcome to the Desktop

Hi — I'm Akhilesh. This little desktop is a portfolio dressed up as a
classic Mac. The icons in the dock are real apps; the windows resize and
minimize like they would on Mac OS 8. The Terminal runs a real shell
against a virtual filesystem seeded from this project's source — try
\`ls ~/site\` or \`tree ~/site/src/components\`.

You'll find more posts in **TextEdit** under the **Documents** folder
in Finder.

## What's here

- **Finder** — sidebar + icon/list view, draggable selections.
- **Terminal** — VFS, pipes, tab completion, the works.
- **iPod** — click-wheel rotates to scroll, scrub, and rate.
- **Control Panels** — wallpaper, sound, About this Mac.
- **TextEdit** — what you're reading right now.

## Why a desktop

A list of links would have taken ten minutes. A simulated OS took…
longer. But it forces every choice — typography, spacing, sound — to
be deliberate, and it gives me a place to keep adding small things
without redoing the homepage.
`;

const whyPlatinum = `# Why Platinum

Aqua is the look most people remember when you say "old Mac". The
brushed metal, the rounded traffic lights, the gloss. But there's an
older aesthetic that I find more interesting: **Platinum**, the
default theme from Mac OS 8 (1997).

Platinum is square. Beveled. The shadows are hard pixel offsets, not
soft blurs. Title bars have pinstripes. Buttons have a 1-pixel inset
white-and-gray border that screams *three dimensions* without ever
leaving the grid. It's a UI made for 72 dpi CRTs and it looks
*right* on a CRT in a way Aqua never does.

I wanted the whole site to feel like that — not as a museum piece
but as a working toy. The fonts are Pixelify Sans (a Chicago
stand-in) and VT323 (Monaco). The desktop pattern is the 50%
Bayer dither from System 7. Window chrome uses the same
\`inset 1px white / inset -1px gray\` recipe that real System 7
apps used.

## Constraints worth keeping

- **Square corners.** \`border-radius\` is the most modern thing in
  CSS. Removing it is the fastest way to make a UI feel pre-2000.
- **Hard shadows only.** No \`box-shadow\` with blur > 2px.
- **Pixel art icons.** SVG \`<rect>\`s on a 16×16 grid render
  identically at 1× and 2× without smoothing.
- **No emoji.** Anywhere.

These are easy rules to enforce because the wrong choice is loud —
you notice the second a soft drop shadow lands on a window.
`;

const colophon = `# Colophon

Built with React 19, Vite 5, TypeScript, Tailwind for layout, and
Zustand for store state. Window animations are Framer Motion.
Audio is synthesized via the Web Audio API — there are no sound
files shipped with the site.

The Terminal runs a virtual filesystem (\`src/lib/vfs.ts\`) that's
seeded at build time from the actual repo source via Vite's
\`import.meta.glob\`. So \`cat ~/site/src/apps/Music.tsx\` shows
you the real Music.tsx — including the click-wheel handler.

## Type

- **Pixelify Sans** for UI (Chicago substitute)
- **VT323** for monospace (Monaco substitute)

Real Chicago/Geneva/Monaco aren't shipped because their licensing
is murky; the Google Fonts pixel substitutes get close enough.

## Source

This codebase lives at
[github.com/akhilesh-w/os.akhileshw.xyz](https://github.com/akhilesh-w).
TASKS.md tracks what's left.
`;

export const POSTS: Post[] = [
  { slug: 'welcome', title: 'Welcome to the Desktop', date: '2026-05-01', content: welcome },
  { slug: 'why-platinum', title: 'Why Platinum', date: '2026-05-08', content: whyPlatinum },
  { slug: 'colophon', title: 'Colophon', date: '2026-05-12', content: colophon },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find(p => p.slug === slug);
}
