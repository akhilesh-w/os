import type { AppDefinition } from '../types';
import Finder from './Finder';
import Terminal from './Terminal';
import About from './About';
import Music from './Music';
import ControlPanels from './ControlPanels';
import Launcher from './Launcher';
import TextEdit from './TextEdit';

export const APPS: AppDefinition[] = [
  { id: 'launcher', name: 'Launcher', icon: 'launcher', component: Launcher, defaultWidth: 420, defaultHeight: 320, hideFromLauncher: true },
  { id: 'finder', name: 'Finder', icon: 'finder', component: Finder, defaultWidth: 620, defaultHeight: 420 },
  { id: 'terminal', name: 'Terminal', icon: 'terminal', component: Terminal, defaultWidth: 640, defaultHeight: 420 },
  { id: 'about', name: 'About This Macintosh', icon: 'about', component: About, defaultWidth: 380, defaultHeight: 440, hideFromDock: true },
  { id: 'music', name: 'iPod', icon: 'music', component: Music, defaultWidth: 300, defaultHeight: 460 },
  { id: 'controls', name: 'Control Panels', icon: 'controls', component: ControlPanels, defaultWidth: 520, defaultHeight: 380 },
  { id: 'text-edit', name: 'TextEdit', icon: 'document', component: TextEdit, defaultWidth: 520, defaultHeight: 540, hideFromDock: true },
  { id: 'github', name: 'GitHub', icon: 'github', externalUrl: 'https://github.com/akhilesh-w', defaultWidth: 0, defaultHeight: 0 },
];

export const APPS_BY_ID: Record<string, AppDefinition> = Object.fromEntries(
  APPS.map(app => [app.id, app])
);
