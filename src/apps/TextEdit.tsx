import { useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useWindowId } from '../components/Window';
import { useWindowStore } from '../store/windowStore';
import { getPost, POSTS } from '../lib/posts';

export default function TextEdit() {
  const windowId = useWindowId();
  const win = useWindowStore(s => s.windows.find(w => w.id === windowId));
  const setTitle = useWindowStore(s => s.setWindowTitle);
  const openWindow = useWindowStore(s => s.openWindow);

  const slug = typeof win?.params?.slug === 'string' ? (win.params.slug as string) : undefined;
  const post = useMemo(() => (slug ? getPost(slug) : undefined), [slug]);

  useEffect(() => {
    if (!windowId) return;
    if (post) setTitle(windowId, `${post.title} — TextEdit`);
    else setTitle(windowId, 'TextEdit');
  }, [windowId, post, setTitle]);

  if (!post) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--font-geneva)',
          background: 'var(--plat-white)',
        }}
      >
        <Ruler />
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 18, fontFamily: 'var(--font-chicago)' }}>
            Untitled
          </h2>
          <p style={{ marginBottom: 12 }}>
            Open one of these notes from Finder, or pick one below:
          </p>
          <ul style={{ paddingLeft: 18, listStyle: 'square' }}>
            {POSTS.map(p => (
              <li key={p.slug} style={{ marginBottom: 4 }}>
                <a
                  href="#"
                  onClick={e => {
                    e.preventDefault();
                    openWindow('text-edit', { windowKey: p.slug, slug: p.slug });
                  }}
                  style={{ color: 'var(--plat-select)', textDecoration: 'underline' }}
                >
                  {p.title}
                </a>{' '}
                <span style={{ opacity: 0.6, fontSize: 12 }}>{p.date}</span>
              </li>
            ))}
          </ul>
        </div>
        <StatusBar text="No document open" />
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-geneva)',
        background: 'var(--plat-white)',
      }}
    >
      <Ruler />
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px 32px',
          color: 'var(--plat-900)',
          fontSize: 14,
          lineHeight: 1.55,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-chicago)',
            fontSize: 10,
            color: 'var(--plat-600)',
            marginBottom: 14,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {post.date}
        </div>
        <article className="textedit-md">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </article>
      </div>
      <StatusBar text={`${countWords(post.content)} words · ${post.slug}.md`} />
      <style>{`
        .textedit-md h1 { font-family: var(--font-chicago); font-size: 22px; margin: 0 0 12px; letter-spacing: 0.01em; }
        .textedit-md h2 { font-family: var(--font-chicago); font-size: 16px; margin: 18px 0 8px; }
        .textedit-md h3 { font-family: var(--font-chicago); font-size: 14px; margin: 14px 0 6px; }
        .textedit-md p { margin: 0 0 10px; }
        .textedit-md ul, .textedit-md ol { margin: 0 0 10px 20px; padding: 0; }
        .textedit-md li { margin-bottom: 3px; }
        .textedit-md a { color: var(--plat-select); text-decoration: underline; }
        .textedit-md code { font-family: var(--font-monaco); background: var(--plat-100); padding: 0 3px; font-size: 13px; }
        .textedit-md pre { font-family: var(--font-monaco); background: var(--plat-100); padding: 8px 10px; border: 1px solid var(--plat-400); margin: 10px 0; overflow-x: auto; }
        .textedit-md pre code { background: transparent; padding: 0; }
        .textedit-md strong { font-weight: 700; }
        .textedit-md em { font-style: italic; }
        .textedit-md blockquote { margin: 10px 0; padding-left: 12px; border-left: 3px solid var(--plat-400); color: var(--plat-700); }
        .textedit-md hr { border: 0; border-top: 1px solid var(--plat-400); margin: 14px 0; }
      `}</style>
    </div>
  );
}

function Ruler() {
  return (
    <div
      style={{
        height: 16,
        background: 'var(--plat-100)',
        borderBottom: '1px solid var(--plat-400)',
        backgroundImage:
          'repeating-linear-gradient(90deg, var(--plat-700) 0 1px, transparent 1px 12px),' +
          'repeating-linear-gradient(90deg, var(--plat-500) 0 1px, transparent 1px 6px)',
        backgroundSize: '12px 4px, 6px 2px',
        backgroundPosition: '0 11px, 0 13px',
        backgroundRepeat: 'repeat-x',
        flexShrink: 0,
      }}
      aria-hidden="true"
    />
  );
}

function StatusBar({ text }: { text: string }) {
  return (
    <div
      style={{
        height: 18,
        background: 'var(--plat-100)',
        borderTop: '1px solid var(--plat-400)',
        fontFamily: 'var(--font-chicago)',
        fontSize: 11,
        color: 'var(--plat-700)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        flexShrink: 0,
      }}
    >
      {text}
    </div>
  );
}

function countWords(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}
