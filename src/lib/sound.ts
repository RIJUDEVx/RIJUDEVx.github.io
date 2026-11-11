// Tiny synthesised sound kit. No audio files: every sound is a few oscillators
// shaped with an envelope, so it's ~1 KB and plays instantly.
//
// Usage: import { play } from '../lib/sound'; play('tap');
// Or declaratively: <button data-sound="tap">. Base.astro wires up the delegation.

export type SoundName = 'tap' | 'copy' | 'toggle' | 'open' | 'close' | 'pick' | 'drop' | 'win' | 'intro';

const KEY = 'rd:sound';
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function isMuted(): boolean {
  try { return localStorage.getItem(KEY) === 'off'; } catch { return false; }
}

export function setMuted(muted: boolean) {
  try { localStorage.setItem(KEY, muted ? 'off' : 'on'); } catch {}
  window.dispatchEvent(new CustomEvent('sound:change', { detail: { muted } }));
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, opts: { type?: OscillatorType; gain?: number; to?: number } = {}) {
  const c = audio();
  if (!c || !master) return;
  const t = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(opts.gain ?? 0.6, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const kit: Record<SoundName, () => void> = {
  tap: () => tone(1800, 0, 0.035, { type: 'triangle', gain: 0.35 }),
  toggle: () => { tone(520, 0, 0.06, { type: 'square', gain: 0.12 }); tone(780, 0.04, 0.07, { type: 'square', gain: 0.1 }); },
  open: () => tone(440, 0, 0.12, { to: 880, gain: 0.3 }),
  close: () => tone(880, 0, 0.1, { to: 440, gain: 0.25 }),
  copy: () => { tone(1046, 0, 0.12, { gain: 0.4 }); tone(1568, 0.07, 0.18, { gain: 0.35 }); },
  pick: () => tone(300, 0, 0.05, { type: 'triangle', gain: 0.4 }),
  drop: () => tone(180, 0, 0.09, { type: 'triangle', to: 120, gain: 0.5 }),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.07, 0.25, { gain: 0.35 })),
  intro: () => { tone(196, 0, 0.9, { gain: 0.25 }); tone(294, 0.12, 0.9, { gain: 0.2 }); tone(392, 0.24, 1.1, { gain: 0.18 }); },
};

export function play(name: SoundName) {
  if (isMuted()) return;
  try { kit[name]?.(); } catch {}
}
