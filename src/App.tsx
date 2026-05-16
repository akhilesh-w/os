import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import MenuBar from './components/MenuBar';
import Desktop from './components/Desktop';
import Dock from './components/Dock';
import Screensaver from './components/Screensaver';
import { useScreensaverStore } from './store/screensaverStore';

export default function App() {
  const idleMs = useScreensaverStore(s => s.idleMs);
  const enabled = useScreensaverStore(s => s.enabled);
  const forceOn = useScreensaverStore(s => s.forceOn);
  const setForceOn = useScreensaverStore(s => s.setForceOn);
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    if (!enabled) { setIdle(false); return; }
    let timer = 0;
    const reset = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), idleMs);
    };
    reset();
    const events: (keyof DocumentEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'];
    for (const ev of events) document.addEventListener(ev, reset);
    return () => {
      window.clearTimeout(timer);
      for (const ev of events) document.removeEventListener(ev, reset);
    };
  }, [idleMs, enabled]);

  const showScreensaver = (enabled && idle) || forceOn;

  return (
    <div className="w-screen h-screen overflow-hidden select-none">
      <MenuBar />
      <Desktop />
      <Dock />
      <AnimatePresence>
        {showScreensaver && (
          <Screensaver
            key="screensaver"
            onDismiss={() => {
              setIdle(false);
              setForceOn(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
