<script lang="ts">
  // The stack as a keyboard: every tool is a keycap with its logo. Hover lifts a key
  // (its name is in the tooltip); clicking presses it with a click.
  // Typing a letter while the tile is hovered presses the matching key.
  import { play } from '../../lib/sound';
  // Logos ship in this island's own JS chunk (cached, compressed) instead of the page HTML.
  const files = import.meta.glob('../../assets/brands/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const svgFor = (icon: string) => (files[`../../assets/brands/${icon}.svg`] ?? '').replace(/<\?xml[^>]*>/, '').replace(/\s(width|height)="[^"]*"/g, '');
  interface Props { items: { label: string; icon: string }[] }
  let { items }: Props = $props();

  let lit = $state<number | null>(null);
  let pressed = $state<number | null>(null);
  let over = $state(false);

  function press(i: number) {
    pressed = i; lit = i;
    play('tap');
    setTimeout(() => { if (pressed === i) pressed = null; }, 140);
  }
  function onKey(e: KeyboardEvent) {
    if (!over || e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
    const k = e.key.toLowerCase();
    const start = lit === null ? 0 : lit + 1;
    for (let j = 0; j < items.length; j++) {
      const i = (start + j) % items.length;
      if (items[i].label.toLowerCase().startsWith(k)) { press(i); break; }
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="keys" onpointerenter={() => (over = true)} onpointerleave={() => { over = false; lit = null; }}>
  <div class="top">
    <span class="k mono">Stack</span>
  </div>
  <div class="board">
    {#each items as it, i (it.label)}
      <button class="key" class:lit={lit === i} class:down={pressed === i}
              aria-label={it.label} title={it.label}
              onpointerenter={() => (lit = i)} onfocus={() => (lit = i)} onclick={() => press(i)}>
        <span class="cap">{@html svgFor(it.icon)}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .keys { display: flex; flex-direction: column; gap: 12px; height: 100%; }
  .top { display: flex; align-items: center; }
  .k { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }
  .board { display: grid; grid-template-columns: repeat(13, minmax(0, 1fr)); gap: 8px; }
  @media (max-width: 760px) { .board { grid-template-columns: repeat(7, minmax(0, 1fr)); } }
  .key {
    position: relative; aspect-ratio: 1; border: 0; padding: 0; cursor: pointer; border-radius: 10px;
    background: linear-gradient(180deg, color-mix(in oklab, var(--surface) 70%, #fff 6%), var(--surface));
    box-shadow: 0 1px 0 rgb(255 255 255 / 0.06) inset, 0 3px 0 color-mix(in oklab, var(--rule-strong) 90%, #000), 0 4px 8px -2px rgb(0 0 0 / 0.35);
    transform: translateY(0); transition: transform 0.12s var(--ease), box-shadow 0.12s var(--ease);
  }
  .cap { position: absolute; inset: 6px; display: grid; place-items: center; border-radius: 7px; background: var(--paper); box-shadow: inset 0 0 0 1px var(--rule); }
  .cap :global(svg) { width: 50%; height: 50%; max-width: 22px; max-height: 22px; filter: grayscale(1) opacity(0.85); transition: filter 0.15s; }
  .key.lit { transform: translateY(-2px); }
  .key.lit .cap :global(svg) { filter: none; }
  .key.down { transform: translateY(3px); box-shadow: 0 1px 0 rgb(255 255 255 / 0.06) inset, 0 0 0 color-mix(in oklab, var(--rule-strong) 90%, #000), 0 1px 3px rgb(0 0 0 / 0.3); }
  .key:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
</style>
