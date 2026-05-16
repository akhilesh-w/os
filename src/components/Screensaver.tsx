import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  onDismiss: () => void;
}

const STAR_COUNT = 320;

interface Star {
  x: number; // normalized -1..1
  y: number;
  z: number; // depth, 1 (far) → 0 (close)
  pz: number; // previous z for trails
}

export default function Screensaver({ onDismiss }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [now, setNow] = useState(() => new Date());
  const [clockPos, setClockPos] = useState({ x: 0.5, y: 0.5 });

  // Clock tick
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Slow drift for the clock — bounces off edges After-Dark-style
  useEffect(() => {
    let raf = 0;
    let x = 0.5, y = 0.5;
    let vx = 0.00035, vy = 0.00024;
    let lastT = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(60, t - lastT);
      lastT = t;
      x += vx * dt;
      y += vy * dt;
      if (x < 0.1) { x = 0.1; vx = Math.abs(vx); }
      if (x > 0.9) { x = 0.9; vx = -Math.abs(vx); }
      if (y < 0.15) { y = 0.15; vy = Math.abs(vy); }
      if (y > 0.85) { y = 0.85; vy = -Math.abs(vy); }
      setClockPos({ x, y });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Starfield
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
    };
    resize();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const stars: Star[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: Math.random(),
        pz: 0,
      });
    }

    let raf = 0;
    const tick = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      for (const s of stars) {
        s.pz = s.z;
        s.z -= 0.0022;
        if (s.z <= 0.01) {
          s.x = (Math.random() - 0.5) * 2;
          s.y = (Math.random() - 0.5) * 2;
          s.z = 1;
          s.pz = 1;
        }
        const sx = (s.x / s.z) * cx + cx;
        const sy = (s.y / s.z) * cy + cy;
        const psx = (s.x / s.pz) * cx + cx;
        const psy = (s.y / s.pz) * cy + cy;
        const brightness = Math.min(1, 1 - s.z);
        const size = Math.max(0.6, brightness * 2.5);
        ctx.strokeStyle = `rgba(255,255,255,${brightness})`;
        ctx.beginPath();
        ctx.moveTo(psx, psy);
        ctx.lineTo(sx, sy);
        ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${brightness})`;
        ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      resize();
      ctx.scale(dpr, dpr);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Dismiss on any input
  useEffect(() => {
    const dismiss = (e: Event) => {
      e.preventDefault();
      onDismiss();
    };
    window.addEventListener('mousedown', dismiss);
    window.addEventListener('keydown', dismiss);
    window.addEventListener('touchstart', dismiss);
    window.addEventListener('wheel', dismiss);
    return () => {
      window.removeEventListener('mousedown', dismiss);
      window.removeEventListener('keydown', dismiss);
      window.removeEventListener('touchstart', dismiss);
      window.removeEventListener('wheel', dismiss);
    };
  }, [onDismiss]);

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const date = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: '#000',
        cursor: 'none',
        overflow: 'hidden',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      <div
        style={{
          position: 'absolute',
          left: `${clockPos.x * 100}%`,
          top: `${clockPos.y * 100}%`,
          transform: 'translate(-50%, -50%)',
          fontFamily: 'var(--font-monaco)',
          color: 'rgba(255,255,255,0.92)',
          textShadow: '0 0 12px rgba(180,200,255,0.45)',
          textAlign: 'center',
          letterSpacing: '0.04em',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontSize: 96, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {hh}:{mm}
        </div>
        <div style={{ fontFamily: 'var(--font-chicago)', fontSize: 14, marginTop: 8, opacity: 0.7 }}>
          {date}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-chicago)',
            fontSize: 11,
            marginTop: 18,
            opacity: 0.35,
            letterSpacing: '0.12em',
          }}
        >
          PRESS ANY KEY TO WAKE
        </div>
      </div>
    </motion.div>
  );
}
