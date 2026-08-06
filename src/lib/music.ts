export interface Track {
  title: string;
  artist: string;
  album: string;
  src: string;
  cover?: string;
}

const ia = (item: string, file: string) =>
  `https://archive.org/download/${item}/${encodeURIComponent(file)}`;
const iaCover = (item: string) => `https://archive.org/services/img/${item}`;

/**
 * Shared music library — used by the iPod app and the Finder Music folder.
 * Everything is Creative-Commons licensed, streamed from archive.org (which
 * supports HTTP range requests, so scrubbing seeks instantly):
 *   - ProleteR — CC BY-NC-ND (Curses From Past Times, Feeding The Lions, Rookie EP)
 *   - Broke For Free — CC BY (Slam Funk, Directionless EP)
 * Drop your own MP3s into public/audio/ and reference them as
 * src: '/audio/yourtrack.mp3' — but only ship tracks you have the rights to.
 */
export const PLAYLIST: Track[] = [
  // ── ProleteR — Curses From Past Times (LP) ──
  {
    title: 'April Showers',
    artist: 'ProleteR',
    album: 'Curses From Past Times',
    src: ia('DWK123', 'ProleteR_-_01_-_April_Showers.mp3'),
    cover: iaCover('DWK123'),
  },
  {
    title: 'A Million Dollar',
    artist: 'ProleteR',
    album: 'Curses From Past Times',
    src: ia('DWK123', 'ProleteR_-_04_-_A_Million_Dollar.mp3'),
    cover: iaCover('DWK123'),
  },
  {
    title: 'Muhammad Ali',
    artist: 'ProleteR',
    album: 'Curses From Past Times',
    src: ia('DWK123', 'ProleteR_-_07_-_Muhammad_Ali.mp3'),
    cover: iaCover('DWK123'),
  },
  {
    title: 'May Flowers',
    artist: 'ProleteR feat. Taskrok',
    album: 'Curses From Past Times',
    src: ia('DWK123', 'ProleteR_-_09_-_May_Flowers_feat._Taskrok.mp3'),
    cover: iaCover('DWK123'),
  },
  {
    title: 'Faidherbe Square',
    artist: 'ProleteR',
    album: 'Curses From Past Times',
    src: ia('DWK123', 'ProleteR_-_10_-_Faidherbe_Square_feat._Mister_Colfer_and_DJ_Crabees.mp3'),
    cover: iaCover('DWK123'),
  },

  // ── ProleteR — Feeding The Lions (EP) ──
  {
    title: "It Don't Mean A Thing",
    artist: 'ProleteR',
    album: 'Feeding The Lions',
    src: ia('DWK226', 'ProleteR_-_01_-_It_Dont_Mean_A_Thing.mp3'),
    cover: iaCover('DWK226'),
  },
  {
    title: "Valentine's Day",
    artist: 'ProleteR',
    album: 'Feeding The Lions',
    src: ia('DWK226', 'ProleteR_-_02_-_Valentines_Day.mp3'),
    cover: iaCover('DWK226'),
  },
  {
    title: 'Nothing At All',
    artist: 'ProleteR',
    album: 'Feeding The Lions',
    src: ia('DWK226', 'ProleteR_-_04_-_Nothing_At_All.mp3'),
    cover: iaCover('DWK226'),
  },
  {
    title: 'Memories',
    artist: 'ProleteR',
    album: 'Feeding The Lions',
    src: ia('DWK226', 'ProleteR_-_06_-_Memories.mp3'),
    cover: iaCover('DWK226'),
  },
  {
    title: 'Street Boyz',
    artist: 'ProleteR',
    album: 'Feeding The Lions',
    src: ia('DWK226', 'ProleteR_-_08_-_Street_Boyz.mp3'),
    cover: iaCover('DWK226'),
  },

  // ── ProleteR — Rookie (EP) ──
  {
    title: 'By the River',
    artist: 'ProleteR',
    album: 'Rookie EP',
    src: ia('jamendo-141402', '01-1174094-ProleteR-By the River.mp3'),
    cover: iaCover('jamendo-141402'),
  },
  {
    title: 'No Place I Can Go',
    artist: 'ProleteR',
    album: 'Rookie EP',
    src: ia('jamendo-141402', '02-1174095-ProleteR-No Place I Can Go.mp3'),
    cover: iaCover('jamendo-141402'),
  },
  {
    title: 'Not Afraid',
    artist: 'ProleteR',
    album: 'Rookie EP',
    src: ia('jamendo-141402', '03-1174096-ProleteR-Not Afraid.mp3'),
    cover: iaCover('jamendo-141402'),
  },
  {
    title: 'My Melancholy Baby',
    artist: 'ProleteR',
    album: 'Rookie EP',
    src: ia('jamendo-141402', '06-1174098-ProleteR-My Melancholy Baby.mp3'),
    cover: iaCover('jamendo-141402'),
  },
  {
    title: 'Stereosun',
    artist: 'ProleteR',
    album: 'Rookie EP',
    src: ia('jamendo-141402', '07-1174100-ProleteR-Stereosun.mp3'),
    cover: iaCover('jamendo-141402'),
  },

  // ── Broke For Free — Slam Funk ──
  {
    title: 'Nothing Like Captain Crunch',
    artist: 'Broke For Free',
    album: 'Slam Funk',
    src: ia('Slam_Funk-7603', 'Broke_For_Free_-_01_-_Nothing_Like_Captain_Crunch.mp3'),
    cover: iaCover('Slam_Funk-7603'),
  },
  {
    title: 'The Great',
    artist: 'Broke For Free',
    album: 'Slam Funk',
    src: ia('Slam_Funk-7603', 'Broke_For_Free_-_03_-_The_Great.mp3'),
    cover: iaCover('Slam_Funk-7603'),
  },
  {
    title: 'Caught In The Beat',
    artist: 'Broke For Free',
    album: 'Slam Funk',
    src: ia('Slam_Funk-7603', 'Broke_For_Free_-_04_-_Caught_In_The_Beat.mp3'),
    cover: iaCover('Slam_Funk-7603'),
  },
  {
    title: 'Hella',
    artist: 'Broke For Free',
    album: 'Slam Funk',
    src: ia('Slam_Funk-7603', 'Broke_For_Free_-_05_-_Hella.mp3'),
    cover: iaCover('Slam_Funk-7603'),
  },
  {
    title: 'Living In Reverse',
    artist: 'Broke For Free',
    album: 'Slam Funk',
    src: ia('Slam_Funk-7603', 'Broke_For_Free_-_08_-_Living_In_Reverse.mp3'),
    cover: iaCover('Slam_Funk-7603'),
  },

  // ── Broke For Free — Directionless EP ──
  {
    title: 'Night Owl',
    artist: 'Broke For Free',
    album: 'Directionless EP',
    src: ia('Directionless_EP-8295', 'Broke_For_Free_-_01_-_Night_Owl.mp3'),
    cover: iaCover('Directionless_EP-8295'),
  },
  {
    title: 'My Always Mood',
    artist: 'Broke For Free',
    album: 'Directionless EP',
    src: ia('Directionless_EP-8295', 'Broke_For_Free_-_02_-_My_Always_Mood.mp3'),
    cover: iaCover('Directionless_EP-8295'),
  },
  {
    title: 'Day Bird',
    artist: 'Broke For Free',
    album: 'Directionless EP',
    src: ia('Directionless_EP-8295', 'Broke_For_Free_-_03_-_Day_Bird.mp3'),
    cover: iaCover('Directionless_EP-8295'),
  },
  {
    title: 'My Luck',
    artist: 'Broke For Free',
    album: 'Directionless EP',
    src: ia('Directionless_EP-8295', 'Broke_For_Free_-_04_-_My_Luck.mp3'),
    cover: iaCover('Directionless_EP-8295'),
  },
  {
    title: 'Mells Parade',
    artist: 'Broke For Free',
    album: 'Directionless EP',
    src: ia('Directionless_EP-8295', 'Broke_For_Free_-_05_-_Mells_Parade.mp3'),
    cover: iaCover('Directionless_EP-8295'),
  },
];

/** Unique albums in playlist order, each with its cover and artist — feeds Cover Flow. */
export interface AlbumInfo {
  name: string;
  artist: string;
  cover?: string;
}

export const ALBUM_LIST: AlbumInfo[] = PLAYLIST.reduce<AlbumInfo[]>((acc, t) => {
  if (!acc.some(a => a.name === t.album)) {
    acc.push({ name: t.album, artist: t.artist.split(' feat.')[0], cover: t.cover });
  }
  return acc;
}, []);
