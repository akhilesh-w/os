import type { CSSProperties, ReactNode } from 'react';

interface PixelIconProps {
  name: string;
  size?: number;
  style?: CSSProperties;
}

const ICONS: Record<string, ReactNode> = {
  finder: (
    <g fill="currentColor">
      {/* CPU box outline */}
      <rect x="2" y="2" width="12" height="11" fill="#000" />
      <rect x="3" y="3" width="10" height="9" fill="#ddd" />
      {/* Screen */}
      <rect x="4" y="4" width="8" height="5" fill="#000" />
      <rect x="5" y="5" width="6" height="3" fill="#fff" />
      {/* Two eyes + smile (Happy Mac) */}
      <rect x="6" y="6" width="1" height="1" fill="#000" />
      <rect x="9" y="6" width="1" height="1" fill="#000" />
      <rect x="7" y="7" width="2" height="1" fill="#000" />
      {/* Disk slot */}
      <rect x="6" y="10" width="4" height="1" fill="#000" />
      {/* Feet */}
      <rect x="3" y="13" width="3" height="1" fill="#000" />
      <rect x="10" y="13" width="3" height="1" fill="#000" />
    </g>
  ),
  terminal: (
    <g fill="currentColor">
      <rect x="1" y="3" width="14" height="9" fill="#000" />
      <rect x="2" y="4" width="12" height="7" fill="#fff" />
      <rect x="3" y="5" width="2" height="1" fill="#000" />
      <rect x="4" y="6" width="2" height="1" fill="#000" />
      <rect x="3" y="7" width="2" height="1" fill="#000" />
      <rect x="6" y="9" width="3" height="1" fill="#000" />
      <rect x="4" y="13" width="8" height="1" fill="#000" />
      <rect x="6" y="14" width="4" height="1" fill="#000" />
    </g>
  ),
  about: (
    <g fill="currentColor">
      {/* Document with curl */}
      <rect x="3" y="2" width="9" height="12" fill="#fff" />
      <rect x="3" y="2" width="9" height="1" fill="#000" />
      <rect x="3" y="13" width="9" height="1" fill="#000" />
      <rect x="3" y="2" width="1" height="12" fill="#000" />
      <rect x="11" y="2" width="1" height="12" fill="#000" />
      {/* Lines of text */}
      <rect x="5" y="4" width="5" height="1" fill="#000" />
      <rect x="5" y="6" width="4" height="1" fill="#000" />
      <rect x="5" y="8" width="5" height="1" fill="#000" />
      <rect x="5" y="10" width="3" height="1" fill="#000" />
    </g>
  ),
  music: (
    <g fill="currentColor">
      {/* Eighth note */}
      <rect x="10" y="2" width="1" height="9" fill="#000" />
      <rect x="11" y="3" width="2" height="2" fill="#000" />
      <rect x="12" y="5" width="1" height="2" fill="#000" />
      {/* Note head */}
      <rect x="6" y="10" width="5" height="3" fill="#000" />
      <rect x="5" y="11" width="1" height="2" fill="#000" />
      <rect x="11" y="9" width="1" height="1" fill="#000" />
    </g>
  ),
  github: (
    <g fill="currentColor">
      {/* Simple folder with code brackets */}
      <rect x="2" y="3" width="5" height="1" fill="#000" />
      <rect x="2" y="4" width="12" height="1" fill="#000" />
      <rect x="2" y="4" width="1" height="9" fill="#000" />
      <rect x="13" y="4" width="1" height="9" fill="#000" />
      <rect x="2" y="13" width="12" height="1" fill="#000" />
      <rect x="3" y="5" width="10" height="8" fill="#fff" />
      {/* Brackets */}
      <rect x="5" y="7" width="2" height="1" fill="#000" />
      <rect x="5" y="8" width="1" height="2" fill="#000" />
      <rect x="5" y="10" width="2" height="1" fill="#000" />
      <rect x="9" y="7" width="2" height="1" fill="#000" />
      <rect x="10" y="8" width="1" height="2" fill="#000" />
      <rect x="9" y="10" width="2" height="1" fill="#000" />
    </g>
  ),
  folder: (
    <g fill="currentColor">
      <rect x="2" y="4" width="5" height="1" fill="#000" />
      <rect x="2" y="5" width="12" height="1" fill="#000" />
      <rect x="2" y="5" width="1" height="8" fill="#000" />
      <rect x="13" y="5" width="1" height="8" fill="#000" />
      <rect x="2" y="13" width="12" height="1" fill="#000" />
      <rect x="3" y="6" width="10" height="7" fill="#fff" />
    </g>
  ),
  document: (
    <g fill="currentColor">
      <rect x="3" y="2" width="9" height="12" fill="#fff" />
      <rect x="3" y="2" width="9" height="1" fill="#000" />
      <rect x="3" y="13" width="9" height="1" fill="#000" />
      <rect x="3" y="2" width="1" height="12" fill="#000" />
      <rect x="11" y="2" width="1" height="12" fill="#000" />
      {/* Folded corner */}
      <rect x="9" y="2" width="3" height="1" fill="#000" />
      <rect x="9" y="3" width="1" height="2" fill="#000" />
      <rect x="9" y="5" width="3" height="1" fill="#000" />
      {/* Lines */}
      <rect x="5" y="7" width="5" height="1" fill="#000" />
      <rect x="5" y="9" width="4" height="1" fill="#000" />
      <rect x="5" y="11" width="5" height="1" fill="#000" />
    </g>
  ),
  trash: (
    <g fill="currentColor">
      <rect x="4" y="3" width="8" height="1" fill="#000" />
      <rect x="3" y="4" width="10" height="1" fill="#000" />
      <rect x="4" y="5" width="8" height="9" fill="#000" />
      <rect x="5" y="6" width="6" height="7" fill="#fff" />
      <rect x="6" y="7" width="1" height="5" fill="#000" />
      <rect x="8" y="7" width="1" height="5" fill="#000" />
      <rect x="10" y="7" width="1" height="5" fill="#000" />
    </g>
  ),
  macHD: (
    <g fill="currentColor">
      <rect x="1" y="4" width="14" height="8" fill="#000" />
      <rect x="2" y="5" width="12" height="6" fill="#ddd" />
      <rect x="3" y="6" width="2" height="2" fill="#000" />
      <rect x="6" y="6" width="2" height="2" fill="#fff" />
      <rect x="3" y="6" width="2" height="2" fill="#000" />
      <rect x="11" y="9" width="2" height="1" fill="#000" />
    </g>
  ),
};

export default function PixelIcon({ name, size = 32, style }: PixelIconProps) {
  const glyph = ICONS[name] ?? ICONS.document;
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated', ...style }}
      aria-hidden="true"
    >
      {glyph}
    </svg>
  );
}
