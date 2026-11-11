<script lang="ts">
  // One switch for the whole page: "tl;dr" or "the long version". Every section
  // carries both versions (so search engines and readers get all of it); this
  // flips <html data-depth> and the page morphs between them.
  import { onMount } from 'svelte';
  import { play } from '../lib/sound';

  let depth = $state<'short' | 'long'>('short');
  let pill: HTMLElement | undefined = $state();
  const btns: Record<string, HTMLElement> = {};
  let ix = $state(0), iw = $state(0);

  function measure() { const b = btns[depth]; if (b) { ix = b.offsetLeft; iw = b.offsetWidth; } }

  function set(d: 'short' | 'long') {
    if (d === depth) return;
    const apply = () => {
      depth = d;
      document.documentElement.dataset.depth = d;
      try { localStorage.setItem('rd:depth', d); } catch {}
      requestAnimationFrame(measure);
    };
    play('toggle');
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) doc.startViewTransition(apply);
    else apply();
  }

  onMount(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem('rd:depth'); } catch {}
    depth = saved === 'long' ? 'long' : 'short';
    document.documentElement.dataset.depth = depth;
    requestAnimationFrame(measure);
  });
</script>

<div class="depth" role="radiogroup" aria-label="How much to read" bind:this={pill}>
  <span class="ind" style={`transform:translateX(${ix}px);width:${iw}px`} aria-hidden="true"></span>
  <button bind:this={btns.short} role="radio" aria-checked={depth === 'short'} class:on={depth === 'short'} onclick={() => set('short')}>tl;dr</button>
  <button bind:this={btns.long} role="radio" aria-checked={depth === 'long'} class:on={depth === 'long'} onclick={() => set('long')}>the long version</button>
</div>

<style>
  .depth { position: relative; display: inline-flex; padding: 3px; border-radius: 999px; background: var(--surface); box-shadow: inset 0 0 0 1px var(--rule-strong); }
  .ind { position: absolute; top: 3px; left: 0; height: calc(100% - 6px); border-radius: 999px; background: var(--ink); transition: transform 0.35s cubic-bezier(0.34, 1.3, 0.64, 1), width 0.35s cubic-bezier(0.34, 1.3, 0.64, 1); }
  button { position: relative; z-index: 1; border: 0; background: none; cursor: pointer; padding: 6px 14px; border-radius: 999px; font-family: var(--font-mono); font-size: 0.75rem; color: var(--muted); transition: color 0.2s; }
  button.on { color: var(--paper); }
</style>
