import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { playStartup } from '../lib/sounds';

const TIPS = [
  'Tip: type `help` in Terminal to see what works.',
  'Tip: drag the bottom-right corner to resize any window.',
  'Tip: rotate the iPod click wheel with your mouse.',
  'Tip: hold ⌘ and tap N inside Finder for a new window.',
];

interface Props {
  onComplete: () => void;
}

export default function BootScreen({ onComplete }: Props) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading');
  const tipRef = useRef(TIPS[Math.floor(Math.random() * TIPS.length)]);

  useEffect(() => {
    const start = Date.now();
    const total = 1400;
    const id = window.setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / total) * 100);
      setProgress(p);
      if (p >= 100) {
        window.clearInterval(id);
        setPhase('ready');
      }
    }, 40);
    return () => window.clearInterval(id);
  }, []);

  const dismiss = () => {
    if (phase !== 'ready') {
      // Allow early dismiss but skip straight through
      setProgress(100);
      setPhase('ready');
    }
    playStartup();
    onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="absolute inset-0 desktop-pattern flex items-center justify-center"
      style={{ zIndex: 10000 }}
      onClick={dismiss}
      onKeyDown={dismiss}
      tabIndex={0}
    >
      <div
        className="chrome-outset window-shadow"
        style={{
          background: 'var(--plat-white)',
          padding: 24,
          minWidth: 340,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <HappyMac />
        <div
          style={{
            fontFamily: 'var(--font-chicago)',
            fontSize: 16,
            letterSpacing: '0.02em',
            color: 'var(--plat-900)',
          }}
        >
          Welcome to Macintosh.
        </div>

        <ProgressBar pct={progress} />

        <div
          style={{
            fontFamily: 'var(--font-chicago)',
            fontSize: 11,
            color: phase === 'ready' ? 'var(--plat-900)' : 'var(--plat-500)',
            transition: 'color 200ms',
            minHeight: 14,
          }}
        >
          {phase === 'ready' ? 'Click to begin' : 'Loading System extensions…'}
        </div>

        <div
          style={{
            fontFamily: 'var(--font-geneva)',
            fontSize: 10,
            color: 'var(--plat-600)',
            textAlign: 'center',
            maxWidth: 280,
            marginTop: 4,
          }}
        >
          {tipRef.current}
        </div>
      </div>
    </motion.div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div
      className="chrome-inset"
      style={{
        width: 240,
        height: 14,
        background: 'var(--plat-white)',
        padding: 1,
        position: 'relative',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background:
            'repeating-linear-gradient(45deg, var(--plat-700) 0 3px, var(--plat-900) 3px 6px)',
          transition: 'width 40ms linear',
        }}
      />
    </div>
  );
}

// Pixel-art Happy Mac on a 32×32 grid, scaled up via CSS.
function HappyMac() {
  const B = 'var(--plat-900)';
  const G = 'var(--plat-200)';
  const W = '#ffffff';
  const SCR_BG = '#cdd6c0';
  return (
    <svg
      viewBox="0 0 32 32"
      width={84}
      height={84}
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated', display: 'block' }}
    >
      {/* Outer body */}
      <rect x="5" y="2" width="22" height="25" fill={B} />
      <rect x="6" y="3" width="20" height="23" fill={G} />
      <rect x="7" y="4" width="18" height="21" fill={W} />

      {/* Screen frame */}
      <rect x="8" y="5" width="16" height="13" fill={B} />
      <rect x="9" y="6" width="14" height="11" fill={SCR_BG} />

      {/* Eyes */}
      <rect x="12" y="9" width="2" height="2" fill={B} />
      <rect x="18" y="9" width="2" height="2" fill={B} />

      {/* Smile */}
      <rect x="13" y="13" width="6" height="1" fill={B} />
      <rect x="12" y="12" width="1" height="1" fill={B} />
      <rect x="19" y="12" width="1" height="1" fill={B} />

      {/* Floppy slot */}
      <rect x="11" y="20" width="10" height="1" fill={B} />
      <rect x="11" y="22" width="4" height="1" fill={B} />

      {/* Base/foot */}
      <rect x="7" y="27" width="18" height="2" fill={B} />
      <rect x="8" y="28" width="16" height="1" fill={G} />
      <rect x="9" y="29" width="14" height="1" fill={B} />
    </svg>
  );
}
