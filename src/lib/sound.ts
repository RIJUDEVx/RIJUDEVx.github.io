// Tiny synthesised sound kit. No audio files: every sound is a few oscillators
// shaped with an envelope, so it's ~1 KB and plays instantly.
//
// Usage: import { play } from '../lib/sound'; play('tap');
// Or declaratively: <button data-sound="tap">. Base.astro wires up the delegation.

export type SoundName = 'tap' | 'copy' | 'toggle' | 'open' | 'close' | 'pick' | 'drop' | 'win' | 'intro' | 'hover' | 'deny';

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

// Browsers refuse audio until the visitor has clicked, tapped or pressed a key.
// Until then nothing here touches AudioContext, so the console stays quiet.
let unlocked = false;
if (typeof window !== 'undefined') {
  const unlock = () => { unlocked = true; removeEventListener('pointerdown', unlock, true); removeEventListener('keydown', unlock, true); };
  addEventListener('pointerdown', unlock, true); addEventListener('keydown', unlock, true);
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !unlocked) return null;
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
  hover: () => tone(2300, 0, 0.02, { gain: 0.05 }),
  deny: () => { tone(233, 0, 0.11, { type: 'square', gain: 0.13 }); tone(174, 0.1, 0.2, { type: 'square', gain: 0.13 }); },
  intro: () => { tone(196, 0, 0.9, { gain: 0.25 }); tone(294, 0.12, 0.9, { gain: 0.2 }); tone(392, 0.24, 1.1, { gain: 0.18 }); },
};

export function play(name: SoundName) {
  if (isMuted()) return;
  try { kit[name]?.(); } catch {}
}

// ───────── Music: a small generative chiptune loop, also synthesised (no audio file).
// Four bars (Am, F, C, G) at 96 bpm: a triangle bass, a square arpeggio and a
// pentatonic lead, through a low-pass so it sits quietly behind the page.
const MUSIC_KEY = 'rd:music';
const CHORDS = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]];
const SCALE = [440, 523.25, 587.33, 659.25, 783.99, 880];
const LEAD = [0, -1, 2, -1, 3, 2, -1, 4, 3, -1, 2, -1, 0, -1, 1, -1];
let bus: GainNode | null = null;
let timer = 0, stepNo = 0, nextAt = 0, playing = false;

function voice(freq: number, t: number, dur: number, type: OscillatorType, gain: number) {
  if (!ctx || !bus) return;
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(bus); osc.start(t); osc.stop(t + dur + 0.02);
}
function schedule() {
  if (!ctx) return;
  const sixteenth = 60 / 96 / 4;
  while (nextAt < ctx.currentTime + 0.3) {
    const bar = Math.floor(stepNo / 16) % 4, s = stepNo % 16, chord = CHORDS[bar];
    if (s % 8 === 0) voice(chord[0] / 2, nextAt, 0.7, 'triangle', 0.5);
    if (s % 2 === 0) voice(chord[(s / 2) % 3], nextAt, 0.13, 'square', 0.07);
    const l = LEAD[s];
    if (l >= 0 && (bar % 2 === 0 || s % 4 === 0)) voice(SCALE[(l + bar) % SCALE.length], nextAt, 0.22, 'square', 0.09);
    if (s % 4 === 2) voice(6200, nextAt, 0.03, 'triangle', 0.05);
    nextAt += sixteenth; stepNo++;
  }
}
export function musicPlaying() { return playing; }
export function setMusic(on: boolean) {
  try { sessionStorage.setItem(MUSIC_KEY, on ? 'on' : 'off'); } catch {}
  if (on === playing) return;
  const c = audio();
  if (!c) return;
  if (on) {
    if (!bus) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; bus = c.createGain(); bus.connect(lp).connect(c.destination); }
    bus.gain.cancelScheduledValues(c.currentTime); bus.gain.setValueAtTime(0.0001, c.currentTime); bus.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 0.4);
    stepNo = 0; nextAt = c.currentTime + 0.08; playing = true;
    schedule(); timer = window.setInterval(schedule, 100);
  } else {
    playing = false; clearInterval(timer);
    bus?.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.25);
  }
  window.dispatchEvent(new CustomEvent('music:change', { detail: { playing } }));
}
/** If music was on before a page change, pick it up again on the first click or key (browsers need a gesture). */
export function resumeMusic() {
  let want = false;
  try { want = sessionStorage.getItem(MUSIC_KEY) === 'on'; } catch {}
  if (!want || playing) return;
  const go = () => { removeEventListener('pointerdown', go); removeEventListener('keydown', go); setMusic(true); };
  addEventListener('pointerdown', go); addEventListener('keydown', go);
}
