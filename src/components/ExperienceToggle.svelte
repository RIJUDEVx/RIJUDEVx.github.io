<script lang="ts">
  import { tick } from 'svelte';
  import { play } from '../lib/sound';

  let { company, role, dates, tldr, long }: {
    company: string;
    role: string;
    dates: string;
    tldr: string;
    long: string[];
  } = $props();

  type Tab = 'tldr' | 'long';
  let tab = $state<Tab>('tldr');

  let wrap: HTMLDivElement | undefined;
  let inner: HTMLDivElement | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function reduced() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  async function select(next: Tab) {
    if (next === tab) return;
    play('tap');

    // Measure the old height before the DOM changes, then animate to the new one.
    const from = wrap?.offsetHeight ?? 0;
    tab = next;
    if (!wrap || !inner || reduced()) return;

    clearTimeout(timer);
    wrap.style.height = from + 'px';
    await tick();
    const to = inner.offsetHeight;
    void wrap.offsetHeight; // commit the starting height before animating
    wrap.style.height = to + 'px';
    timer = setTimeout(() => {
      if (wrap) wrap.style.height = '';
    }, 320);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next: Tab = tab === 'tldr' ? 'long' : 'tldr';
    select(next);
    document.getElementById(`exp-tab-${next}`)?.focus();
  }

  $effect(() => () => clearTimeout(timer));
</script>

<article class="exp">
  <header class="head">
    <div class="title">
      <h3>{role}</h3>
      <span class="at">at</span>
      <span class="co">{company}</span>
      <span class="badge" data-tone="ok">working</span>
    </div>

    <div class="seg" role="tablist" aria-label="Detail level" tabindex="-1" onkeydown={onKey}>
      <button
        type="button"
        role="tab"
        id="exp-tab-tldr"
        aria-selected={tab === 'tldr'}
        aria-controls="exp-panel"
        tabindex={tab === 'tldr' ? 0 : -1}
        onclick={() => select('tldr')}
      >tl;dr</button>
      <button
        type="button"
        role="tab"
        id="exp-tab-long"
        aria-selected={tab === 'long'}
        aria-controls="exp-panel"
        tabindex={tab === 'long' ? 0 : -1}
        onclick={() => select('long')}
      >the long version</button>
    </div>
  </header>

  <p class="when mono">{dates} • Kolkata</p>

  <div class="panel" bind:this={wrap}>
    <div class="inner" bind:this={inner} id="exp-panel" role="tabpanel" aria-labelledby={`exp-tab-${tab}`}>
      {#if tab === 'tldr'}
        <p class="tldr">{tldr}</p>
      {:else}
        <ul class="long">
          {#each long as item (item)}
            <li>{item}</li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
</article>

<style>
  .head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px 20px; flex-wrap: wrap; }
  .title { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px; min-width: 0; }
  h3 { font-size: 1.0625rem; font-weight: 600; color: var(--ink); margin: 0; letter-spacing: -0.01em; }
  .at, .co { font-size: 0.8125rem; color: var(--text); }
  .badge { font-size: 0.625rem; padding: 0 6px; align-self: center; }
  .badge::before { width: 4px; height: 4px; }
  .when { margin: 4px 0 0; font-size: 0.75rem; color: var(--text); }

  /* Quiet text toggle: mono, with a small underline under the active tab. */
  .seg { display: flex; gap: 14px; flex: none; margin-left: auto; }
  .seg button {
    position: relative; padding: 2px 0; border: 0; background: none; cursor: pointer;
    font-family: var(--font-mono); font-size: 0.75rem; white-space: nowrap;
    color: var(--muted); transition: color 0.2s;
  }
  .seg button:hover { color: var(--ink); }
  .seg button::after {
    content: ''; position: absolute; left: 0; right: 0; bottom: -4px; height: 1px;
    background: var(--ink); transform: scaleX(0); transform-origin: left center;
    transition: transform 0.3s var(--ease);
  }
  .seg button[aria-selected='true'] { color: var(--ink); }
  .seg button[aria-selected='true']::after { transform: scaleX(1); }

  .panel { overflow: hidden; transition: height 0.3s var(--ease); margin-top: 14px; padding-left: 20px; }
  .tldr { margin: 0; font-size: 0.9375rem; line-height: 1.6; color: var(--text); }
  .long { list-style: none; margin: 0; padding: 0; font-size: 0.9375rem; line-height: 1.6; color: var(--text); }
  .long li { position: relative; padding-left: 1.25em; }
  .long li + li { margin-top: 8px; }
  .long li::before { content: '–'; position: absolute; left: 0; color: var(--muted); }

  @media (max-width: 640px) {
    .seg { margin-left: 0; }
  }
</style>
