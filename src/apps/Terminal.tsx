import { useState, useRef, useEffect, type KeyboardEvent } from 'react';

interface HistoryEntry {
  type: 'input' | 'output';
  content: string;
}

const COMMANDS: Record<string, (args: string[]) => string> = {
  help: () => `Available commands:
  about      Learn about Akhilesh
  projects   View projects
  contact    Get in touch
  whoami     Print user
  ls         List directory
  pwd        Print working directory
  date       Print current date
  clear      Clear the terminal
  help       Show this help`,

  about: () => `Akhilesh Waghmare
=================
Coder, storyteller, explorer of ideas —
stitching together software, stories,
systems, and curiosity.

Currently building things that matter.`,

  projects: () => `Projects:
[1] akhileshw.xyz          Personal site (Next.js)
[2] dotfiles               Arch Linux setup
[3] log                    Canvas for thoughts
[4] sites                  Garden of random projects
[5] gemini-design-plugin   Gemini CLI UI extension
[6] epoch                  Goal/task tracking app

-> github.com/akhilesh-w`,

  contact: () => `Email    hey@akhileshw.xyz
GitHub   github.com/akhilesh-w
Twitter  @theakhileshw`,

  whoami: () => `akhileshw`,
  ls: () => `about.txt   projects/   contact.txt   README.md`,
  pwd: () => `/home/akhileshw`,
  date: () => new Date().toString(),
  echo: (args) => args.join(' '),
};

const WELCOME = `Welcome to Terminal.
Macintosh 7.5.3 — bash 1.0
Type 'help' for available commands.
`;

export default function Terminal() {
  const [history, setHistory] = useState<HistoryEntry[]>([{ type: 'output', content: WELCOME }]);
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [cmdHistoryIdx, setCmdHistoryIdx] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSubmit = () => {
    const cmd = input.trim();
    if (!cmd) return;
    const newHistory: HistoryEntry[] = [...history, { type: 'input', content: cmd }];

    if (cmd === 'clear') {
      setHistory([{ type: 'output', content: WELCOME }]);
      setInput('');
      setCmdHistory(prev => [cmd, ...prev]);
      setCmdHistoryIdx(-1);
      return;
    }

    const [cmdName, ...args] = cmd.split(/\s+/);
    const handler = COMMANDS[cmdName.toLowerCase()];
    const output = handler ? handler(args) : `bash: ${cmdName}: command not found`;
    if (output) newHistory.push({ type: 'output', content: output });

    setHistory(newHistory);
    setInput('');
    setCmdHistory(prev => [cmd, ...prev]);
    setCmdHistoryIdx(-1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') return handleSubmit();
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = Math.min(cmdHistoryIdx + 1, cmdHistory.length - 1);
      setCmdHistoryIdx(idx);
      setInput(cmdHistory[idx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = Math.max(cmdHistoryIdx - 1, -1);
      setCmdHistoryIdx(idx);
      setInput(idx === -1 ? '' : cmdHistory[idx]);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const match = Object.keys(COMMANDS).find(k => k.startsWith(input));
      if (match) setInput(match);
    }
  };

  return (
    <div
      className="h-full flex flex-col cursor-text"
      style={{
        background: '#000000',
        color: '#33ff66',
        fontFamily: 'var(--font-monaco)',
        fontSize: 18,
        lineHeight: 1.1,
        padding: '6px 8px',
      }}
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex-1 overflow-auto">
        {history.map((entry, i) =>
          entry.type === 'input' ? (
            <div key={i}>
              <span style={{ color: '#33ff66' }}>akhileshw % </span>
              <span style={{ color: '#ffffff' }}>{entry.content}</span>
            </div>
          ) : (
            <pre
              key={i}
              style={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'var(--font-monaco)',
                fontSize: 18,
                color: '#33ff66',
                margin: 0,
                marginBottom: 6,
              }}
            >
              {entry.content}
            </pre>
          )
        )}

        <div className="flex">
          <span style={{ color: '#33ff66' }}>akhileshw % </span>
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
              caretColor: '#33ff66',
            }}
          />
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
