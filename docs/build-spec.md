# Build spec (for anyone writing a component)

Personal site for Riju Dev Purkayastha. Astro 7 + Svelte 5 (runes: `$state`, `$derived`, `$effect`, `$props`), static output, deployed to GitHub Pages. TypeScript in `<script lang="ts">`.

Goal: professional first, with creative touches that stand out. Every effect must have a purpose. Calm, typographic, one centred 720px column.

## Rules for every component

- **Style only with the CSS variables in `src/styles/global.css`:** `--paper --surface --ink --text --muted --rule --rule-strong --accent --accent-soft --ok --warn --danger --shadow --font-sans --font-mono --font-display --radius --ease --gutter`. Never hard-code colours, so light and dark both work (dark = `:root[data-theme='dark']`).
- **Use the existing classes** where they fit: `.pill`, `.badge` (with `data-tone="ok|pilot|past"`), `.mono`, `.muted`, `.display`.
- **Sound:** `import { play } from '../lib/sound'`, then `play('tap' | 'copy' | 'toggle' | 'open' | 'close' | 'pick' | 'drop' | 'win' | 'intro')`. Or put `data-sound="tap"` on a clickable element. Sounds must be meaningful: one per real action, never on hover.
- **Motion:** respect `prefers-reduced-motion: reduce`. Check `matchMedia('(prefers-reduced-motion: reduce)').matches` in JS and skip or shorten the animation.
- **Touch:** everything must work by tap on a phone at 360px wide. Nothing important can depend on hover alone.
- **Accessibility:** real buttons for actions, `aria-label` on icon-only buttons, visible focus, Escape closes overlays, and focus returns to the trigger.
- **No new npm dependencies** except what is in package.json (`lenis` is available).
- **Page transitions:** the site uses Astro's `<ClientRouter />`. Code that touches the DOM must also re-run on `astro:page-load` where it matters.
- **Facts:** take them only from `src/data/site.ts`. Never invent numbers, clients, dates or claims about Riju.
- **Storage:** wrap any `localStorage` access in try/catch.
- Keep each file self-contained, with scoped `<style>`.

## Global events (window CustomEvents)

- `intro:replay`: Controls fires it, and Intro listens and plays again.
- `palette:open`: anything can fire it to open the command palette.
- `sound:change` (`detail: { muted }`): fired by `setMuted` in `src/lib/sound.ts`.
