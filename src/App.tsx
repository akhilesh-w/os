import MenuBar from './components/MenuBar';
import Desktop from './components/Desktop';
import Dock from './components/Dock';

export default function App() {
  return (
    <div className="w-screen h-screen overflow-hidden select-none">
      <MenuBar />
      <Desktop />
      <Dock />
    </div>
  );
}
