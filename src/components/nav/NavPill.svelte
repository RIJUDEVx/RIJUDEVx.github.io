<script lang="ts">
  // Variant A, "Floating pill": a detached glass capsule centred at the top.
  // Links share one gliding hover highlight; a dot slides under the section in view.
  // Hides while you scroll down, comes back the moment you scroll up.
  import { onMount } from 'svelte';
  import { navItems, handle, createPageState, createFluidHover, createIndicator } from '../../lib/nav.svelte';
  import Controls from '../Controls.svelte';

  const page = createPageState();
  const fh = createFluidHover();
  const ind = createIndicator();
  let list: HTMLElement | undefined = $state();
  const links: Record<string, HTMLElement> = {};

  onMount(() => page.start());

  $effect(() => {
    const id = page.state.active;
    ind.track(list, id ? links[id] : null);
  });
</script>

<div class="wrap" class:away={page.state.hidden} class:solid={page.state.scrolled}>
  <nav class="pill" aria-label="Site">
    <a class="handle" href="/" data-sound="tap" aria-label={`${handle}, home`}>
      <span class="live" title="Open to team lead roles" aria-hidden="true"></span>{handle}
    </a>
    <span class="sep" aria-hidden="true"></span>
    <div class="links" bind:this={list} use:fh.container>
      <span class="hl" style={fh.style} aria-hidden="true"></span>
      <span class="ind" style={ind.style} aria-hidden="true"></span>
      {#each navItems as n (n.id)}
        <a href={n.href} use:fh.item bind:this={links[n.id]} data-sound="tap"
           class:on={page.state.active === n.id} aria-current={page.state.active === n.id ? 'location' : undefined}>
          <span class="t" data-text={n.label}>{n.label}</span>
        </a>
      {/each}
    </div>
    <span class="sep" aria-hidden="true"></span>
    <Controls />
  </nav>
</div>

<nav class="dock" aria-label="Site (mobile)" class:away={page.state.hidden}>
  {#each navItems as n (n.id)}
    <a href={n.href} data-sound="tap" class:on={page.state.active === n.id}>{n.label}</a>
  {/each}
</nav>

<style>
  .wrap { position: fixed; top: 12px; left: 0; right: 0; z-index: 50; display: flex; justify-content: center; pointer-events: none; transition: transform 0.32s var(--ease), opacity 0.2s; }
  .wrap.away { transform: translateY(-140%); opacity: 0; }
  .pill {
    pointer-events: auto; display: flex; align-items: center; gap: 6px; height: 48px; padding: 0 6px 0 16px;
    border-radius: 999px; border: 1px solid transparent;
    background: color-mix(in oklab, var(--paper) 55%, transparent);
    backdrop-filter: blur(14px) saturate(1.4); -webkit-backdrop-filter: blur(14px) saturate(1.4);
    transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  }
  .solid .pill { background: color-mix(in oklab, var(--surface) 80%, transparent); border-color: var(--rule); box-shadow: var(--shadow); }
  .handle { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.875rem; letter-spacing: -0.02em; color: var(--ink); text-decoration: none; }
  .live { width: 7px; height: 7px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 0 3px color-mix(in oklab, var(--ok) 22%, transparent); animation: pulse 2.4s ease-in-out infinite; }
  @keyframes pulse { 50% { box-shadow: 0 0 0 6px color-mix(in oklab, var(--ok) 0%, transparent); } }
  .sep { width: 1px; height: 18px; background: var(--rule-strong); margin: 0 6px; }
  .links { position: relative; display: flex; }
  .links a { position: relative; z-index: 1; padding: 7px 12px; font-size: 0.875rem; color: var(--muted); text-decoration: none; border-radius: 999px; transition: color 0.08s; }
  .links a:hover, .links a.on { color: var(--ink); }
  /* Heavier when active without nudging neighbours: the bold copy reserves the width. */
  .t { display: inline-grid; }
  .t::after { content: attr(data-text); font-weight: 600; visibility: hidden; height: 0; overflow: hidden; }
  .on .t { font-weight: 600; }
  .hl { position: absolute; top: 0; left: 0; border-radius: 999px; background: var(--accent-soft); pointer-events: none; transition: opacity 0.08s; }
  .ind { position: absolute; bottom: 1px; left: 0; height: 2px; pointer-events: none; display: flex; justify-content: center; transition: opacity 0.16s; }
  .ind::before { content: ''; width: 4px; height: 4px; margin-top: -1px; border-radius: 50%; background: var(--accent); }
  .pill :global(.controls) { gap: 0; }

  .dock { display: none; }
  @media (max-width: 720px) {
    .links, .sep:nth-of-type(2) { display: none; }
    .pill { padding-left: 14px; }
    .dock {
      display: flex; gap: 2px; position: fixed; z-index: 50; left: 50%; bottom: max(14px, env(safe-area-inset-bottom));
      transform: translateX(-50%); padding: 5px; border-radius: 999px;
      background: color-mix(in oklab, var(--surface) 86%, transparent); backdrop-filter: blur(14px);
      border: 1px solid var(--rule-strong); box-shadow: var(--shadow); transition: transform 0.32s var(--ease);
    }
    .dock.away { transform: translate(-50%, 160%); }
    .dock a { padding: 8px 12px; border-radius: 999px; font-size: 0.8125rem; color: var(--muted); text-decoration: none; }
    .dock a.on { color: var(--ink); background: var(--accent-soft); font-weight: 600; }
  }
</style>
