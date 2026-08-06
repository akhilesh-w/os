/// <reference types="vite/client" />
import {
  HOME,
  emptyDir,
  mkdir,
  writeFile,
  type DirNode,
  type VFS,
} from './vfs';

const RAW_SRC = import.meta.glob('/src/**/*.{ts,tsx,css,svg}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const RAW_ROOT = import.meta.glob(
  [
    '/README.md',
    '/TASKS.md',
    '/LICENSE',
    '/brand.md',
    '/package.json',
    '/tsconfig.json',
    '/tsconfig.node.json',
    '/vite.config.ts',
    '/tailwind.config.js',
    '/postcss.config.js',
    '/index.html',
  ],
  { query: '?raw', import: 'default', eager: true }
) as Record<string, string>;

const PROJECT_DIR = `${HOME}/site`;

export const SEED_VERSION = 'v3-' + Object.keys({ ...RAW_SRC, ...RAW_ROOT }).length;

function placeFile(vfs: VFS, abs: string, content: string) {
  const segs = abs.split('/').filter(Boolean);
  segs.pop();
  if (segs.length) mkdir(vfs, '/' + segs.join('/'), { parents: true });
  writeFile(vfs, abs, content);
}

const ABOUT_TXT = `Akhilesh Waghmare
Coder, storyteller, explorer of ideas.

This is a virtual filesystem. The files under ~/site/ are the actual
source of this portfolio — they came from the project repo at build
time. Edit them, rm them, redirect into new ones — it all lives in
your browser's localStorage until you 'reset'.

  ~/site         the project repo
  ~/Documents    your stuff
  ~/Desktop      what shows on the desktop

Try:  ls ~/site, cat ~/site/README.md, tree ~/site/src/components
`;

const BASHRC = `# ~/.bashrc — runs on every interactive shell
export PS1='\\u@mac:\\w % '
export EDITOR=pico
alias ll='ls -l'
alias la='ls -a'
alias ..='cd ..'
`;

const BASH_PROFILE = `# ~/.bash_profile
source ~/.bashrc
`;

export function buildSeedVFS(): VFS {
  const vfs: VFS = {
    root: emptyDir(),
    cwd: PROJECT_DIR,
    home: HOME,
  };

  mkdir(vfs, '/Users', { parents: true });
  mkdir(vfs, HOME, { parents: true });
  mkdir(vfs, `${HOME}/Documents`, { parents: true });
  mkdir(vfs, `${HOME}/Desktop`, { parents: true });
  mkdir(vfs, `${HOME}/Downloads`, { parents: true });
  mkdir(vfs, '/bin', { parents: true });
  mkdir(vfs, '/etc', { parents: true });
  mkdir(vfs, '/tmp', { parents: true });
  mkdir(vfs, '/var/log', { parents: true });

  writeFile(vfs, `${HOME}/about.txt`, ABOUT_TXT);
  writeFile(vfs, `${HOME}/.bashrc`, BASHRC);
  writeFile(vfs, `${HOME}/.bash_profile`, BASH_PROFILE);
  writeFile(vfs, '/etc/hostname', 'macintosh\n');
  writeFile(
    vfs,
    '/etc/motd',
    'Welcome to Macintosh.\nSystem 7.5.3 — bash 1.0 (akhilesh build)\n'
  );

  for (const [path, content] of Object.entries(RAW_SRC)) {
    placeFile(vfs, PROJECT_DIR + path, content);
  }
  for (const [path, content] of Object.entries(RAW_ROOT)) {
    placeFile(vfs, PROJECT_DIR + path, content);
  }

  return vfs;
}

export function ensureCwdValid(vfs: VFS): void {
  const segs = vfs.cwd.split('/').filter(Boolean);
  let cur: DirNode = vfs.root;
  for (const s of segs) {
    const next = cur.children[s];
    if (!next || next.type !== 'dir') {
      vfs.cwd = HOME;
      return;
    }
    cur = next;
  }
}
