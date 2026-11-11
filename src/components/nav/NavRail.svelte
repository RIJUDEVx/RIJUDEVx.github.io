<script lang="ts">
  // Variant C, "Command rail": a full-width, product-style bar (think Linear/Vercel).
  // Left: handle with a breadcrumb of the section in view. Right: links with one
  // gliding highlight, and a search-field button that opens ⌘K. A hairline along
  // the bottom fills as you read.
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { navItems, handle, createPageState, createFluidHover, createIndicator, reducedMotion } from '../../lib/nav.svelte';
  import Controls from '../Controls.svelte';

  const page = createPageState();
  const fh = createFluidHover();
  const ind = createIndicator();
  let list: HTMLElement | undefined = $state();
  const links: Record<string, HTMLElement> = {};
  let kbd = $state('⌘K');

  onMount(() => {
    if (!/Mac|iPhone|iPad/.test(navigator.platform)) kbd = 'Ctrl K';
    return page.start();
  });
  $effect(() => { ind.track(list, page.state.active ? links[page.state.active] : null); });
  const dur = () => (reducedMotion() ? 0 : 160);
</script>

<header class="rail" class:solid={page.state.scrolled}>
  <div class="inner">
    <a class="brand" href="/" data-sound="tap" aria-label={`${handle}, home`}>
      <span class="mark" aria-hidden="true">rd</span>
      <span class="h">{handle}</span>
    </a>
    <span class="crumb" aria-live="polite">
      {#if page.state.label && page.state.label !== 'Home'}
        {#key page.state.label}
          <span class="c" in:fly={{ y: 6, duration: dur() }}><span class="slash">/</span>{page.state.label}</span>
        {/key}
      {/if}
    </span>

    <nav class="links" aria-label="Site" bind:this={list} use:fh.container>
      <span class="hl" style={fh.style} aria-hidden="true"></span>
      <span class="ind" style={ind.style} aria-hidden="true"></span>
      {#each navItems as n (n.id)}
        <a href={n.href} use:fh.item bind:this={links[n.id]} data-sound="tap" class:on={page.state.active === n.id}
           aria-current={page.state.active === n.id ? 'location' : undefined}><span class="t" data-text={n.label}>{n.label}</span></a>
      {/each}
    </nav>

    <button class="search" onclick={() => window.dispatchEvent(new CustomEvent('palette:open'))} data-sound="tap" aria-label="Search and jump">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <span class="ph">Jump to…</span><kbd>{kbd}</kbd>
    </button>
    <div class="ctl"><Controls /></div>
  </div>
  <span class="progress" style={`transform: scaleX(${page.state.progress})`} aria-hidden="true"></span>
</header>

<style>
  .rail { position: sticky; top: 0; z-index: 50; width: 100vw; margin-left: calc(50% - 50vw); background: color-mix(in oklab, var(--paper) 72%, transparent); backdrop-filter: blur(12px) saturate(1.3); -webkit-backdrop-filter: blur(12px) saturate(1.3); border-bottom: 1px solid transparent; transition: border-color 0.2s, background 0.2s; }
  .rail.solid { border-bottom-color: var(--rule); background: color-mix(in oklab, var(--paper) 86%, transparent); }
  .inner { max-width: calc(var(--col) + 2 * var(--gutter) + 240px); margin: 0 auto; height: 56px; padding: 0 var(--gutter); display: flex; align-items: center; gap: 10px; }
  .brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; color: var(--ink); }
  .mark { width: 26px; height: 26px; border-radius: 7px; background: var(--ink); color: var(--paper); display: grid; place-items: center; font-size: 0.75rem; font-weight: 700; letter-spacing: -0.06em; }
  .h { font-weight: 600; font-size: 0.9375rem; letter-spacing: -0.02em; }
  .crumb { display: grid; min-width: 0; overflow: hidden; white-space: nowrap; font-size: 0.875rem; color: var(--muted); }
  .crumb > * { grid-area: 1 / 1; }
  .c { display: inline-block; }
  .slash { margin: 0 8px 0 2px; color: var(--rule-strong); }
  .links { position: relative; display: flex; margin-left: auto; }
  .links a { position: relative; z-index: 1; padding: 6px 11px; border-radius: 8px; font-size: 0.875rem; color: var(--muted); text-decoration: none; transition: color 0.08s; }
  .links a:hover, .links a.on { color: var(--ink); }
  .t { display: inline-grid; }
  .t::after { content: attr(data-text); font-weight: 600; visibility: hidden; height: 0; overflow: hidden; }
  .on .t { font-weight: 600; }
  .hl { position: absolute; top: 0; left: 0; border-radius: 8px; background: var(--accent-soft); pointer-events: none; transition: opacity 0.08s; }
  .ind { position: absolute; bottom: -11px; left: 0; height: 2px; background: var(--ink); border-radius: 2px; pointer-events: none; transition: opacity 0.16s; }
  .search { display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 6px 0 10px; margin-left: 6px; border-radius: 8px; border: 1px solid var(--rule-strong); background: var(--surface); color: var(--muted); cursor: pointer; font-size: 0.8125rem; transition: border-color 0.08s, color 0.08s; }
  .search:hover { border-color: var(--ink); color: var(--ink); }
  .search kbd { font-family: var(--font-mono); font-size: 0.6875rem; padding: 1px 5px; border-radius: 4px; border: 1px solid var(--rule); }
  .ctl :global(.controls) { gap: 0; }
  .ctl :global(.controls > button:first-child) { display: none; } /* the search field replaces the ⌘K chip */
  .progress { position: absolute; left: 0; right: 0; bottom: -1px; height: 1px; background: var(--accent); transform-origin: 0 50%; }
  @media (max-width: 760px) {
    .links, .ph, .search kbd { display: none; }
    .search { padding: 0 9px; margin-left: auto; }
    .inner { gap: 6px; }
    .crumb { font-size: 0.8125rem; }
  }
</style>
