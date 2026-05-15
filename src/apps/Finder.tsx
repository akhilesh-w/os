import PixelIcon from '../components/PixelIcon';

interface Project {
  name: string;
  desc: string;
  icon: string;
  url: string;
  kind: string;
  size: string;
}

const PROJECTS: Project[] = [
  { name: 'akhileshw.xyz', desc: 'Personal site built with Next.js', icon: 'folder', url: 'https://akhileshw.xyz', kind: 'website', size: '124K' },
  { name: 'dotfiles', desc: 'Arch Linux setup configuration', icon: 'folder', url: 'https://github.com/akhilesh-w/dotfiles', kind: 'repo', size: '18K' },
  { name: 'log', desc: 'Canvas for thoughts', icon: 'document', url: 'https://github.com/akhilesh-w/log', kind: 'notebook', size: '8K' },
  { name: 'sites', desc: 'Garden of random projects', icon: 'folder', url: 'https://github.com/akhilesh-w/sites', kind: 'repo', size: '32K' },
  { name: 'gemini-design-plugin', desc: 'Gemini CLI extension for UI design', icon: 'folder', url: 'https://github.com/akhilesh-w/gemini-design-plugin', kind: 'plugin', size: '46K' },
  { name: 'epoch', desc: 'Goal/task tracking app', icon: 'folder', url: 'https://github.com/akhilesh-w/epoch', kind: 'app', size: '54K' },
];

export default function Finder() {
  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--plat-white)', fontFamily: 'var(--font-geneva)' }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-2 py-1 shrink-0"
        style={{
          borderBottom: '1px solid var(--plat-900)',
          background: 'var(--plat-200)',
          fontSize: 12,
        }}
      >
        <span style={{ color: 'var(--plat-700)' }}>{PROJECTS.length} items</span>
        <span style={{ marginLeft: 'auto', color: 'var(--plat-700)' }}>akhileshw / Projects</span>
      </div>

      {/* List header */}
      <div
        className="flex items-center px-2 shrink-0 select-none"
        style={{
          background: 'var(--plat-100)',
          borderBottom: '1px solid var(--plat-900)',
          fontFamily: 'var(--font-chicago)',
          fontSize: 12,
          fontWeight: 500,
          height: 18,
          gap: 8,
        }}
      >
        <span style={{ width: 24 }}></span>
        <span style={{ flex: 1 }}>Name</span>
        <span style={{ width: 80, textAlign: 'right' }}>Size</span>
        <span style={{ width: 80 }}>Kind</span>
      </div>

      {/* List rows */}
      <div className="flex-1 overflow-auto">
        {PROJECTS.map((p, i) => (
          <a
            key={p.name}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="finder-row flex items-center px-2 py-0.5 no-underline outline-none"
            style={{
              gap: 8,
              fontSize: 12,
              color: 'var(--plat-900)',
              background: i % 2 ? 'var(--plat-white)' : 'var(--plat-50)',
              cursor: 'default',
              borderBottom: '1px solid var(--plat-100)',
            }}
          >
            <PixelIcon name={p.icon} size={18} />
            <span style={{ flex: 1, fontWeight: 500 }}>{p.name}</span>
            <span style={{ width: 80, textAlign: 'right', color: 'var(--plat-700)' }}>{p.size}</span>
            <span style={{ width: 80, color: 'var(--plat-700)' }}>{p.kind}</span>
          </a>
        ))}
      </div>

      {/* Status bar */}
      <div
        className="px-2 shrink-0 flex items-center"
        style={{
          background: 'var(--plat-100)',
          borderTop: '1px solid var(--plat-900)',
          fontSize: 11,
          height: 16,
          color: 'var(--plat-700)',
        }}
      >
        {PROJECTS.length} items, 282K used
      </div>
    </div>
  );
}
