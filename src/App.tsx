import { useEffect } from 'react';
import MenuBar from './components/MenuBar';
import Desktop from './components/Desktop';
import Dock from './components/Dock';
import { useWindowStore } from './store/windowStore';

export default function App() {
  const openWindow = useWindowStore(s => s.openWindow);

  useEffect(() => {
    openWindow('finder');
    openWindow('about');
  }, [openWindow]);

  return (
    <div className="w-screen h-screen overflow-hidden select-none">
      <MenuBar />
      <Desktop />
      <Dock />
    </div>
  );
}
