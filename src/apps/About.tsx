import PixelIcon from '../components/PixelIcon';

const LINKS = [
  { label: 'GitHub', url: 'https://github.com/akhilesh-w', handle: '@akhilesh-w' },
  { label: 'Twitter', url: 'https://twitter.com/theakhileshw', handle: '@theakhileshw' },
  { label: 'Email', url: 'mailto:hey@akhileshw.xyz', handle: 'hey@akhileshw.xyz' },
  { label: 'Web', url: 'https://akhileshw.xyz', handle: 'akhileshw.xyz' },
];

const SKILLS = ['TypeScript', 'React', 'Next.js', 'Node.js', 'Python', 'Rust', 'Linux', 'Systems'];

export default function About() {
  return (
    <div
      className="h-full overflow-auto"
      style={{
        background: 'var(--plat-white)',
        fontFamily: 'var(--font-chicago)',
        fontSize: 12,
        color: 'var(--plat-900)',
      }}
    >
      <div className="px-4 py-4 flex flex-col gap-3">
        {/* Header row — pixel Mac + identity */}
        <div className="flex items-start gap-3" style={{ borderBottom: '1px solid var(--plat-400)', paddingBottom: 10 }}>
          <PixelIcon name="finder" size={56} />
          <div className="flex flex-col">
            <div style={{ fontFamily: 'var(--font-chicago)', fontSize: 16, fontWeight: 700 }}>
              Akhilesh Waghmare
            </div>
            <div style={{ fontSize: 11, color: 'var(--plat-700)', marginTop: 2 }}>
              Builder & Storyteller
            </div>
            <div style={{ fontSize: 11, color: 'var(--plat-700)', marginTop: 1 }}>
              akhileshw.xyz · v1.0
            </div>
          </div>
        </div>

        {/* "Built-in Memory" — bio block in System-7 style */}
        <Field label="Bio">
          Coder, storyteller, explorer of ideas — stitching together
          software, stories, systems, and curiosity. Currently building
          things that matter.
        </Field>

        <Field label="Technologies">
          <div className="flex flex-wrap gap-1">
            {SKILLS.map(s => (
              <span
                key={s}
                style={{
                  fontSize: 11,
                  padding: '0 4px',
                  border: '1px solid var(--plat-900)',
                  background: 'var(--plat-100)',
                  lineHeight: '14px',
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </Field>

        <Field label="Find me">
          <div className="flex flex-col gap-1">
            {LINKS.map(link => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="finder-row flex items-center px-1 no-underline"
                style={{ color: 'var(--plat-900)', fontSize: 12, gap: 8 }}
              >
                <span style={{ width: 56, fontWeight: 500 }}>{link.label}:</span>
                <span style={{ textDecoration: 'underline' }}>{link.handle}</span>
              </a>
            ))}
          </div>
        </Field>

        <div style={{ fontSize: 10, color: 'var(--plat-500)', textAlign: 'center', marginTop: 4 }}>
          © Akhilesh Waghmare — assembled with care
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-chicago)',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--plat-700)',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ lineHeight: 1.5, fontSize: 12 }}>{children}</div>
    </div>
  );
}
