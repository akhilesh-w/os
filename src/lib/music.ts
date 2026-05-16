export interface Track {
  title: string;
  artist: string;
  album: string;
  src: string;
  cover?: string;
}

/**
 * Shared music library — used by the iPod app and the Finder Music folder.
 * Starter content: ProleteR's "Curses From Past Times" (CC BY-NC-ND 3.0),
 * streamed directly from archive.org. Drop your own MP3s into public/audio/
 * and reference them as e.g. src: '/audio/yourtrack.mp3'.
 */
export const PLAYLIST: Track[] = [
  {
    title: 'Muhammad Ali',
    artist: 'ProleteR',
    album: 'Curses From Past Times',
    src: 'https://archive.org/download/DWK123/ProleteR_-_07_-_Muhammad_Ali.mp3',
    cover: 'https://archive.org/services/img/DWK123',
  },
  {
    title: 'April Showers',
    artist: 'ProleteR',
    album: 'Curses From Past Times',
    src: 'https://archive.org/download/DWK123/ProleteR_-_01_-_April_Showers.mp3',
    cover: 'https://archive.org/services/img/DWK123',
  },
  {
    title: 'A Million Dollar',
    artist: 'ProleteR',
    album: 'Curses From Past Times',
    src: 'https://archive.org/download/DWK123/ProleteR_-_04_-_A_Million_Dollar.mp3',
    cover: 'https://archive.org/services/img/DWK123',
  },
  {
    title: 'May Flowers',
    artist: 'ProleteR feat. Taskrok',
    album: 'Curses From Past Times',
    src: 'https://archive.org/download/DWK123/ProleteR_-_09_-_May_Flowers_feat._Taskrok.mp3',
    cover: 'https://archive.org/services/img/DWK123',
  },
  {
    title: 'Faidherbe Square',
    artist: 'ProleteR',
    album: 'Curses From Past Times',
    src: 'https://archive.org/download/DWK123/ProleteR_-_10_-_Faidherbe_Square_feat._Mister_Colfer_and_DJ_Crabees.mp3',
    cover: 'https://archive.org/services/img/DWK123',
  },
];
