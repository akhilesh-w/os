import { useState, useRef, useEffect, useMemo, type KeyboardEvent } from 'react';
import { loadVFS, saveVFS, clearStoredVFS, type VFS } from '../lib/vfs';
import { buildSeedVFS, SEED_VERSION, ensureCwdValid } from '../lib/vfsSeed';
import { buildPrompt, complete, makeShell, runLine, type ShellState } from '../lib/shell';

interface Block {
  prompt: string;
  cmd: string;
  output: string;
}

function bootShell(): ShellState {
  const stored = loadVFS(SEED_VERSION);
  let vfs: VFS;
  if (stored) {
    vfs = { root: stored.root, cwd: stored.cwd, home: '/Users/akhileshw' };
    ensureCwdValid(vfs);
  } else {
    vfs = buildSeedVFS();
  }
  return makeShell(vfs);
}

const BANNER = `Last login: ${new Date().toString().slice(0, 24)} on ttys000
Welcome to Macintosh — bash 1.0 (akhilesh build)
Type \`help\` for built-ins, or \`ls\` to start exploring.
`;

export default function Terminal() {
  const shellRef = useRef<ShellState | null>(null);
  if (shellRef.current === null) shellRef.current = bootShell();
  const shell = shellRef.current;

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [input, setInput] = useState('');
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [completionPreview, setCompletionPreview] = useState<string>('');

  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const prompt = useMemo(() => buildPrompt(shell), [shell, blocks]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [blocks, completionPreview]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const persist = () => saveVFS(shell.vfs, SEED_VERSION);

  const runCommand = (cmd: string) => {
    const promptStr = buildPrompt(shell);
    if (!cmd.trim()) {
      setBlocks(b => [...b, { prompt: promptStr, cmd: '', output: '' }]);
      return;
    }
    let output = runLine(cmd, shell);

    // Special-case: clear → wipe scrollback
    if (output.includes('\x0c')) {
      setBlocks([]);
      return;
    }

    // Special-case: reset → reseed VFS
    if (shell.env.__RESET__) {
      delete shell.env.__RESET__;
      clearStoredVFS();
      shell.vfs = buildSeedVFS();
      output += 'Reseeded ~/site from build.\n';
    }

    setBlocks(b => [...b, { prompt: promptStr, cmd, output }]);
    persist();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = input;
      setInput('');
      setHistoryIdx(-1);
      setCompletionPreview('');
      runCommand(cmd);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const h = shell.history;
      if (!h.length) return;
      const next = Math.min(historyIdx + 1, h.length - 1);
      setHistoryIdx(next);
      setInput(h[h.length - 1 - next] ?? '');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const h = shell.history;
      const next = Math.max(historyIdx - 1, -1);
      setHistoryIdx(next);
      setInput(next === -1 ? '' : h[h.length - 1 - next] ?? '');
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const res = complete(input, shell);
      if (res.matches.length === 1) {
        setInput(res.replaced + (res.replaced.endsWith('/') ? '' : ' '));
        setCompletionPreview('');
      } else if (res.matches.length > 1) {
        setInput(res.replaced);
        setCompletionPreview(res.matches.join('  '));
      }
      return;
    }
    if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setBlocks([]);
      return;
    }
    if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      setBlocks(b => [...b, { prompt: buildPrompt(shell), cmd: input + '^C', output: '' }]);
      setInput('');
      return;
    }
    if (e.key === 'u' && e.ctrlKey) {
      e.preventDefault();
      setInput('');
      return;
    }
    setCompletionPreview('');
  };

  return (
    <div
      className="h-full flex flex-col cursor-text"
      style={{
        background: '#1d1f21',
        color: '#d8d8d8',
        fontFamily: 'var(--font-monaco)',
        fontSize: 18,
        lineHeight: 1.1,
        padding: '6px 8px',
      }}
      onClick={() => inputRef.current?.focus()}
    >
      <div ref={scrollerRef} className="flex-1 overflow-auto">
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-monaco)',
            fontSize: 18,
            color: '#a8a8a8',
            margin: 0,
            marginBottom: 6,
          }}
        >
          {BANNER}
        </pre>

        {blocks.map((b, i) => (
          <div key={i}>
            <div>
              <span style={{ color: '#a8a8a8' }}>{b.prompt}</span>
              <span style={{ color: '#ffffff' }}>{b.cmd}</span>
            </div>
            {b.output && (
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-monaco)',
                  fontSize: 18,
                  color: '#d8d8d8',
                  margin: 0,
                }}
              >
                {b.output}
              </pre>
            )}
          </div>
        ))}

        {completionPreview && (
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--font-monaco)',
              fontSize: 18,
              color: '#888888',
              margin: 0,
            }}
          >
            {completionPreview}
          </pre>
        )}

        <div className="flex">
          <span style={{ color: '#a8a8a8', whiteSpace: 'pre' }}>{prompt}</span>
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            style={{
              color: '#ffffff',
              fontFamily: 'var(--font-monaco)',
              fontSize: 18,
              caretColor: '#d8d8d8',
            }}
          />
        </div>
      </div>
    </div>
  );
}
