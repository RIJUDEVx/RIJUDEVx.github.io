// Shared rendering for the generated images: OG cards, app icons and favicons.
// Built with satori (JSX-like object trees) and rasterised with Resvg.

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { profile, statusLabel, type Status } from '../data/site';

// Colour tokens from src/styles/global.css (dark theme).
export const colors = {
  paper: '#faf9f5',
  ink: '#141413',
  text: '#b0aea5',
  muted: '#87867f',
  dot: '#2e2e2a',
  ok: '#3ecf7a',
  accent: '#7d9bff',
};

const toneColor: Record<'ok' | 'pilot' | 'past', string> = {
  ok: colors.ok,
  pilot: colors.accent,
  past: colors.muted,
};

// A satori node: the `{ type, props }` object form, no React needed.
export type Node = { type: string; props: { style?: Record<string, unknown>; children?: unknown; [key: string]: unknown } };

const el = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style: { display: 'flex', ...style }, children },
});

const MONO = 'Roboto Mono';
const SANS = 'Inter';

// Fonts: satori needs .woff (not .woff2). Read once, then reuse.
const requireFromHere = createRequire(import.meta.url);
const readFont = (spec: string): ArrayBuffer => {
  const buf = readFileSync(requireFromHere.resolve(spec));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
};

let fontCache: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 500 | 600; style: 'normal' }[]> | undefined;
const getFonts = () => {
  fontCache ??= Promise.resolve([
    { name: SANS, data: readFont('@fontsource/inter/files/inter-latin-400-normal.woff'), weight: 400 as const, style: 'normal' as const },
    { name: SANS, data: readFont('@fontsource/inter/files/inter-latin-500-normal.woff'), weight: 500 as const, style: 'normal' as const },
    { name: SANS, data: readFont('@fontsource/inter/files/inter-latin-600-normal.woff'), weight: 600 as const, style: 'normal' as const },
    { name: MONO, data: readFont('@fontsource/roboto-mono/files/roboto-mono-latin-400-normal.woff'), weight: 400 as const, style: 'normal' as const },
  ]);
  return fontCache;
};

// Render a node tree to PNG bytes.
export async function renderPng(root: Node, width: number, height: number): Promise<Uint8Array> {
  const svg = await satori(root as unknown as Parameters<typeof satori>[0], {
    width,
    height,
    fonts: await getFonts(),
  });
  return new Resvg(svg).render().asPng();
}

// Subtle dot grid, drawn as an SVG image so satori can place it behind the content.
function dotGrid(width: number, height: number, step = 32, r = 1.2): Node {
  let dots = '';
  for (let y = step / 2; y < height; y += step) {
    for (let x = step / 2; x < width; x += step) {
      dots += `<circle cx="${x}" cy="${y}" r="${r}"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g fill="${colors.dot}">${dots}</g></svg>`;
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  return {
    type: 'img',
    props: { src, width, height, style: { position: 'absolute', left: 0, top: 0 } },
  };
}

const W = 1200;
const H = 630;
const PAD = 72;

// Shared frame: ink background, dot grid, top-left label, bottom-right name.
// The content box is sized explicitly (1200 - 2 x 72 by 630 - 2 x 72) so satori never has to guess it.
const INNER_W = W - 2 * PAD;
const INNER_H = H - 2 * PAD;
function frame(body: Node[]): Node {
  const label = el('div', { fontFamily: MONO, fontSize: 22, color: colors.muted, letterSpacing: 0.4 }, 'rijudevx.github.io');
  const name = el('div', { fontFamily: SANS, fontWeight: 500, fontSize: 22, color: colors.text, letterSpacing: -0.2 }, profile.name);
  return el(
    'div',
    {
      position: 'relative',
      width: W,
      height: H,
      flexDirection: 'column',
      background: colors.ink,
      padding: PAD,
      fontFamily: SANS,
      overflow: 'hidden',
    },
    [
      dotGrid(W, H),
      el('div', { position: 'relative', width: INNER_W, height: INNER_H, flexDirection: 'column' }, [
        label,
        el('div', { width: INNER_W, flexGrow: 1, flexDirection: 'column', justifyContent: 'center' }, body),
        el('div', { width: INNER_W, justifyContent: 'flex-end' }, [name]),
      ]),
    ],
  );
}

// Home card, after the reference portfolios (Krishna's drawing of himself, Kislay's
// photo card): the pixel portrait stands on the right, the name sits on the left.
// Name only, no designation.
export function homeCard(): Node {
  // The pixel portrait, pre-scaled 9x with hard edges (see docs/portrait.md).
  const png = readFileSync('src/assets/portrait-og.png') // builds run from the project root;
  const art: Node = { type: 'img', props: { src: `data:image/png;base64,${png.toString('base64')}`, width: 432, height: 522, style: { position: 'absolute', right: 84, top: H - 522 } } };
  const left = el('div', { position: 'absolute', left: PAD, top: PAD, bottom: PAD, width: 520, flexDirection: 'column', justifyContent: 'space-between' }, [
    el('div', { fontFamily: MONO, fontSize: 22, color: colors.muted, letterSpacing: 0.4 }, 'rijudevx.github.io'),
    el('div', { flexDirection: 'column' }, [
      el('div', { fontFamily: MONO, fontSize: 22, color: colors.accent, marginBottom: 18 }, `@${profile.handle}`),
      el('div', { fontWeight: 600, fontSize: 92, color: colors.paper, letterSpacing: -4.2, lineHeight: 0.98 }, 'Riju Dev'),
      el('div', { fontWeight: 600, fontSize: 92, color: colors.paper, letterSpacing: -4.2, lineHeight: 0.98 }, 'Purkayastha'),
    ]),
    el('div', { fontFamily: MONO, fontSize: 20, color: colors.muted }, 'Kolkata, India'),
  ]);
  return el('div', { position: 'relative', width: W, height: H, background: colors.ink, fontFamily: SANS, overflow: 'hidden' }, [
    dotGrid(W, H),
    art,
    left,
  ]);
}

export function workCard(data: {
  title: string;
  summary: string;
  status: Status;
  stats: { value: string; label: string }[];
}): Node {
  const { text, tone } = statusLabel[data.status];
  const c = toneColor[tone];
  const pill = el(
    'div',
    {
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 10,
      padding: '8px 18px',
      borderRadius: 999,
      border: `1.5px solid ${c}66`,
      fontFamily: MONO,
      fontSize: 18,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      color: c,
      marginBottom: 4,
    },
    [el('div', { width: 8, height: 8, borderRadius: 4, background: c }), text],
  );
  const title = el('div', { fontWeight: 500, fontSize: 84, color: colors.paper, letterSpacing: -2.9, lineHeight: 1.05, marginTop: 28 }, data.title);
  const summary = el('div', { fontWeight: 400, fontSize: 27, color: colors.text, lineHeight: 1.4, marginTop: 20, maxWidth: 900 }, data.summary);
  const stats = data.stats.slice(0, 3).map((s) =>
    el('div', { flexDirection: 'column' }, [
      el('div', { fontWeight: 500, fontSize: 56, color: colors.paper, letterSpacing: -1.6, lineHeight: 1.1 }, s.value),
      el('div', { fontFamily: MONO, fontSize: 16, color: colors.muted, marginTop: 8 }, s.label),
    ]),
  );
  const statRow = stats.length ? [el('div', { gap: 64, marginTop: 40 }, stats)] : [];
  return frame([pill, title, summary, ...statRow]);
}

// The rd monogram: a tile with "rd" centred in Inter 600, tight tracking.
export function mark(opts: { size: number; radius: number; fontSize: number; bg: string; fg: string }): Node {
  return el(
    'div',
    {
      width: opts.size,
      height: opts.size,
      borderRadius: opts.radius,
      background: opts.bg,
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: SANS,
      fontWeight: 600,
      fontSize: opts.fontSize,
      letterSpacing: -0.06 * opts.fontSize,
      color: opts.fg,
      lineHeight: 1,
    },
    'rd',
  );
}

// Full-bleed square icon (apple-touch, maskable). "rd" sits in the centre of the square.
export function squareIcon(size: number, fontSize: number): Node {
  return mark({ size, radius: 0, fontSize, bg: colors.ink, fg: colors.paper });
}

// Rounded tile matching favicon.svg (rx about 22%), for the 32px favicon.
export function roundedIcon(size: number, fontSize: number): Node {
  return mark({ size, radius: Math.round(size * 0.22), fontSize, bg: colors.ink, fg: colors.paper });
}
