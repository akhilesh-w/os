import { useCallback, useEffect, useState } from 'react';

type Op = '+' | '−' | '×' | '÷';

/**
 * Classic Mac Calculator — LCD readout + 4×5 grid of platinum chrome
 * buttons. Operator state machine mirrors a physical pocket calculator:
 * pressing an operator displays the result of the pending operation (so
 * 2 + 3 + shows 5), pressing equals applies the pending op once.
 */
export default function Calculator() {
  const [display, setDisplay] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [pendingOp, setPendingOp] = useState<Op | null>(null);
  const [justEvaluated, setJustEvaluated] = useState(false);

  const pressDigit = useCallback(
    (d: string) => {
      setDisplay(prev => {
        if (justEvaluated) {
          setJustEvaluated(false);
          return d;
        }
        if (prev === '0' && d !== '.') return d;
        if (d === '.' && prev.includes('.')) return prev;
        if (prev.replace(/[-.]/g, '').length >= 12) return prev;
        return prev + d;
      });
      // Once the user starts a new number after an operator, the next digit
      // should replace the displayed previous operand.
      if (pendingOp && acc !== null && !justEvaluated) {
        setDisplay(d === '.' ? '0.' : d);
      }
    },
    [pendingOp, acc, justEvaluated]
  );

  const clearAll = useCallback(() => {
    setDisplay('0');
    setAcc(null);
    setPendingOp(null);
    setJustEvaluated(false);
  }, []);

  const toggleSign = useCallback(() => {
    setDisplay(d => (d.startsWith('-') ? d.slice(1) : d === '0' ? d : '-' + d));
  }, []);

  const percent = useCallback(() => {
    setDisplay(d => formatNumber(parseFloat(d) / 100));
  }, []);

  const applyOp = useCallback((a: number, b: number, op: Op): number => {
    switch (op) {
      case '+': return a + b;
      case '−': return a - b;
      case '×': return a * b;
      case '÷': return b === 0 ? NaN : a / b;
    }
  }, []);

  const pressOp = useCallback(
    (op: Op) => {
      const current = parseFloat(display);
      if (acc === null) {
        setAcc(current);
      } else if (pendingOp && !justEvaluated) {
        const result = applyOp(acc, current, pendingOp);
        setAcc(result);
        setDisplay(formatNumber(result));
      }
      setPendingOp(op);
      setJustEvaluated(true);
    },
    [display, acc, pendingOp, justEvaluated, applyOp]
  );

  const pressEquals = useCallback(() => {
    if (pendingOp == null || acc == null) return;
    const current = parseFloat(display);
    const result = applyOp(acc, current, pendingOp);
    setDisplay(formatNumber(result));
    setAcc(result);
    setPendingOp(null);
    setJustEvaluated(true);
  }, [pendingOp, acc, display, applyOp]);

  // Keyboard input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (/^[0-9]$/.test(k)) {
        e.preventDefault();
        pressDigit(k);
      } else if (k === '.') {
        e.preventDefault();
        pressDigit('.');
      } else if (k === '+') {
        e.preventDefault();
        pressOp('+');
      } else if (k === '-') {
        e.preventDefault();
        pressOp('−');
      } else if (k === '*') {
        e.preventDefault();
        pressOp('×');
      } else if (k === '/') {
        e.preventDefault();
        pressOp('÷');
      } else if (k === 'Enter' || k === '=') {
        e.preventDefault();
        pressEquals();
      } else if (k === 'Escape' || k === 'c' || k === 'C') {
        e.preventDefault();
        clearAll();
      } else if (k === 'Backspace') {
        e.preventDefault();
        setDisplay(d => (d.length <= 1 || (d.length === 2 && d.startsWith('-')) ? '0' : d.slice(0, -1)));
      } else if (k === '%') {
        e.preventDefault();
        percent();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pressDigit, pressOp, pressEquals, clearAll, percent]);

  return (
    <div
      style={{
        height: '100%',
        background: 'var(--plat-200)',
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        fontFamily: 'var(--font-chicago)',
      }}
    >
      {/* LCD */}
      <div
        className="chrome-inset"
        style={{
          background: '#c7d3b7',
          color: '#1a2410',
          padding: '8px 12px',
          fontFamily: 'var(--font-monaco)',
          fontSize: 28,
          textAlign: 'right',
          letterSpacing: '0.04em',
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            maxWidth: '100%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {display}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridAutoRows: '1fr',
          gap: 6,
          flex: 1,
        }}
      >
        <KeyButton kind="util" onClick={clearAll}>C</KeyButton>
        <KeyButton kind="util" onClick={toggleSign}>±</KeyButton>
        <KeyButton kind="util" onClick={percent}>%</KeyButton>
        <KeyButton kind="op" active={pendingOp === '÷' && justEvaluated} onClick={() => pressOp('÷')}>÷</KeyButton>

        <KeyButton onClick={() => pressDigit('7')}>7</KeyButton>
        <KeyButton onClick={() => pressDigit('8')}>8</KeyButton>
        <KeyButton onClick={() => pressDigit('9')}>9</KeyButton>
        <KeyButton kind="op" active={pendingOp === '×' && justEvaluated} onClick={() => pressOp('×')}>×</KeyButton>

        <KeyButton onClick={() => pressDigit('4')}>4</KeyButton>
        <KeyButton onClick={() => pressDigit('5')}>5</KeyButton>
        <KeyButton onClick={() => pressDigit('6')}>6</KeyButton>
        <KeyButton kind="op" active={pendingOp === '−' && justEvaluated} onClick={() => pressOp('−')}>−</KeyButton>

        <KeyButton onClick={() => pressDigit('1')}>1</KeyButton>
        <KeyButton onClick={() => pressDigit('2')}>2</KeyButton>
        <KeyButton onClick={() => pressDigit('3')}>3</KeyButton>
        <KeyButton kind="op" active={pendingOp === '+' && justEvaluated} onClick={() => pressOp('+')}>+</KeyButton>

        <KeyButton wide onClick={() => pressDigit('0')}>0</KeyButton>
        <KeyButton onClick={() => pressDigit('.')}>.</KeyButton>
        <KeyButton kind="op" onClick={pressEquals}>=</KeyButton>
      </div>
    </div>
  );
}

function KeyButton({
  children,
  onClick,
  kind = 'digit',
  active = false,
  wide = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  kind?: 'digit' | 'op' | 'util';
  active?: boolean;
  wide?: boolean;
}) {
  const bg =
    kind === 'op'
      ? active
        ? 'var(--plat-700)'
        : 'var(--plat-300)'
      : kind === 'util'
      ? 'var(--plat-100)'
      : 'var(--plat-200)';
  const color = kind === 'op' && active ? 'var(--plat-white)' : 'var(--plat-900)';
  return (
    <button
      className="chrome-outset"
      onClick={onClick}
      style={{
        gridColumn: wide ? 'span 2' : undefined,
        background: bg,
        color,
        fontFamily: 'var(--font-chicago)',
        fontSize: 18,
        cursor: 'pointer',
        padding: 0,
      }}
      onMouseDown={e => {
        e.currentTarget.classList.remove('chrome-outset');
        e.currentTarget.classList.add('chrome-inset');
      }}
      onMouseUp={e => {
        e.currentTarget.classList.remove('chrome-inset');
        e.currentTarget.classList.add('chrome-outset');
      }}
      onMouseLeave={e => {
        e.currentTarget.classList.remove('chrome-inset');
        e.currentTarget.classList.add('chrome-outset');
      }}
    >
      {children}
    </button>
  );
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return 'Error';
  if (Object.is(n, -0)) return '0';
  // Trim very long floats; up to 12 significant digits like the original Calculator.
  if (Math.abs(n) >= 1e12) return n.toExponential(6);
  const fixed = Math.round(n * 1e10) / 1e10;
  let s = String(fixed);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}
