import PixelIcon from './PixelIcon';
import { playClick } from '../lib/sounds';
import { useWindowStore } from '../store/windowStore';

interface DockIconProps {
  appId: string;
  icon: string;
  label: string;
  isOpen: boolean;
  onClick: () => void;
}

export default function DockIcon({ appId, icon, label, isOpen, onClick }: DockIconProps) {
  const launchToken = useWindowStore(s => s.launchTokens[appId] ?? 0);
  return (
    <button
      data-app-id={appId}
      onClick={() => {
        playClick();
        onClick();
      }}
      aria-label={label}
      className="dock-icon-btn"
    >
      <span
        key={launchToken}
        className={launchToken > 0 ? 'dock-bounce' : undefined}
        style={{ display: 'inline-flex' }}
      >
        <PixelIcon name={icon} size={28} />
      </span>
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
            borderRadius: '50%',
          }}
        />
      )}
      <span className="dock-tooltip" role="tooltip">{label}</span>
    </button>
  );
}
