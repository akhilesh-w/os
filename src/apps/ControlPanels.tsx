import { useState } from 'react';
import { WALLPAPERS, useWallpaperStore } from '../store/wallpaperStore';
import { useSoundStore } from '../store/soundStore';
import { useThemeStore } from '../store/themeStore';
import { THEMES, getTheme } from '../lib/themes';
import { playClick, playBeep, playOpen, playClose, playStartup } from '../lib/sounds';
import PixelIcon from '../components/PixelIcon';

type Panel = 'appearance' | 'sound' | 'about';

interface PanelEntry {
  id: Panel;
  name: string;
  icon: string;
}

const PANELS: PanelEntry[] = [
  { id: 'appearance', name: 'Appearance', icon: 'controls' },
  { id: 'sound', name: 'Sound', icon: 'speaker' },
  { id: 'about', name: 'About This Mac', icon: 'macHD' },
];

/**
 * Gear list mirrors akhileshw.xyz/uses. Update both together when
 * the user swaps a piece of hardware.
 */
const GEAR: { section: string; rows: { label: string; value: string }[] }[] = [
  {
    section: 'Hardware',
    rows: [
      { label: 'Laptop', value: 'MacBook Pro M5 Pro 14"' },
      { label: '2nd Laptop', value: 'Lenovo IdeaPad Gaming 3 (Arch)' },
      { label: 'Old Laptop', value: 'ThinkPad T440s' },
      { label: 'Monitor', value: 'Dell S2725QC 27" 4K' },
      { label: 'Phone', value: 'Xiaomi' },
      { label: '2nd Phone', value: 'Pocofone (LineageOS)' },
      { label: 'Headphones', value: 'Sony WH-CH720N' },
      { label: 'Mouse', value: 'Logitech G304' },
      { label: 'Keyboard', value: 'Redragon K617' },
    ],
  },
  {
    section: 'Software',
    rows: [
      { label: 'Notes', value: 'Logseq' },
      { label: 'Editor', value: 'Zed · Neovim' },
      { label: 'Terminal', value: 'Ghostty · Tmux' },
      { label: 'Browser', value: 'Brave · Arc' },
      { label: 'Email', value: 'Proton Mail' },
      { label: 'Music', value: 'Spotify' },
    ],
  },
];

export default function ControlPanels() {
  const [panel, setPanel] = useState<Panel>('appearance');

  return (
    <div
      className="h-full flex"
      style={{
        background: 'var(--plat-white)',
        fontFamily: 'var(--font-chicago)',
        fontSize: 12,
        color: 'var(--plat-900)',
      }}
    >
      <div
        style={{
          width: 132,
          background: 'var(--plat-50)',
          borderRight: '1px solid var(--plat-900)',
          flexShrink: 0,
          padding: '4px 0',
        }}
      >
        {PANELS.map(p => {
          const sel = panel === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPanel(p.id)}
              style={{
                display: 'flex',
                width: '100%',
                alignItems: 'center',
                gap: 8,
                padding: '4px 8px',
                background: sel ? 'var(--plat-select)' : 'transparent',
                color: sel ? 'var(--plat-select-fg)' : 'var(--plat-900)',
                border: 'none',
                textAlign: 'left',
                fontFamily: 'inherit',
                fontSize: 12,
                cursor: 'default',
              }}
            >
              <PixelIcon
                name={p.icon}
                size={16}
                style={sel ? { filter: 'invert(1)' } : undefined}
              />
              <span>{p.name}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto" style={{ padding: 14 }}>
        {panel === 'appearance' && <AppearancePanel />}
        {panel === 'sound' && <SoundPanel />}
        {panel === 'about' && <AboutMacPanel />}
      </div>
    </div>
  );
}

function AppearancePanel() {
  const currentId = useWallpaperStore(s => s.currentId);
  const setCurrent = useWallpaperStore(s => s.setCurrent);
  const themeId = useThemeStore(s => s.currentId);
  const setTheme = useThemeStore(s => s.setCurrent);
  return (
    <div className="flex flex-col gap-4">
      <PanelTitle>Theme</PanelTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {THEMES.map(t => {
          const sel = themeId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={sel ? 'chrome-inset' : 'chrome-outset'}
              style={{
                background: sel ? 'var(--plat-100)' : 'var(--plat-200)',
                padding: 8,
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                cursor: 'default',
                fontFamily: 'inherit',
              }}
              aria-pressed={sel}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--plat-900)' }}>
                {t.name}
              </span>
              <span style={{ fontSize: 10, color: 'var(--plat-700)', lineHeight: 1.3 }}>
                {t.description}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: 'var(--plat-600)', marginTop: -2 }}>
        Selecting a theme also snaps the wallpaper to that theme's default.
      </div>

      <PanelTitle>Desktop Pattern</PanelTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {WALLPAPERS.map(w => {
          const sel = currentId === w.id;
          return (
            <button
              key={w.id}
              onClick={() => setCurrent(w.id)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'default',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
              aria-pressed={sel}
            >
              <div
                className="chrome-inset"
                style={{
                  ...w.style,
                  height: 48,
                  outline: sel ? '2px solid var(--plat-select)' : 'none',
                  outlineOffset: 1,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  textAlign: 'center',
                  color: sel ? 'var(--plat-900)' : 'var(--plat-700)',
                  fontWeight: sel ? 700 : 400,
                }}
              >
                {w.name}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: 'var(--plat-600)', marginTop: 4 }}>
        Click a pattern to apply it to the desktop. Your choice is remembered.
      </div>
    </div>
  );
}

function SoundPanel() {
  const enabled = useSoundStore(s => s.enabled);
  const setEnabled = useSoundStore(s => s.setEnabled);
  const volume = useSoundStore(s => s.volume);
  const setVolume = useSoundStore(s => s.setVolume);

  return (
    <div className="flex flex-col gap-3">
      <PanelTitle>Sound</PanelTitle>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'default',
          fontSize: 12,
        }}
      >
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => setEnabled(e.target.checked)}
          style={{ cursor: 'default' }}
        />
        Play system sounds
      </label>

      <div>
        <div style={{ fontSize: 11, color: 'var(--plat-700)', marginBottom: 4 }}>
          Speaker Volume
        </div>
        <div className="flex items-center" style={{ gap: 8 }}>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            disabled={!enabled}
            style={{ flex: 1, cursor: 'default' }}
          />
          <span
            style={{
              width: 30,
              textAlign: 'right',
              fontFamily: 'var(--font-monaco)',
              fontSize: 13,
              color: enabled ? 'var(--plat-900)' : 'var(--plat-500)',
            }}
          >
            {volume}
          </span>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, color: 'var(--plat-700)', marginBottom: 4 }}>
          Test Sounds
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <SoundButton onClick={playClick} disabled={!enabled}>Click</SoundButton>
          <SoundButton onClick={playOpen} disabled={!enabled}>Open</SoundButton>
          <SoundButton onClick={playClose} disabled={!enabled}>Close</SoundButton>
          <SoundButton onClick={playBeep} disabled={!enabled}>Beep</SoundButton>
          <SoundButton onClick={playStartup} disabled={!enabled}>Startup</SoundButton>
        </div>
      </div>
    </div>
  );
}

function SoundButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="chrome-outset"
      style={{
        background: 'var(--plat-200)',
        padding: '2px 10px',
        fontFamily: 'var(--font-chicago)',
        fontSize: 12,
        color: disabled ? 'var(--plat-500)' : 'var(--plat-900)',
        cursor: 'default',
      }}
    >
      {children}
    </button>
  );
}

function AboutMacPanel() {
  const themeId = useThemeStore(s => s.currentId);
  const theme = getTheme(themeId);
  return (
    <div className="flex flex-col gap-3">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: '1px solid var(--plat-300)',
          paddingBottom: 8,
        }}
      >
        <PixelIcon name="finder" size={40} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>os.akhileshw.xyz</div>
          <div style={{ fontSize: 11, color: 'var(--plat-700)' }}>
            {theme.systemLabel} · v1.0
          </div>
        </div>
      </div>

      {GEAR.map(({ section, rows }) => (
        <div key={section}>
          <SectionTitle>{section}</SectionTitle>
          <div>
            {rows.map(row => (
              <Row key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </div>
      ))}

      <div style={{ fontSize: 10, color: 'var(--plat-500)', marginTop: 4 }}>
        Source:{' '}
        <a
          href="https://akhileshw.xyz/uses"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--plat-700)', textDecoration: 'underline' }}
        >
          akhileshw.xyz/uses
        </a>
      </div>
    </div>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 14,
        fontWeight: 700,
        borderBottom: '1px solid var(--plat-300)',
        paddingBottom: 4,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--plat-700)',
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        fontSize: 12,
        padding: '2px 0',
        gap: 8,
        borderBottom: '1px dotted var(--plat-200)',
      }}
    >
      <span style={{ width: 92, color: 'var(--plat-700)', flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1 }}>{value}</span>
    </div>
  );
}
