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
    <div class="logo" aria-hidden="true">{company.charAt(0)}</div>
    <div class="who">
      <div class="name-row">
        <h3 class="name">{company}</h3>
        <span class="badge" data-tone="ok">working</span>
      </div>
      <p class="role muted">{role}</p>
    </div>
    <span class="mono muted dates">{dates}</span>
  </header>

  <div class="seg" role="tablist" aria-label="Detail level" tabindex="-1" onkeydown={onKey}>
    <span class="thumb" aria-hidden="true" style:transform={tab === 'long' ? 'translateX(100%)' : 'translateX(0)'}></span>
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
  .head { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
  .logo {
    flex: none; width: 36px; height: 36px; border-radius: 10px;
    border: 1px solid var(--rule-strong); background: var(--surface); color: var(--ink);
    display: grid; place-items: center; font-family: var(--font-display); font-size: 1.25rem; line-height: 1;
  }
  .who { flex: 1; min-width: 0; }
  .name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .name { font-family: var(--font-sans); font-size: 1.0625rem; font-weight: 600; color: var(--ink); margin: 0; }
  .role { margin: 2px 0 0; font-size: 0.9375rem; }
  .dates { white-space: nowrap; font-size: 0.8125rem; }

  .seg {
    position: relative; display: inline-grid; grid-template-columns: 1fr 1fr;
    max-width: 100%; padding: 3px; border: 1px solid var(--rule-strong); border-radius: 999px;
    background: var(--surface);
  }
  .thumb {
    position: absolute; top: 3px; bottom: 3px; left: 3px;
    width: calc((100% - 6px) / 2);
    border-radius: 999px; background: var(--paper); border: 1px solid var(--rule-strong);
    box-shadow: var(--shadow);
    transition: transform 0.3s var(--ease);
  }
  .seg button {
    position: relative; z-index: 1; border: 0; background: none; cursor: pointer;
    padding: 6px 14px; border-radius: 999px; white-space: nowrap;
    font-size: 0.8125rem; color: var(--muted); transition: color 0.2s;
  }
  .seg button[aria-selected='true'] { color: var(--ink); }

  .panel { overflow: hidden; transition: height 0.3s var(--ease); margin-top: 18px; }
  .tldr { margin: 0; font-size: 1.0625rem; color: var(--text); }
  .long { list-style: none; margin: 0; padding: 0; color: var(--text); }
  .long li { position: relative; padding-left: 1.25em; }
  .long li + li { margin-top: 10px; }
  .long li::before { content: '–'; position: absolute; left: 0; color: var(--muted); }
</style>
