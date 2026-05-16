import { useWindowStore } from '../store/windowStore';
import { APPS } from '../apps/registry';
import DockIcon from './DockIcon';

export default function Dock() {
  const { windows, openWindow } = useWindowStore();
  const isOpen = (appId: string) =>
    windows.some(w => w.appId === appId && !w.isMinimized);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9998]">
      <div className="dock-bar flex items-center gap-1 px-1 py-1">
        {APPS.filter(app => !app.hideFromDock).map(app => (
          <DockIcon
            key={app.id}
            icon={app.icon}
            label={app.name}
            isOpen={isOpen(app.id)}
            onClick={() => openWindow(app.id)}
          />
        ))}
      </div>
    </div>
  );
}
