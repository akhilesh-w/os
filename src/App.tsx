import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import MenuBar from './components/MenuBar';
import Desktop from './components/Desktop';
import Dock from './components/Dock';
import BootScreen from './components/BootScreen';

export default function App() {
  const [booted, setBooted] = useState(false);
  return (
    <div className="w-screen h-screen overflow-hidden select-none">
      <MenuBar />
      <Desktop />
      <Dock />
      <AnimatePresence>
        {!booted && <BootScreen key="boot" onComplete={() => setBooted(true)} />}
      </AnimatePresence>
    </div>
  );
}
