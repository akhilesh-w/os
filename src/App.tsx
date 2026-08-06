import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import MenuBar from './components/MenuBar';
import Desktop from './components/Desktop';
import Dock from './components/Dock';
import Screensaver from './components/Screensaver';
import Spotlight from './components/Spotlight';
import AppSwitcher from './components/AppSwitcher';
import { useScreensaverStore } from './store/screensaverStore';
import { useThemeStore } from './store/themeStore';
import { useSpotlightStore } from './store/spotlightStore';

export default function App() {
  const themeId = useThemeStore(s => s.currentId);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeId);
  }, [themeId]);

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

  // Global shortcut for Spotlight: ⌘K and ⌘Space toggle it. We intentionally
  // do NOT intercept these inside text inputs (so typing in TextEdit / Finder
  // search etc. is untouched).
  const toggleSpotlight = useSpotlightStore(s => s.toggle);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      const editingText =
        tag === 'input' || tag === 'textarea' || (t?.isContentEditable ?? false);
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && !e.shiftKey && !e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        toggleSpotlight();
      } else if (cmd && e.code === 'Space' && !editingText) {
        e.preventDefault();
        toggleSpotlight();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleSpotlight]);

  return (
    <div className="w-screen h-screen overflow-hidden select-none">
      <MenuBar />
      <Desktop />
      <Dock />
      <AppSwitcher />
      <Spotlight />
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
