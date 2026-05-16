import type { ComponentType } from 'react';

export interface WindowState {
  id: string;
  appId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
}

export type MenuItem =
  | {
      type: 'item';
      label: string;
      onSelect?: () => void;
      disabled?: boolean;
      shortcut?: string;
      /** When true, renders a classic Mac ✓ before the label. */
      checked?: boolean;
    }
  | { type: 'separator' };

export interface MenuDefinition {
  label: string;
  /** When provided, used as a unique key (so different menus can share a visible label). */
  key?: string;
  items: MenuItem[];
}

export interface AppDefinition {
  id: string;
  name: string;
  icon: string;
  defaultWidth: number;
  defaultHeight: number;
  component?: ComponentType;
  externalUrl?: string;
  hideFromDock?: boolean;
  hideFromLauncher?: boolean;
}
