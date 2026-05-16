export interface FileNode {
  type: 'file';
  content: string;
  mtime: number;
}

export interface DirNode {
  type: 'dir';
  children: Record<string, FSNode>;
  mtime: number;
}

export type FSNode = FileNode | DirNode;

export interface VFS {
  root: DirNode;
  cwd: string;
  home: string;
}

export const HOME = '/Users/akhileshw';

const now = () => Date.now();

export function emptyDir(): DirNode {
  return { type: 'dir', children: {}, mtime: now() };
}

export function makeFile(content: string): FileNode {
  return { type: 'file', content, mtime: now() };
}

export class VfsError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export function normalize(path: string): string {
  if (!path) return '/';
  const isAbs = path.startsWith('/');
  const parts = path.split('/').filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    if (p === '.') continue;
    if (p === '..') {
      if (out.length) out.pop();
      continue;
    }
    out.push(p);
  }
  if (isAbs) return '/' + out.join('/');
  return out.join('/') || '.';
}

export function expandTilde(path: string, home: string): string {
  if (path === '~') return home;
  if (path.startsWith('~/')) return home + path.slice(1);
  return path;
}

export function resolvePath(cwd: string, path: string, home: string = HOME): string {
  const expanded = expandTilde(path, home);
  if (expanded.startsWith('/')) return normalize(expanded);
  return normalize(cwd + '/' + expanded);
}

export function pathParts(abs: string): string[] {
  return abs.split('/').filter(Boolean);
}

export function basename(abs: string): string {
  const segs = pathParts(abs);
  return segs[segs.length - 1] || '';
}

export function dirname(abs: string): string {
  const segs = pathParts(abs);
  segs.pop();
  return '/' + segs.join('/');
}

export function displayPath(abs: string, home: string = HOME): string {
  if (abs === home) return '~';
  if (abs.startsWith(home + '/')) return '~' + abs.slice(home.length);
  return abs;
}

export function getNode(vfs: VFS, abs: string): FSNode | null {
  if (abs === '/' || abs === '') return vfs.root;
  const segs = pathParts(abs);
  let cur: FSNode = vfs.root;
  for (const s of segs) {
    if (cur.type !== 'dir') return null;
    const next: FSNode | undefined = cur.children[s];
    if (!next) return null;
    cur = next;
  }
  return cur;
}

export function exists(vfs: VFS, abs: string): boolean {
  return getNode(vfs, abs) !== null;
}

export function readFile(vfs: VFS, abs: string): string {
  const n = getNode(vfs, abs);
  if (!n) throw new VfsError('ENOENT', `${abs}: No such file or directory`);
  if (n.type !== 'file') throw new VfsError('EISDIR', `${abs}: Is a directory`);
  return n.content;
}

export function writeFile(vfs: VFS, abs: string, content: string): void {
  if (abs === '/') throw new VfsError('EISDIR', `${abs}: Is a directory`);
  const parent = dirname(abs);
  const p = getNode(vfs, parent);
  if (!p) throw new VfsError('ENOENT', `${parent}: No such file or directory`);
  if (p.type !== 'dir') throw new VfsError('ENOTDIR', `${parent}: Not a directory`);
  const name = basename(abs);
  const existing = p.children[name];
  if (existing && existing.type !== 'file') {
    throw new VfsError('EISDIR', `${abs}: Is a directory`);
  }
  p.children[name] = makeFile(content);
  p.mtime = now();
}

export function touch(vfs: VFS, abs: string): void {
  const existing = getNode(vfs, abs);
  if (existing) {
    existing.mtime = now();
    return;
  }
  writeFile(vfs, abs, '');
}

export function mkdir(vfs: VFS, abs: string, opts: { parents?: boolean } = {}): void {
  if (abs === '/') return;
  const segs = pathParts(abs);
  let cur: DirNode = vfs.root;
  for (let i = 0; i < segs.length; i++) {
    const name = segs[i];
    const isLast = i === segs.length - 1;
    const next: FSNode | undefined = cur.children[name];
    if (next) {
      if (next.type !== 'dir') {
        throw new VfsError('ENOTDIR', `/${segs.slice(0, i + 1).join('/')}: Not a directory`);
      }
      if (isLast && !opts.parents) {
        throw new VfsError('EEXIST', `${abs}: File exists`);
      }
      cur = next;
    } else {
      if (!isLast && !opts.parents) {
        throw new VfsError('ENOENT', `/${segs.slice(0, i).join('/')}: No such file or directory`);
      }
      const d = emptyDir();
      cur.children[name] = d;
      cur.mtime = now();
      cur = d;
    }
  }
}

export function rm(vfs: VFS, abs: string, opts: { recursive?: boolean; force?: boolean } = {}): void {
  if (abs === '/') throw new VfsError('EPERM', '/: cannot remove root');
  const parent = dirname(abs);
  const name = basename(abs);
  const p = getNode(vfs, parent);
  if (!p || p.type !== 'dir') {
    if (opts.force) return;
    throw new VfsError('ENOENT', `${abs}: No such file or directory`);
  }
  const node = p.children[name];
  if (!node) {
    if (opts.force) return;
    throw new VfsError('ENOENT', `${abs}: No such file or directory`);
  }
  if (node.type === 'dir' && !opts.recursive) {
    throw new VfsError('EISDIR', `${abs}: is a directory`);
  }
  delete p.children[name];
  p.mtime = now();
}

export function listDir(vfs: VFS, abs: string): string[] {
  const n = getNode(vfs, abs);
  if (!n) throw new VfsError('ENOENT', `${abs}: No such file or directory`);
  if (n.type !== 'dir') throw new VfsError('ENOTDIR', `${abs}: Not a directory`);
  return Object.keys(n.children).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function copy(vfs: VFS, src: string, dst: string, opts: { recursive?: boolean } = {}): void {
  const n = getNode(vfs, src);
  if (!n) throw new VfsError('ENOENT', `${src}: No such file or directory`);
  if (n.type === 'dir' && !opts.recursive) {
    throw new VfsError('EISDIR', `${src}: is a directory (not copied)`);
  }
  const dstNode = getNode(vfs, dst);
  const target = dstNode && dstNode.type === 'dir'
    ? normalize(dst + '/' + basename(src))
    : dst;
  if (n.type === 'file') {
    writeFile(vfs, target, n.content);
    return;
  }
  mkdir(vfs, target, { parents: true });
  for (const name of Object.keys(n.children)) {
    copy(vfs, src + '/' + name, target + '/' + name, { recursive: true });
  }
}

export function move(vfs: VFS, src: string, dst: string): void {
  const n = getNode(vfs, src);
  if (!n) throw new VfsError('ENOENT', `${src}: No such file or directory`);
  const dstNode = getNode(vfs, dst);
  const target = dstNode && dstNode.type === 'dir'
    ? normalize(dst + '/' + basename(src))
    : dst;
  const targetParent = dirname(target);
  const tp = getNode(vfs, targetParent);
  if (!tp || tp.type !== 'dir') {
    throw new VfsError('ENOENT', `${targetParent}: No such file or directory`);
  }
  const srcParent = dirname(src);
  const sp = getNode(vfs, srcParent);
  if (!sp || sp.type !== 'dir') {
    throw new VfsError('ENOENT', `${srcParent}: No such file or directory`);
  }
  const dstName = basename(target);
  const srcName = basename(src);
  if (sp === tp && srcName === dstName) return;
  tp.children[dstName] = n;
  delete sp.children[srcName];
  sp.mtime = now();
  tp.mtime = now();
}

export function nodeSize(n: FSNode): number {
  if (n.type === 'file') return n.content.length;
  let total = 0;
  for (const c of Object.values(n.children)) total += nodeSize(c);
  return total;
}

const STORAGE_KEY = 'os.akhileshw.xyz:vfs:v2';
const SEED_VERSION_KEY = 'os.akhileshw.xyz:vfs:seedVersion';

export function saveVFS(vfs: VFS, seedVersion: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ root: vfs.root, cwd: vfs.cwd }));
    localStorage.setItem(SEED_VERSION_KEY, seedVersion);
  } catch {
    // Quota exceeded or storage disabled — silently drop persistence.
  }
}

export function loadVFS(seedVersion: string): { root: DirNode; cwd: string } | null {
  try {
    const v = localStorage.getItem(SEED_VERSION_KEY);
    if (v !== seedVersion) return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (obj && obj.root && obj.root.type === 'dir' && typeof obj.cwd === 'string') {
      return { root: obj.root, cwd: obj.cwd };
    }
  } catch {}
  return null;
}

export function clearStoredVFS(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SEED_VERSION_KEY);
  } catch {}
}
