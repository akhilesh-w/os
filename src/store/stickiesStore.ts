import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type StickyColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple';

export interface Sticky {
  id: string;
  content: string;
  color: StickyColor;
  createdAt: number;
}

interface StickiesStore {
  stickies: Record<string, Sticky>;
  order: string[];
  create: (initial?: Partial<Pick<Sticky, 'content' | 'color'>>) => Sticky;
  update: (id: string, content: string) => void;
  setColor: (id: string, color: StickyColor) => void;
  remove: (id: string) => void;
  list: () => Sticky[];
}

const COLORS: StickyColor[] = ['yellow', 'pink', 'blue', 'green', 'purple'];

const DEFAULT_CONTENT = `Stickies

Type to edit. Drag the title bar to move.
Click + to make another. Use the swatch to recolor.

— akhilesh`;

let counter = 0;
function nextId(): string {
  counter += 1;
  return `sticky-${Date.now().toString(36)}-${counter}`;
}

export const useStickiesStore = create<StickiesStore>()(
  persist(
    (set, get) => ({
      stickies: {},
      order: [],

      create: (initial) => {
        const existing = get().order.length;
        const id = nextId();
        const sticky: Sticky = {
          id,
          content: initial?.content ?? (existing === 0 ? DEFAULT_CONTENT : ''),
          color: initial?.color ?? COLORS[existing % COLORS.length],
          createdAt: Date.now(),
        };
        set(state => ({
          stickies: { ...state.stickies, [id]: sticky },
          order: [...state.order, id],
        }));
        return sticky;
      },

      update: (id, content) => {
        set(state => {
          const cur = state.stickies[id];
          if (!cur) return state;
          return { stickies: { ...state.stickies, [id]: { ...cur, content } } };
        });
      },

      setColor: (id, color) => {
        set(state => {
          const cur = state.stickies[id];
          if (!cur) return state;
          return { stickies: { ...state.stickies, [id]: { ...cur, color } } };
        });
      },

      remove: (id) => {
        set(state => {
          const { [id]: _gone, ...rest } = state.stickies;
          return {
            stickies: rest,
            order: state.order.filter(x => x !== id),
          };
        });
      },

      list: () => {
        const { stickies, order } = get();
        return order.map(id => stickies[id]).filter(Boolean);
      },
    }),
    { name: 'os.akhileshw.xyz:stickies:v1' }
  )
);

export const STICKY_COLOR_STYLES: Record<StickyColor, { bg: string; bgDeep: string }> = {
  yellow: { bg: '#fff8a8', bgDeep: '#eedf60' },
  pink:   { bg: '#ffc7d6', bgDeep: '#e98caa' },
  blue:   { bg: '#bee3ff', bgDeep: '#7fbef0' },
  green:  { bg: '#caf0a8', bgDeep: '#92cc70' },
  purple: { bg: '#e0c8ff', bgDeep: '#b88de8' },
};
