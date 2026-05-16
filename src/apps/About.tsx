import { useEffect, useMemo, useState } from 'react';
import { useWindowStore } from '../store/windowStore';
import { APPS_BY_ID } from './registry';

// Faux RAM allocations per app — Mac OS 8 sizes (small numbers).
const APP_RAM_MB: Record<string, number> = {
  finder: 3.0,
  terminal: 6.4,
  music: 4.2,
  controls: 2.8,
  launcher: 1.6,
  'text-edit': 5.0,
  about: 1.5,
};
const DEFAULT_APP_RAM = 3.2;
const SYSTEM_RAM_MB = 8.5;
const TOTAL_RAM_MB = 32;

export default function About() {
  const windows = useWindowStore(s => s.windows);
  const openWindow = useWindowStore(s => s.openWindow);

  const [uptime, setUptime] = useState(() => Math.floor((Date.now() - bootTime) / 1000));
  useEffect(() => {
    const id = window.setInterval(
      () => setUptime(Math.floor((Date.now() - bootTime) / 1000)),
      1000
    );
    return () => window.clearInterval(id);
  }, []);

  // Unique open-app rows for the bar chart.
  const rows = useMemo(() => {
    const seen = new Set<string>();
    const apps: { id: string; name: string; ram: number }[] = [];
    for (const w of windows) {
      if (seen.has(w.appId)) continue;
      seen.add(w.appId);
      const app = APPS_BY_ID[w.appId];
      apps.push({
        id: w.appId,
        name: app?.name ?? w.appId,
        ram: APP_RAM_MB[w.appId] ?? DEFAULT_APP_RAM,
      });
    }
    return apps;
  }, [windows]);

  const inUse = rows.reduce((acc, r) => acc + r.ram, SYSTEM_RAM_MB);
  const largestUnused = Math.max(0, TOTAL_RAM_MB - inUse);

  return (
    <div
      className="h-full overflow-auto"
      style={{
        background: 'var(--plat-white)',
        fontFamily: 'var(--font-chicago)',
        fontSize: 12,
        color: 'var(--plat-900)',
        padding: '14px 16px',
      }}
    >
      {/* Top: two columns — logo on the left, facts on the right */}
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
        {/* Left column */}
        <div style={{ width: 92, flexShrink: 0, textAlign: 'center', paddingTop: 4 }}>
          <RainbowApple size={48} />
          <div
            style={{
              fontFamily: 'var(--font-chicago)',
              fontSize: 16,
              marginTop: 6,
              lineHeight: 1,
              letterSpacing: '0.02em',
            }}
          >
            Macintosh
          </div>
          <div
            style={{
              fontFamily: 'var(--font-chicago)',
              fontSize: 12,
              marginTop: 2,
              color: 'var(--plat-700)',
            }}
          >
            8.1
          </div>
        </div>

        {/* Right column */}
        <div style={{ flex: 1, minWidth: 0, fontSize: 11.5, lineHeight: 1.55 }}>
          <Fact k="Built-in Memory" v={`${TOTAL_RAM_MB} MB`} />
          <Fact k="Virtual Memory" v="Off" />
          <Fact k="Largest Unused Block" v={`${largestUnused.toFixed(1)} MB`} />

          <div style={{ height: 8 }} />

          <div style={{ fontSize: 11, color: 'var(--plat-700)' }}>
            © Akhilesh Waghmare. 2024–2026
          </div>
          <button
            onClick={() => window.open('https://github.com/akhilesh-w/os.akhileshw.xyz', '_blank', 'noopener,noreferrer')}
            style={linkStyle}
          >
            View Source
          </button>
          <button
            onClick={() => openWindow('text-edit', { windowKey: 'colophon', slug: 'colophon' })}
            style={linkStyle}
          >
            Read Colophon
          </button>
        </div>
      </div>

      {/* Memory bars */}
      <div
        style={{
          marginTop: 14,
          paddingTop: 10,
          borderTop: '1px solid var(--plat-300)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <MemRow name="System" ram={SYSTEM_RAM_MB} total={TOTAL_RAM_MB} />
        {rows.map(r => (
          <MemRow key={r.id} name={r.name} ram={r.ram} total={TOTAL_RAM_MB} />
        ))}
      </div>

      <div
        style={{
          fontSize: 10,
          color: 'var(--plat-500)',
          textAlign: 'right',
          marginTop: 10,
        }}
      >
        Uptime {fmtUptime(uptime)}
      </div>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  display: 'block',
  background: 'transparent',
  border: 'none',
  padding: 0,
  margin: '2px 0 0',
  fontFamily: 'var(--font-chicago)',
  fontSize: 12,
  color: 'var(--plat-select)',
  textDecoration: 'underline',
  cursor: 'pointer',
  textAlign: 'left',
};

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <span style={{ color: 'var(--plat-700)' }}>{k}:</span>
      <span>{v}</span>
    </div>
  );
}

function MemRow({ name, ram, total }: { name: string; ram: number; total: number }) {
  const pct = Math.min(100, (ram / total) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
      <span
        style={{
          width: 92,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
      >
        {name}
      </span>
      <span
        style={{
          width: 50,
          fontFamily: 'var(--font-monaco)',
          fontSize: 13,
          color: 'var(--plat-700)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {ram.toFixed(1)} MB
      </span>
      <div
        className="chrome-inset"
        style={{
          flex: 1,
          height: 9,
          background: 'var(--plat-white)',
          padding: 1,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background:
              'repeating-linear-gradient(90deg, #3a7cd9 0 2px, #5a96e3 2px 4px)',
          }}
        />
      </div>
    </div>
  );
}

function fmtUptime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const bootTime = Date.now();

function RainbowApple({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 14 17" width={size * (14 / 17)} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="aboutAppleStripes" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5fb95e" />
          <stop offset="16.66%" stopColor="#5fb95e" />
          <stop offset="16.66%" stopColor="#fdd03a" />
          <stop offset="33.33%" stopColor="#fdd03a" />
          <stop offset="33.33%" stopColor="#f08a3c" />
          <stop offset="50%" stopColor="#f08a3c" />
          <stop offset="50%" stopColor="#e8423b" />
          <stop offset="66.66%" stopColor="#e8423b" />
          <stop offset="66.66%" stopColor="#a93a92" />
          <stop offset="83.33%" stopColor="#a93a92" />
          <stop offset="83.33%" stopColor="#3a7cd9" />
          <stop offset="100%" stopColor="#3a7cd9" />
        </linearGradient>
      </defs>
      <path
        fill="url(#aboutAppleStripes)"
        d="M11.624 8.964c-.02-2.155 1.76-3.187 1.84-3.238-1.001-1.464-2.56-1.664-3.115-1.687-1.327-.134-2.59.781-3.265.781-.674 0-1.715-.761-2.82-.74-1.45.021-2.788.842-3.534 2.139-1.506 2.61-.385 6.474 1.084 8.595.717 1.038 1.572 2.205 2.694 2.163 1.08-.044 1.488-.7 2.795-.7 1.305 0 1.674.7 2.819.677 1.164-.02 1.901-1.06 2.61-2.103.823-1.207 1.163-2.376 1.183-2.436-.026-.011-2.27-.872-2.291-3.45zM9.5 2.667c.598-.724 1-1.728.89-2.732-.86.035-1.901.572-2.518 1.293-.553.641-1.038 1.665-.91 2.65.96.074 1.939-.488 2.538-1.211z"
      />
    </svg>
  );
}
