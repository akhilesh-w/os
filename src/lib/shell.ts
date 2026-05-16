import {
  HOME,
  basename,
  copy as vfsCopy,
  displayPath,
  exists,
  getNode,
  mkdir as vfsMkdir,
  move as vfsMove,
  nodeSize,
  readFile as vfsReadFile,
  resolvePath,
  rm as vfsRm,
  touch as vfsTouch,
  writeFile as vfsWriteFile,
  VfsError,
  type FSNode,
  type VFS,
} from './vfs';

export interface ShellState {
  vfs: VFS;
  env: Record<string, string>;
  aliases: Record<string, string>;
  history: string[];
  lastExitCode: number;
  hostname: string;
  user: string;
}

export interface CmdResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface CmdContext {
  argv: string[];
  stdin: string;
  shell: ShellState;
}

type CmdHandler = (ctx: CmdContext) => CmdResult;

const ok = (stdout = ''): CmdResult => ({ stdout, stderr: '', code: 0 });
const err = (stderr: string, code = 1, stdout = ''): CmdResult => ({ stdout, stderr, code });

export function makeShell(vfs: VFS): ShellState {
  return {
    vfs,
    env: {
      USER: 'akhileshw',
      HOME,
      SHELL: '/bin/bash',
      PATH: '/usr/local/bin:/usr/bin:/bin',
      TERM: 'macterm',
      LANG: 'en_US.UTF-8',
      PWD: vfs.cwd,
    },
    aliases: {
      ll: 'ls -l',
      la: 'ls -a',
      'l': 'ls -la',
      '..': 'cd ..',
    },
    history: [],
    lastExitCode: 0,
    hostname: 'macintosh',
    user: 'akhileshw',
  };
}

// ────────── tokenizer / parser ──────────

class ParseError extends Error {}

function expandEnv(s: string, shell: ShellState): string {
  return s.replace(/\$([A-Za-z_][A-Za-z0-9_]*)|\$\{([^}]+)\}/g, (_, a, b) => {
    const name = a || b;
    return shell.env[name] ?? '';
  });
}

interface Token {
  kind: 'word' | 'op';
  value: string;
}

function tokenize(input: string, shell: ShellState): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let cur = '';
  let inWord = false;

  const flushWord = () => {
    if (inWord) {
      tokens.push({ kind: 'word', value: cur });
      cur = '';
      inWord = false;
    }
  };

  while (i < input.length) {
    const c = input[i];

    if (c === ' ' || c === '\t') {
      flushWord();
      i++;
      continue;
    }

    if (c === '#' && !inWord) break; // comment to end of line

    if (c === ';' || c === '|') {
      flushWord();
      tokens.push({ kind: 'op', value: c });
      i++;
      continue;
    }

    if (c === '>') {
      flushWord();
      if (input[i + 1] === '>') {
        tokens.push({ kind: 'op', value: '>>' });
        i += 2;
      } else {
        tokens.push({ kind: 'op', value: '>' });
        i++;
      }
      continue;
    }

    if (c === '<' && !inWord) {
      flushWord();
      tokens.push({ kind: 'op', value: '<' });
      i++;
      continue;
    }

    if (c === '"') {
      i++;
      inWord = true;
      while (i < input.length && input[i] !== '"') {
        if (input[i] === '\\' && i + 1 < input.length) {
          const nx = input[i + 1];
          if (nx === '"' || nx === '\\' || nx === '$') {
            cur += nx;
            i += 2;
            continue;
          }
        }
        cur += input[i];
        i++;
      }
      if (i >= input.length) throw new ParseError('unexpected EOF while looking for matching `"`');
      i++;
      // Apply env expansion within double quotes
      const expanded = expandEnv(cur, shell);
      cur = '';
      tokens.push({ kind: 'word', value: expanded });
      inWord = false;
      continue;
    }

    if (c === "'") {
      i++;
      inWord = true;
      while (i < input.length && input[i] !== "'") {
        cur += input[i];
        i++;
      }
      if (i >= input.length) throw new ParseError("unexpected EOF while looking for matching `'`");
      i++;
      tokens.push({ kind: 'word', value: cur });
      cur = '';
      inWord = false;
      continue;
    }

    if (c === '\\' && i + 1 < input.length) {
      cur += input[i + 1];
      inWord = true;
      i += 2;
      continue;
    }

    cur += c;
    inWord = true;
    i++;
  }
  flushWord();

  // Apply env var expansion to bare words
  return tokens.map(t => (t.kind === 'word' ? { ...t, value: expandEnv(t.value, shell) } : t));
}

interface Cmd {
  argv: string[];
  stdout?: { type: '>' | '>>'; target: string };
}
interface Pipeline {
  cmds: Cmd[];
}
interface Seq {
  pipelines: Pipeline[];
}

function parse(tokens: Token[]): Seq {
  const seq: Seq = { pipelines: [] };
  let pipeline: Pipeline = { cmds: [] };
  let cmd: Cmd = { argv: [] };

  const finishCmd = () => {
    if (cmd.argv.length || cmd.stdout) {
      pipeline.cmds.push(cmd);
      cmd = { argv: [] };
    }
  };
  const finishPipeline = () => {
    finishCmd();
    if (pipeline.cmds.length) seq.pipelines.push(pipeline);
    pipeline = { cmds: [] };
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === 'op') {
      if (t.value === ';') {
        finishPipeline();
      } else if (t.value === '|') {
        finishCmd();
      } else if (t.value === '>' || t.value === '>>') {
        const target = tokens[i + 1];
        if (!target || target.kind !== 'word') {
          throw new ParseError(`syntax error near unexpected token '${tokens[i + 1]?.value ?? 'newline'}'`);
        }
        cmd.stdout = { type: t.value, target: target.value };
        i++;
      } else if (t.value === '<') {
        // input redirect — silently swallow, not implemented
        i++;
      }
    } else {
      cmd.argv.push(t.value);
    }
  }
  finishPipeline();
  return seq;
}

// ────────── alias expansion (first token only, one pass) ──────────

function expandAliases(argv: string[], aliases: Record<string, string>): string[] {
  if (!argv.length) return argv;
  const a = aliases[argv[0]];
  if (!a) return argv;
  const expanded = a.split(/\s+/).filter(Boolean);
  return [...expanded, ...argv.slice(1)];
}

// ────────── entry point ──────────

export function runLine(input: string, shell: ShellState): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  shell.history.push(trimmed);

  let seq: Seq;
  try {
    seq = parse(tokenize(trimmed, shell));
  } catch (e) {
    if (e instanceof ParseError) {
      shell.lastExitCode = 2;
      return `bash: ${e.message}\n`;
    }
    throw e;
  }

  let output = '';
  for (const pipeline of seq.pipelines) {
    let stdin = '';
    let lastCode = 0;
    for (let i = 0; i < pipeline.cmds.length; i++) {
      const cmd = pipeline.cmds[i];
      const argv = expandAliases(cmd.argv, shell.aliases);
      if (!argv.length) continue;
      const name = argv[0];
      const handler = COMMANDS[name];
      const isLast = i === pipeline.cmds.length - 1;
      let result: CmdResult;
      if (handler) {
        try {
          result = handler({ argv, stdin, shell });
        } catch (e) {
          if (e instanceof VfsError) {
            result = err(`${name}: ${e.message}\n`);
          } else {
            result = err(`${name}: ${(e as Error).message}\n`);
          }
        }
      } else {
        result = err(`bash: ${name}: command not found\n`, 127);
      }
      lastCode = result.code;

      if (isLast && cmd.stdout) {
        const target = resolvePath(shell.vfs.cwd, cmd.stdout.target);
        try {
          if (cmd.stdout.type === '>') {
            vfsWriteFile(shell.vfs, target, result.stdout);
          } else {
            let existing = '';
            try {
              existing = vfsReadFile(shell.vfs, target);
            } catch {}
            vfsWriteFile(shell.vfs, target, existing + result.stdout);
          }
        } catch (e) {
          const msg = e instanceof VfsError ? e.message : (e as Error).message;
          output += `bash: ${cmd.stdout.target}: ${msg}\n`;
          lastCode = 1;
        }
        output += result.stderr;
      } else if (isLast) {
        output += result.stdout;
        output += result.stderr;
      } else {
        output += result.stderr;
        stdin = result.stdout;
      }
    }
    shell.lastExitCode = lastCode;
  }
  return output;
}

// ────────── helpers ──────────

function parseFlags(argv: string[], known: Set<string>): { flags: Set<string>; rest: string[]; flagValues: Record<string, string> } {
  const flags = new Set<string>();
  const flagValues: Record<string, string> = {};
  const rest: string[] = [];
  let stoppedFlags = false;
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (stoppedFlags) {
      rest.push(a);
      continue;
    }
    if (a === '--') {
      stoppedFlags = true;
      continue;
    }
    if (a.startsWith('--')) {
      const k = a.slice(2);
      flags.add('--' + k);
      continue;
    }
    if (a.startsWith('-') && a.length > 1 && !/^-\d/.test(a)) {
      for (const ch of a.slice(1)) flags.add('-' + ch);
      continue;
    }
    rest.push(a);
  }
  return { flags, rest, flagValues };
}

function lines(s: string): string[] {
  if (!s) return [];
  const arr = s.split('\n');
  if (arr.length && arr[arr.length - 1] === '') arr.pop();
  return arr;
}

function ensureTrailingNL(s: string): string {
  if (!s) return '';
  return s.endsWith('\n') ? s : s + '\n';
}

function formatMode(node: FSNode): string {
  return node.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--';
}

function formatMtime(mtime: number): string {
  const d = new Date(mtime);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = months[d.getMonth()];
  const day = String(d.getDate()).padStart(2, ' ');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${m} ${day} ${hh}:${mm}`;
}

function padRight(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}
function padLeft(s: string, n: number): string {
  return s.length >= n ? s : ' '.repeat(n - s.length) + s;
}

// ────────── commands ──────────

const COMMANDS: Record<string, CmdHandler> = {
  help: () =>
    ok(
      `Built-in commands (bash 1.0 — akhilesh build):
  ls cd pwd cat echo printf head tail wc grep find tree
  mkdir touch rm mv cp ln stat file du df
  whoami uname hostname date uptime
  env export unset alias unalias which type
  history clear reset exit logout man
  open

Try:  ls ~/site   |   cat ~/site/README.md   |   tree ~/site/src
`
    ),

  pwd: ({ shell }) => ok(shell.vfs.cwd + '\n'),

  whoami: ({ shell }) => ok(shell.user + '\n'),

  hostname: ({ shell }) => ok(shell.hostname + '\n'),

  date: () => ok(new Date().toString() + '\n'),

  uname: ({ argv }) => {
    const { flags } = parseFlags(argv, new Set());
    if (flags.has('-a')) {
      return ok('Darwin macintosh 7.5.3 ppc Macintosh\n');
    }
    return ok('Darwin\n');
  },

  uptime: () => {
    const sec = Math.floor((Date.now() - bootTime) / 1000);
    const min = Math.floor(sec / 60);
    const h = Math.floor(min / 60);
    return ok(
      `${new Date().toLocaleTimeString()}  up ${h}h ${min % 60}m,  1 user,  load average: 0.42, 0.36, 0.31\n`
    );
  },

  echo: ({ argv }) => {
    const { flags, rest } = parseFlags(argv, new Set(['-n']));
    const out = rest.join(' ');
    return ok(flags.has('-n') ? out : out + '\n');
  },

  printf: ({ argv }) => {
    if (argv.length < 2) return err('printf: usage: printf format [arguments]\n');
    const fmt = argv[1];
    const args = argv.slice(2);
    let idx = 0;
    const out = fmt
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/%s/g, () => args[idx++] ?? '');
    return ok(out);
  },

  clear: () => ({ stdout: '\x0c', stderr: '', code: 0 }),

  cd: ({ argv, shell }) => {
    const target = argv[1] ?? '~';
    const abs = resolvePath(shell.vfs.cwd, target, shell.vfs.home);
    const node = getNode(shell.vfs, abs);
    if (!node) return err(`cd: no such file or directory: ${target}\n`);
    if (node.type !== 'dir') return err(`cd: not a directory: ${target}\n`);
    shell.vfs.cwd = abs;
    shell.env.PWD = abs;
    return ok();
  },

  ls: ({ argv, shell }) => {
    const { flags, rest } = parseFlags(argv, new Set(['-a', '-l', '-1', '-h', '-A', '-F']));
    const long = flags.has('-l');
    const showHidden = flags.has('-a') || flags.has('-A');
    const oneCol = flags.has('-1') || long;
    const classify = flags.has('-F');
    const targets = rest.length ? rest : ['.'];

    let out = '';
    let firstError = '';
    const showHeader = targets.length > 1;

    for (let ti = 0; ti < targets.length; ti++) {
      const t = targets[ti];
      const abs = resolvePath(shell.vfs.cwd, t, shell.vfs.home);
      const node = getNode(shell.vfs, abs);
      if (!node) {
        firstError += `ls: ${t}: No such file or directory\n`;
        continue;
      }

      if (node.type === 'file') {
        const display = t + (classify ? '' : '');
        if (long) {
          out += `${formatMode(node)} ${padLeft(String(node.content.length), 6)} ${formatMtime(node.mtime)} ${display}\n`;
        } else {
          out += display + '\n';
        }
        continue;
      }

      if (showHeader) out += (ti > 0 ? '\n' : '') + `${t}:\n`;
      const names = Object.keys(node.children)
        .filter(n => showHidden || !n.startsWith('.'))
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

      const decorate = (n: string) => {
        if (!classify) return n;
        const child = node.children[n];
        if (child.type === 'dir') return n + '/';
        return n;
      };

      if (long) {
        let totalSize = 0;
        for (const n of names) totalSize += nodeSize(node.children[n]);
        out += `total ${Math.ceil(totalSize / 512)}\n`;
        for (const n of names) {
          const c = node.children[n];
          out += `${formatMode(c)} ${padLeft(String(c.type === 'file' ? c.content.length : nodeSize(c)), 6)} ${formatMtime(c.mtime)} ${decorate(n)}\n`;
        }
      } else if (oneCol) {
        for (const n of names) out += decorate(n) + '\n';
      } else {
        // Two-space-separated, simple column layout
        const decorated = names.map(decorate);
        out += decorated.join('  ') + (decorated.length ? '\n' : '');
      }
    }
    if (firstError) return err(firstError, 1, out);
    return ok(out);
  },

  cat: ({ argv, stdin, shell }) => {
    const { rest } = parseFlags(argv, new Set());
    if (!rest.length) return ok(stdin);
    let out = '';
    let hadErr = '';
    let code = 0;
    for (const p of rest) {
      if (p === '-') {
        out += stdin;
        continue;
      }
      try {
        const abs = resolvePath(shell.vfs.cwd, p, shell.vfs.home);
        out += vfsReadFile(shell.vfs, abs);
      } catch (e) {
        const msg = e instanceof VfsError ? e.message : (e as Error).message;
        hadErr += `cat: ${msg}\n`;
        code = 1;
      }
    }
    return { stdout: out, stderr: hadErr, code };
  },

  head: ({ argv, stdin, shell }) => {
    let n = 10;
    const pathArgs: string[] = [];
    for (let i = 1; i < argv.length; i++) {
      const a = argv[i];
      if (a === '-n' && argv[i + 1]) {
        n = parseInt(argv[++i], 10) || 10;
      } else if (/^-\d+$/.test(a)) {
        n = parseInt(a.slice(1), 10);
      } else {
        pathArgs.push(a);
      }
    }
    const sources: { name: string; content: string }[] = [];
    if (!pathArgs.length) sources.push({ name: '', content: stdin });
    else {
      for (const p of pathArgs) {
        try {
          const abs = resolvePath(shell.vfs.cwd, p, shell.vfs.home);
          sources.push({ name: p, content: vfsReadFile(shell.vfs, abs) });
        } catch (e) {
          return err(`head: ${(e as Error).message}\n`);
        }
      }
    }
    let out = '';
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i];
      if (sources.length > 1) out += (i > 0 ? '\n' : '') + `==> ${s.name} <==\n`;
      out += lines(s.content).slice(0, n).join('\n');
      if (out && !out.endsWith('\n')) out += '\n';
    }
    return ok(out);
  },

  tail: ({ argv, stdin, shell }) => {
    let n = 10;
    let pathArgs: string[] = [];
    for (let i = 1; i < argv.length; i++) {
      const a = argv[i];
      if (a === '-n' && argv[i + 1]) {
        n = parseInt(argv[++i], 10) || 10;
      } else if (a.startsWith('-') && /^-\d+$/.test(a)) {
        n = parseInt(a.slice(1), 10);
      } else {
        pathArgs.push(a);
      }
    }
    const sources: { name: string; content: string }[] = [];
    if (!pathArgs.length) sources.push({ name: '', content: stdin });
    else {
      for (const p of pathArgs) {
        try {
          const abs = resolvePath(shell.vfs.cwd, p, shell.vfs.home);
          sources.push({ name: p, content: vfsReadFile(shell.vfs, abs) });
        } catch (e) {
          return err(`tail: ${(e as Error).message}\n`);
        }
      }
    }
    let out = '';
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i];
      if (sources.length > 1) out += (i > 0 ? '\n' : '') + `==> ${s.name} <==\n`;
      out += lines(s.content).slice(-n).join('\n');
      if (out && !out.endsWith('\n')) out += '\n';
    }
    return ok(out);
  },

  wc: ({ argv, stdin, shell }) => {
    const { flags, rest } = parseFlags(argv, new Set(['-l', '-w', '-c']));
    const wantLines = flags.has('-l') || (!flags.has('-w') && !flags.has('-c'));
    const wantWords = flags.has('-w') || (!flags.has('-l') && !flags.has('-c'));
    const wantBytes = flags.has('-c') || (!flags.has('-l') && !flags.has('-w'));

    const sources: { name: string; content: string }[] = [];
    if (!rest.length) sources.push({ name: '', content: stdin });
    else {
      for (const p of rest) {
        try {
          const abs = resolvePath(shell.vfs.cwd, p, shell.vfs.home);
          sources.push({ name: p, content: vfsReadFile(shell.vfs, abs) });
        } catch (e) {
          return err(`wc: ${(e as Error).message}\n`);
        }
      }
    }
    let out = '';
    let totLines = 0, totWords = 0, totBytes = 0;
    for (const s of sources) {
      const ls = lines(s.content).length;
      const ws = s.content.trim().split(/\s+/).filter(Boolean).length;
      const bs = s.content.length;
      totLines += ls; totWords += ws; totBytes += bs;
      const parts: string[] = [];
      if (wantLines) parts.push(padLeft(String(ls), 8));
      if (wantWords) parts.push(padLeft(String(ws), 8));
      if (wantBytes) parts.push(padLeft(String(bs), 8));
      out += parts.join(' ') + (s.name ? ' ' + s.name : '') + '\n';
    }
    if (sources.length > 1) {
      const parts: string[] = [];
      if (wantLines) parts.push(padLeft(String(totLines), 8));
      if (wantWords) parts.push(padLeft(String(totWords), 8));
      if (wantBytes) parts.push(padLeft(String(totBytes), 8));
      out += parts.join(' ') + ' total\n';
    }
    return ok(out);
  },

  grep: ({ argv, stdin, shell }) => {
    const { flags, rest } = parseFlags(argv, new Set(['-i', '-n', '-r', '-R', '-v', '-l', '-c', '-E', '-F']));
    if (!rest.length) return err('usage: grep [-inrvlc] pattern [file ...]\n', 2);
    const pattern = rest[0];
    const paths = rest.slice(1);
    let re: RegExp;
    try {
      re = new RegExp(flags.has('-F') ? pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : pattern, flags.has('-i') ? 'i' : '');
    } catch (e) {
      return err(`grep: ${(e as Error).message}\n`);
    }
    const invert = flags.has('-v');
    const number = flags.has('-n');
    const countOnly = flags.has('-c');
    const listOnly = flags.has('-l');
    const recursive = flags.has('-r') || flags.has('-R');

    const collected: { name: string; content: string }[] = [];
    if (!paths.length) collected.push({ name: '', content: stdin });
    else {
      for (const p of paths) {
        const abs = resolvePath(shell.vfs.cwd, p, shell.vfs.home);
        const n = getNode(shell.vfs, abs);
        if (!n) return err(`grep: ${p}: No such file or directory\n`);
        if (n.type === 'file') collected.push({ name: p, content: n.content });
        else if (recursive) {
          collectFiles(shell, abs, p, collected);
        } else {
          return err(`grep: ${p}: Is a directory\n`);
        }
      }
    }
    let out = '';
    let anyMatch = false;
    for (const src of collected) {
      const ls = lines(src.content);
      let matched = 0;
      const hits: string[] = [];
      for (let i = 0; i < ls.length; i++) {
        const isMatch = re.test(ls[i]);
        if (invert ? !isMatch : isMatch) {
          matched++;
          if (!countOnly && !listOnly) {
            const prefix =
              (collected.length > 1 && src.name ? src.name + ':' : '') +
              (number ? `${i + 1}:` : '');
            hits.push(prefix + ls[i]);
          }
        }
      }
      if (matched) anyMatch = true;
      if (listOnly && matched && src.name) out += src.name + '\n';
      else if (countOnly) out += (src.name ? src.name + ':' : '') + matched + '\n';
      else if (hits.length) out += hits.join('\n') + '\n';
    }
    return { stdout: out, stderr: '', code: anyMatch ? 0 : 1 };
  },

  find: ({ argv, shell }) => {
    let startArgs: string[] = [];
    const exprs: { kind: 'name' | 'type'; val: string }[] = [];
    let i = 1;
    while (i < argv.length) {
      const a = argv[i];
      if (a === '-name' && argv[i + 1]) { exprs.push({ kind: 'name', val: argv[++i] }); }
      else if (a === '-type' && argv[i + 1]) { exprs.push({ kind: 'type', val: argv[++i] }); }
      else if (!a.startsWith('-')) startArgs.push(a);
      else { /* unknown predicate — ignore */ }
      i++;
    }
    if (!startArgs.length) startArgs = ['.'];

    const matchName = (n: string, pat: string) => {
      // glob-ish: * → .*, ? → .
      const re = new RegExp('^' + pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
      return re.test(n);
    };

    let out = '';
    const walk = (abs: string, display: string) => {
      const node = getNode(shell.vfs, abs);
      if (!node) {
        out += `find: ${display}: No such file or directory\n`;
        return;
      }
      const check = (name: string, n: FSNode) => {
        for (const e of exprs) {
          if (e.kind === 'name' && !matchName(name, e.val)) return false;
          if (e.kind === 'type') {
            if (e.val === 'd' && n.type !== 'dir') return false;
            if (e.val === 'f' && n.type !== 'file') return false;
          }
        }
        return true;
      };
      if (check(basename(abs) || display, node)) out += display + '\n';
      if (node.type === 'dir') {
        for (const name of Object.keys(node.children).sort()) {
          walk(abs + '/' + name, display + '/' + name);
        }
      }
    };
    for (const s of startArgs) {
      const abs = resolvePath(shell.vfs.cwd, s, shell.vfs.home);
      walk(abs, s);
    }
    return ok(out);
  },

  tree: ({ argv, shell }) => {
    const { flags, rest } = parseFlags(argv, new Set(['-a', '-L', '-d']));
    let depth = Infinity;
    const idx = argv.indexOf('-L');
    if (idx !== -1 && argv[idx + 1]) {
      const n = parseInt(argv[idx + 1], 10);
      if (!Number.isNaN(n)) depth = n;
    }
    const showHidden = flags.has('-a');
    const dirsOnly = flags.has('-d');
    const start = rest.find(a => a !== argv[idx + 1]) ?? '.';
    const abs = resolvePath(shell.vfs.cwd, start, shell.vfs.home);
    const node = getNode(shell.vfs, abs);
    if (!node) return err(`${start}  [error opening dir]\n`);
    let out = start + '\n';
    let dirCount = 0, fileCount = 0;
    const walk = (n: FSNode, prefix: string, level: number) => {
      if (n.type !== 'dir' || level >= depth) return;
      const entries = Object.entries(n.children)
        .filter(([k]) => showHidden || !k.startsWith('.'))
        .filter(([, v]) => (dirsOnly ? v.type === 'dir' : true))
        .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      for (let i = 0; i < entries.length; i++) {
        const [name, child] = entries[i];
        const last = i === entries.length - 1;
        const branch = last ? '└── ' : '├── ';
        out += prefix + branch + name + (child.type === 'dir' ? '/' : '') + '\n';
        if (child.type === 'dir') {
          dirCount++;
          walk(child, prefix + (last ? '    ' : '│   '), level + 1);
        } else {
          fileCount++;
        }
      }
    };
    walk(node, '', 0);
    out += `\n${dirCount} director${dirCount === 1 ? 'y' : 'ies'}, ${fileCount} file${fileCount === 1 ? '' : 's'}\n`;
    return ok(out);
  },

  mkdir: ({ argv, shell }) => {
    const { flags, rest } = parseFlags(argv, new Set(['-p']));
    if (!rest.length) return err('mkdir: missing operand\n');
    let stderr = '';
    for (const p of rest) {
      const abs = resolvePath(shell.vfs.cwd, p, shell.vfs.home);
      try {
        vfsMkdir(shell.vfs, abs, { parents: flags.has('-p') });
      } catch (e) {
        const msg = e instanceof VfsError ? e.message : (e as Error).message;
        stderr += `mkdir: ${msg}\n`;
      }
    }
    return stderr ? err(stderr) : ok();
  },

  touch: ({ argv, shell }) => {
    const { rest } = parseFlags(argv, new Set());
    if (!rest.length) return err('touch: missing file operand\n');
    let stderr = '';
    for (const p of rest) {
      try {
        const abs = resolvePath(shell.vfs.cwd, p, shell.vfs.home);
        vfsTouch(shell.vfs, abs);
      } catch (e) {
        stderr += `touch: ${(e as Error).message}\n`;
      }
    }
    return stderr ? err(stderr) : ok();
  },

  rm: ({ argv, shell }) => {
    const { flags, rest } = parseFlags(argv, new Set(['-r', '-R', '-f', '-rf', '-fr']));
    const recursive = flags.has('-r') || flags.has('-R');
    const force = flags.has('-f');
    if (!rest.length && !force) return err('rm: missing operand\n');
    let stderr = '';
    for (const p of rest) {
      try {
        const abs = resolvePath(shell.vfs.cwd, p, shell.vfs.home);
        vfsRm(shell.vfs, abs, { recursive, force });
      } catch (e) {
        const msg = e instanceof VfsError ? e.message : (e as Error).message;
        stderr += `rm: ${msg}\n`;
      }
    }
    return stderr ? err(stderr) : ok();
  },

  mv: ({ argv, shell }) => {
    const { rest } = parseFlags(argv, new Set(['-f', '-n']));
    if (rest.length < 2) return err('mv: missing destination\n');
    const dst = rest[rest.length - 1];
    const sources = rest.slice(0, -1);
    const dstAbs = resolvePath(shell.vfs.cwd, dst, shell.vfs.home);
    const dstNode = getNode(shell.vfs, dstAbs);
    if (sources.length > 1 && (!dstNode || dstNode.type !== 'dir')) {
      return err(`mv: target '${dst}' is not a directory\n`);
    }
    let stderr = '';
    for (const s of sources) {
      try {
        const sa = resolvePath(shell.vfs.cwd, s, shell.vfs.home);
        vfsMove(shell.vfs, sa, dstAbs);
      } catch (e) {
        stderr += `mv: ${(e as Error).message}\n`;
      }
    }
    return stderr ? err(stderr) : ok();
  },

  cp: ({ argv, shell }) => {
    const { flags, rest } = parseFlags(argv, new Set(['-r', '-R', '-f']));
    if (rest.length < 2) return err('cp: missing destination\n');
    const recursive = flags.has('-r') || flags.has('-R');
    const dst = rest[rest.length - 1];
    const sources = rest.slice(0, -1);
    const dstAbs = resolvePath(shell.vfs.cwd, dst, shell.vfs.home);
    const dstNode = getNode(shell.vfs, dstAbs);
    if (sources.length > 1 && (!dstNode || dstNode.type !== 'dir')) {
      return err(`cp: target '${dst}' is not a directory\n`);
    }
    let stderr = '';
    for (const s of sources) {
      try {
        const sa = resolvePath(shell.vfs.cwd, s, shell.vfs.home);
        vfsCopy(shell.vfs, sa, dstAbs, { recursive });
      } catch (e) {
        stderr += `cp: ${(e as Error).message}\n`;
      }
    }
    return stderr ? err(stderr) : ok();
  },

  ln: ({ argv }) => {
    // No symlink semantics in our VFS — accept and silently warn.
    if (argv.includes('-s')) return err('ln: symbolic links not supported on this filesystem\n');
    return err('ln: hard links not supported on this filesystem\n');
  },

  stat: ({ argv, shell }) => {
    const { rest } = parseFlags(argv, new Set());
    if (!rest.length) return err('stat: missing operand\n');
    let out = '';
    let stderr = '';
    for (const p of rest) {
      const abs = resolvePath(shell.vfs.cwd, p, shell.vfs.home);
      const n = getNode(shell.vfs, abs);
      if (!n) { stderr += `stat: ${p}: No such file or directory\n`; continue; }
      out += `  File: ${p}\n`;
      out += `  Size: ${nodeSize(n)}\tType: ${n.type === 'dir' ? 'directory' : 'regular file'}\n`;
      out += `Access: (0644)  Uid: ( 501/akhileshw)  Gid: (  20/   staff)\n`;
      out += `Modify: ${new Date(n.mtime).toISOString()}\n`;
    }
    return stderr ? err(stderr, 1, out) : ok(out);
  },

  file: ({ argv, shell }) => {
    const { rest } = parseFlags(argv, new Set());
    if (!rest.length) return err('file: missing operand\n');
    let out = '';
    for (const p of rest) {
      const abs = resolvePath(shell.vfs.cwd, p, shell.vfs.home);
      const n = getNode(shell.vfs, abs);
      if (!n) { out += `${p}: cannot open (No such file or directory)\n`; continue; }
      if (n.type === 'dir') out += `${p}: directory\n`;
      else if (/^\s*</.test(n.content)) out += `${p}: HTML document text\n`;
      else if (/\bfunction\b|\bconst\b|=>/.test(n.content)) out += `${p}: JavaScript/TypeScript source, ASCII text\n`;
      else if (p.endsWith('.md')) out += `${p}: Markdown document, ASCII text\n`;
      else if (p.endsWith('.json')) out += `${p}: JSON data\n`;
      else out += `${p}: ASCII text\n`;
    }
    return ok(out);
  },

  du: ({ argv, shell }) => {
    const { flags, rest } = parseFlags(argv, new Set(['-h', '-s', '-a']));
    const target = rest[0] ?? '.';
    const abs = resolvePath(shell.vfs.cwd, target, shell.vfs.home);
    const node = getNode(shell.vfs, abs);
    if (!node) return err(`du: ${target}: No such file or directory\n`);
    const fmtSize = (n: number) => flags.has('-h') ? humanSize(n) : String(Math.ceil(n / 1024));
    if (flags.has('-s') || node.type === 'file') {
      return ok(`${fmtSize(nodeSize(node))}\t${target}\n`);
    }
    let out = '';
    const walk = (n: FSNode, display: string) => {
      if (n.type === 'dir') {
        for (const k of Object.keys(n.children).sort()) walk(n.children[k], display + '/' + k);
        out += `${fmtSize(nodeSize(n))}\t${display}\n`;
      } else if (flags.has('-a')) {
        out += `${fmtSize(nodeSize(n))}\t${display}\n`;
      }
    };
    walk(node, target);
    return ok(out);
  },

  df: ({ argv }) => {
    const { flags } = parseFlags(argv, new Set(['-h']));
    if (flags.has('-h')) {
      return ok(
        `Filesystem      Size   Used  Avail Capacity  Mounted on\n` +
        `/dev/disk0s1    160M   142M    18M    89%   /\n`
      );
    }
    return ok(
      `Filesystem    1024-blocks   Used Available Capacity Mounted on\n` +
      `/dev/disk0s1       163840 145408    18432     89%   /\n`
    );
  },

  env: ({ shell }) => {
    let out = '';
    for (const [k, v] of Object.entries(shell.env).sort()) out += `${k}=${v}\n`;
    return ok(out);
  },

  printenv: ({ argv, shell }) => {
    if (argv.length === 1) return COMMANDS.env({ argv, stdin: '', shell });
    let out = '';
    for (const k of argv.slice(1)) if (shell.env[k] != null) out += shell.env[k] + '\n';
    return ok(out);
  },

  export: ({ argv, shell }) => {
    if (argv.length === 1) return COMMANDS.env({ argv, stdin: '', shell });
    for (const a of argv.slice(1)) {
      const eq = a.indexOf('=');
      if (eq === -1) continue;
      shell.env[a.slice(0, eq)] = a.slice(eq + 1);
    }
    return ok();
  },

  unset: ({ argv, shell }) => {
    for (const k of argv.slice(1)) delete shell.env[k];
    return ok();
  },

  alias: ({ argv, shell }) => {
    if (argv.length === 1) {
      let out = '';
      for (const [k, v] of Object.entries(shell.aliases).sort()) out += `alias ${k}='${v}'\n`;
      return ok(out);
    }
    for (const a of argv.slice(1)) {
      const eq = a.indexOf('=');
      if (eq === -1) {
        const v = shell.aliases[a];
        if (v) return ok(`alias ${a}='${v}'\n`);
        return err(`alias: ${a}: not found\n`);
      }
      shell.aliases[a.slice(0, eq)] = a.slice(eq + 1).replace(/^['"]|['"]$/g, '');
    }
    return ok();
  },

  unalias: ({ argv, shell }) => {
    for (const k of argv.slice(1)) delete shell.aliases[k];
    return ok();
  },

  which: ({ argv, shell }) => {
    let out = '';
    let code = 0;
    for (const a of argv.slice(1)) {
      if (COMMANDS[a]) out += `/bin/${a}\n`;
      else if (shell.aliases[a]) out += `${a}: aliased to ${shell.aliases[a]}\n`;
      else { code = 1; }
    }
    return { stdout: out, stderr: '', code };
  },

  type: ({ argv, shell }) => {
    let out = '';
    for (const a of argv.slice(1)) {
      if (shell.aliases[a]) out += `${a} is aliased to \`${shell.aliases[a]}'\n`;
      else if (COMMANDS[a]) out += `${a} is a shell builtin\n`;
      else out += `${a}: not found\n`;
    }
    return ok(out);
  },

  history: ({ shell }) => {
    let out = '';
    shell.history.forEach((cmd, i) => {
      out += `${padLeft(String(i + 1), 5)}  ${cmd}\n`;
    });
    return ok(out);
  },

  exit: () => ok('logout\n'),
  logout: () => ok('logout\n'),

  reset: ({ shell }) => {
    // Caller (Terminal UI) detects this and reseeds the VFS.
    shell.env.__RESET__ = '1';
    return ok('Filesystem reset to factory state.\n');
  },

  man: ({ argv }) => {
    const name = argv[1];
    if (!name) return err('What manual page do you want?\n');
    const page = MAN_PAGES[name];
    if (!page) return err(`No manual entry for ${name}\n`);
    return ok(page);
  },

  open: ({ argv, shell }) => {
    const target = argv[1];
    if (!target) return err('open: missing operand\n');
    const abs = resolvePath(shell.vfs.cwd, target, shell.vfs.home);
    if (!exists(shell.vfs, abs)) return err(`open: ${target}: No such file or directory\n`);
    return ok(`(would open ${displayPath(abs, shell.vfs.home)} in Finder)\n`);
  },
};

function collectFiles(shell: ShellState, abs: string, display: string, out: { name: string; content: string }[]) {
  const n = getNode(shell.vfs, abs);
  if (!n) return;
  if (n.type === 'file') {
    out.push({ name: display, content: n.content });
    return;
  }
  for (const k of Object.keys(n.children).sort()) {
    collectFiles(shell, abs + '/' + k, display + '/' + k, out);
  }
}

function humanSize(n: number): string {
  if (n < 1024) return n + 'B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + 'K';
  if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + 'M';
  return (n / 1024 / 1024 / 1024).toFixed(1) + 'G';
}

const bootTime = Date.now();

const MAN_PAGES: Record<string, string> = {
  ls: 'NAME\n    ls — list directory contents\n\nSYNOPSIS\n    ls [-aAlF1] [file ...]\n\nDESCRIPTION\n    For each operand, ls displays its name and metadata.\n    -a   include entries starting with .\n    -l   long listing (mode, size, mtime)\n    -F   classify entries (append / to dirs)\n',
  cd: 'NAME\n    cd — change working directory\n\nSYNOPSIS\n    cd [dir]\n\n    No argument cds to $HOME. Use - to cd to previous (not implemented).\n',
  cat: 'NAME\n    cat — concatenate and print files\n\nSYNOPSIS\n    cat [file ...]\n',
  grep: 'NAME\n    grep — search text\n\nSYNOPSIS\n    grep [-inrvlc] pattern [file ...]\n\n    -i  case insensitive\n    -n  prefix line numbers\n    -r  recurse into directories\n    -v  invert\n    -l  list matching files\n    -c  count matches\n',
  find: 'NAME\n    find — walk a file hierarchy\n\nSYNOPSIS\n    find [path ...] [-name pat] [-type d|f]\n',
  tree: 'NAME\n    tree — list contents of directories in a tree-like format\n\nSYNOPSIS\n    tree [-a] [-d] [-L level] [path]\n',
  mkdir: 'NAME\n    mkdir — make directories\n\nSYNOPSIS\n    mkdir [-p] dir ...\n',
  rm: 'NAME\n    rm — remove files or directories\n\nSYNOPSIS\n    rm [-rRf] file ...\n',
  cp: 'NAME\n    cp — copy files\n\nSYNOPSIS\n    cp [-r] src ... dst\n',
  mv: 'NAME\n    mv — move/rename files\n\nSYNOPSIS\n    mv src ... dst\n',
  echo: 'NAME\n    echo — print arguments\n\nSYNOPSIS\n    echo [-n] [arg ...]\n',
  wc: 'NAME\n    wc — count lines, words, bytes\n\nSYNOPSIS\n    wc [-l] [-w] [-c] [file ...]\n',
  head: 'NAME\n    head — first lines of a file\n\nSYNOPSIS\n    head [-n N] [file ...]\n',
  tail: 'NAME\n    tail — last lines of a file\n\nSYNOPSIS\n    tail [-n N] [file ...]\n',
  man: 'NAME\n    man — display manual page\n\nSYNOPSIS\n    man command\n',
  bash: 'NAME\n    bash — Bourne-again shell (akhilesh build, very minimal)\n\nSEE ALSO\n    help, alias, history, export\n',
};

// ────────── completion ──────────

export function complete(input: string, shell: ShellState): { replaced: string; common: string; matches: string[] } {
  // Complete the trailing token.
  // Find the last whitespace boundary that's not inside quotes.
  const tail = input.match(/(\S*)$/)?.[1] ?? '';
  const head = input.slice(0, input.length - tail.length);
  const wordsBefore = head.trim().split(/\s+/).filter(Boolean);
  const isCommandPos = wordsBefore.length === 0 || /[;|]\s*$/.test(head);

  let candidates: string[] = [];
  let prefix = tail;
  let dir = shell.vfs.cwd;

  if (isCommandPos && !tail.includes('/') && !tail.startsWith('~') && !tail.startsWith('.')) {
    candidates = [...Object.keys(COMMANDS), ...Object.keys(shell.aliases)]
      .filter(c => c.startsWith(tail))
      .sort();
  } else {
    // Path completion
    const lastSlash = tail.lastIndexOf('/');
    if (lastSlash === -1) {
      prefix = tail;
    } else {
      const dirPart = tail.slice(0, lastSlash) || '/';
      prefix = tail.slice(lastSlash + 1);
      dir = resolvePath(shell.vfs.cwd, dirPart, shell.vfs.home);
    }
    const node = getNode(shell.vfs, dir);
    if (node && node.type === 'dir') {
      candidates = Object.keys(node.children)
        .filter(n => n.startsWith(prefix))
        .filter(n => prefix.startsWith('.') || !n.startsWith('.'))
        .map(n => {
          const c = node.children[n];
          return c.type === 'dir' ? n + '/' : n;
        })
        .sort();
    }
  }

  if (!candidates.length) return { replaced: input, common: '', matches: [] };

  // Compute longest common prefix of candidates
  let common = candidates[0];
  for (const c of candidates) {
    let i = 0;
    while (i < common.length && i < c.length && common[i] === c[i]) i++;
    common = common.slice(0, i);
  }

  if (candidates.length === 1) {
    const replaced = head + tail.slice(0, tail.length - prefix.length) + candidates[0];
    return { replaced, common: candidates[0], matches: candidates };
  }
  if (common.length > prefix.length) {
    const replaced = head + tail.slice(0, tail.length - prefix.length) + common;
    return { replaced, common, matches: candidates };
  }
  return { replaced: input, common, matches: candidates };
}

export function buildPrompt(shell: ShellState): string {
  return `${shell.user}@${shell.hostname}:${displayPath(shell.vfs.cwd, shell.vfs.home)} % `;
}

