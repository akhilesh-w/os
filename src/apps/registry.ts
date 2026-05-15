import type { AppDefinition } from '../types';
import Finder from './Finder';
import Terminal from './Terminal';
import About from './About';
import Music from './Music';

export const APPS: AppDefinition[] = [
  { id: 'finder', name: 'Finder', icon: 'finder', component: Finder, defaultWidth: 540, defaultHeight: 380 },
  { id: 'terminal', name: 'Terminal', icon: 'terminal', component: Terminal, defaultWidth: 520, defaultHeight: 340 },
  { id: 'about', name: 'About This Macintosh', icon: 'about', component: About, defaultWidth: 380, defaultHeight: 440 },
  { id: 'music', name: 'iPod', icon: 'music', component: Music, defaultWidth: 300, defaultHeight: 460 },
  { id: 'github', name: 'GitHub', icon: 'github', externalUrl: 'https://github.com/akhilesh-w', defaultWidth: 0, defaultHeight: 0 },
];

export const APPS_BY_ID: Record<string, AppDefinition> = Object.fromEntries(
  APPS.map(app => [app.id, app])
);
