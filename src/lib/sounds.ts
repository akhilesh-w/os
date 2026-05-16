import { useSoundStore } from '../store/soundStore';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

interface AudioPipe {
  ctx: AudioContext;
  master: GainNode;
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
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'square';
  osc.frequency.value = 3600;
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
  osc.connect(gain).connect(out);
  osc.start(now);
  osc.stop(now + 0.04);
}

/** Two short triangle-wave beeps — classic "Sosumi"-style error alert. */
export function playBeep() {
  const pipe = ensure();
  if (!pipe) return;
  const { ctx: c, master: out } = pipe;
  const beep = (start: number) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.25, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.11);
    osc.connect(gain).connect(out);
    osc.start(start);
    osc.stop(start + 0.13);
  };
  beep(c.currentTime);
  beep(c.currentTime + 0.13);
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

/** Window opening — short ascending whoosh. */
export function playOpen() {
  const pipe = ensure();
  if (!pipe) return;
  whoosh(pipe.ctx, pipe.master, 500, 2400, 140);
}

/** Window closing — descending whoosh. */
export function playClose() {
  const pipe = ensure();
  if (!pipe) return;
  whoosh(pipe.ctx, pipe.master, 2200, 350, 120, 0.3);
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
