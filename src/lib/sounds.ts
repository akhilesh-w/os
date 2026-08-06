import { useSoundStore } from '../store/soundStore';
import { useThemeStore } from '../store/themeStore';
import { getTheme } from './themes';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

interface AudioPipe {
  ctx: AudioContext;
  master: GainNode;
}

function currentProfile() {
  return getTheme(useThemeStore.getState().currentId).soundProfile;
}

function ensure(): AudioPipe | null {
  if (typeof window === 'undefined') return null;
  const { enabled, volume } = useSoundStore.getState();
  if (!enabled) return null;

  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
      master = ctx.createGain();
      master.connect(ctx.destination);
    } catch {
      ctx = null;
      master = null;
      return null;
    }
  }

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  if (master) master.gain.value = Math.max(0, Math.min(1, volume / 100));
  return master ? { ctx, master } : null;
}

/** Very quiet, very short click — the iPod click wheel tick. */
export function playTick() {
  const pipe = ensure();
  if (!pipe) return;
  const { ctx: c, master: out } = pipe;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'square';
  osc.frequency.value = 5200;
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.025, now + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.012);
  osc.connect(gain).connect(out);
  osc.start(now);
  osc.stop(now + 0.02);
}

/** Short, dry tick. ~20ms — like a Mac OS click or menu press. */
export function playClick() {
  const pipe = ensure();
  if (!pipe) return;
  const { ctx: c, master: out } = pipe;
  const now = c.currentTime;
  const profile = currentProfile();
  const osc = c.createOscillator();
  const gain = c.createGain();
  if (profile === 'aqua') {
    osc.type = 'sine';
    osc.frequency.value = 4200;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  } else if (profile === 'winxp') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2800, now);
    osc.frequency.exponentialRampToValueAtTime(3600, now + 0.05);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  } else if (profile === 'win98') {
    osc.type = 'square';
    osc.frequency.value = 2200;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
  } else if (profile === 'nextstep') {
    // Metallic — two stacked oscillators (square + slightly detuned triangle).
    osc.type = 'square';
    osc.frequency.value = 3200;
    const osc2 = c.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 3160;
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0.001, now);
    g2.gain.linearRampToValueAtTime(0.04, now + 0.002);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc2.connect(g2).connect(out);
    osc2.start(now);
    osc2.stop(now + 0.04);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
  } else {
    osc.type = 'square';
    osc.frequency.value = 3600;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
  }
  osc.connect(gain).connect(out);
  osc.start(now);
  osc.stop(now + 0.06);
}

/** Two short beeps — classic "Sosumi"-style error alert. Theme-aware. */
export function playBeep() {
  const pipe = ensure();
  if (!pipe) return;
  const { ctx: c, master: out } = pipe;
  const profile = currentProfile();
  const oneBeep = (start: number) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    if (profile === 'aqua') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(720, start);
      osc.frequency.exponentialRampToValueAtTime(900, start + 0.12);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.start(start);
      osc.stop(start + 0.25);
    } else if (profile === 'winxp') {
      // Bright ding-style chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, start);
      osc.frequency.exponentialRampToValueAtTime(990, start + 0.08);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.28, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);
      osc.start(start);
      osc.stop(start + 0.5);
    } else if (profile === 'win98') {
      // Short electronic blip (close to "tada" first hit)
      osc.type = 'square';
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      osc.start(start);
      osc.stop(start + 0.2);
    } else if (profile === 'nextstep') {
      // Tonal mid-range bell — NeXT had distinctive alert chimes
      osc.type = 'sine';
      osc.frequency.value = 600;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.32, start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.start(start);
      osc.stop(start + 0.55);
    } else {
      osc.type = 'triangle';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.11);
      osc.start(start);
      osc.stop(start + 0.13);
    }
    osc.connect(gain).connect(out);
  };
  // Single chime for modern themes, double-beep for classic Mac
  if (profile === 'platinum') {
    oneBeep(c.currentTime);
    oneBeep(c.currentTime + 0.13);
  } else {
    oneBeep(c.currentTime);
  }
}

function whoosh(
  c: AudioContext,
  out: GainNode,
  fromHz: number,
  toHz: number,
  durMs: number,
  peak = 0.35
) {
  const now = c.currentTime;
  const dur = durMs / 1000;
  const sampleCount = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, sampleCount, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) data[i] = Math.random() * 2 - 1;

  const src = c.createBufferSource();
  src.buffer = buf;

  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 8;
  filter.frequency.setValueAtTime(fromHz, now);
  filter.frequency.exponentialRampToValueAtTime(Math.max(50, toHz), now + dur);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(peak, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

  src.connect(filter).connect(gain).connect(out);
  src.start(now);
  src.stop(now + dur + 0.01);
}

/** Window opening — short ascending whoosh. Theme-aware. */
export function playOpen() {
  const pipe = ensure();
  if (!pipe) return;
  const profile = currentProfile();
  if (profile === 'win98') {
    // Quick electronic chirp — Win98 had a distinct minimize/maximize sound
    const { ctx: c, master: out } = pipe;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.05);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain).connect(out);
    osc.start(now);
    osc.stop(now + 0.08);
    return;
  }
  const peak = profile === 'aqua' || profile === 'winxp' || profile === 'nextstep' ? 0.22 : 0.35;
  whoosh(pipe.ctx, pipe.master, 500, 2400, 140, peak);
}

/** Window closing — descending whoosh. Theme-aware. */
export function playClose() {
  const pipe = ensure();
  if (!pipe) return;
  const profile = currentProfile();
  if (profile === 'win98') {
    const { ctx: c, master: out } = pipe;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain).connect(out);
    osc.start(now);
    osc.stop(now + 0.08);
    return;
  }
  const peak = profile === 'aqua' || profile === 'winxp' || profile === 'nextstep' ? 0.2 : 0.3;
  whoosh(pipe.ctx, pipe.master, 2200, 350, 120, peak);
}

/**
 * Mechanical cassette-deck transport — a low head-engage thump plus a
 * latch click; 'play' follows with a short motor spin-up whir. Used by
 * the Videos app for VCR-style play/pause feedback.
 */
export function playTape(kind: 'play' | 'stop') {
  const pipe = ensure();
  if (!pipe) return;
  const { ctx: c, master: out } = pipe;
  const now = c.currentTime;

  const thump = c.createOscillator();
  const tg = c.createGain();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(kind === 'play' ? 150 : 110, now);
  thump.frequency.exponentialRampToValueAtTime(55, now + 0.08);
  tg.gain.setValueAtTime(0.16, now);
  tg.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  thump.connect(tg).connect(out);
  thump.start(now);
  thump.stop(now + 0.12);

  const clickLen = 0.03;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * clickLen), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const click = c.createBufferSource();
  click.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2500;
  bp.Q.value = 1.2;
  const cg = c.createGain();
  cg.gain.value = 0.28;
  click.connect(bp).connect(cg).connect(out);
  click.start(now);

  if (kind === 'play') {
    const whirLen = 0.35;
    const wbuf = c.createBuffer(1, Math.ceil(c.sampleRate * whirLen), c.sampleRate);
    const wd = wbuf.getChannelData(0);
    for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
    const whir = c.createBufferSource();
    whir.buffer = wbuf;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(300, now + 0.03);
    lp.frequency.linearRampToValueAtTime(900, now + whirLen);
    const wg = c.createGain();
    wg.gain.setValueAtTime(0.0001, now + 0.03);
    wg.gain.linearRampToValueAtTime(0.045, now + 0.1);
    wg.gain.exponentialRampToValueAtTime(0.001, now + whirLen);
    whir.connect(lp).connect(wg).connect(out);
    whir.start(now + 0.03);
  }
}

/** F# major chord with bell-like decay — the iconic Mac startup. Roughly Quadra-flavored. */
export function playStartup() {
  const pipe = ensure();
  if (!pipe) return;
  const { ctx: c, master: out } = pipe;
  const now = c.currentTime;

  // F#3, A#3, C#4, F#4 — F# major triad doubled at the octave.
  const notes = [185.0, 233.08, 277.18, 369.99];
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = i === 0 ? 'triangle' : 'sine';
    osc.frequency.value = freq;
    const start = now + i * 0.025;
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.14, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 2.5);
    osc.connect(gain).connect(out);
    osc.start(start);
    osc.stop(start + 2.6);
  });

  // Soft noise attack — gives the chord a tactile "hit" up front.
  const buf = c.createBuffer(1, c.sampleRate * 0.08, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1800;
  const gain = c.createGain();
  gain.gain.value = 0.2;
  src.connect(filter).connect(gain).connect(out);
  src.start(now);
  src.stop(now + 0.1);
}
