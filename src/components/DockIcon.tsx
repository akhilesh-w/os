import PixelIcon from './PixelIcon';
import { playClick } from '../lib/sounds';

interface DockIconProps {
  icon: string;
  label: string;
  isOpen: boolean;
  onClick: () => void;
}

export default function DockIcon({ icon, label, isOpen, onClick }: DockIconProps) {
  return (
    <button
      onClick={() => {
        playClick();
        onClick();
      }}
      aria-label={label}
      className="dock-icon-btn"
    >
      <PixelIcon name={icon} size={28} />
      {isOpen && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: 2,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 4,
            height: 4,
            background: 'var(--plat-900)',
          }}
        />
      )}
      <span className="dock-tooltip" role="tooltip">{label}</span>
    </button>
  );
}
