<script lang="ts">
  // Review-only control for comparing nav designs. Remove with the unused variants.
  import { onMount } from 'svelte';
  import { play } from '../../lib/sound';
  const options = [
    { id: 'pill', label: 'A · Pill' },
    { id: 'island', label: 'B · Island' },
    { id: 'rail', label: 'C · Rail' },
    { id: 'classic', label: 'Current' },
  ];
  let current = $state('pill');
  onMount(() => { current = document.documentElement.dataset.nav ?? 'pill'; });
  function pick(id: string) {
    current = id;
    document.documentElement.dataset.nav = id;
    try { localStorage.setItem('rd:nav', id); } catch {}
    const u = new URL(location.href); u.searchParams.set('nav', id); history.replaceState(history.state, '', u);
    play('tap');
  }
</script>

<div class="sw" role="radiogroup" aria-label="Nav design">
  <span class="mono">nav</span>
  {#each options as o (o.id)}
    <button role="radio" aria-checked={current === o.id} class:on={current === o.id} onclick={() => pick(o.id)}>{o.label}</button>
  {/each}
</div>

<style>
  .sw { position: fixed; left: 12px; bottom: 12px; z-index: 95; display: flex; align-items: center; gap: 2px; padding: 4px; border-radius: 12px; background: var(--surface); border: 1px solid var(--rule-strong); box-shadow: var(--shadow); }
  .mono { padding: 0 6px; color: var(--muted); font-size: 0.6875rem; }
  button { border: 0; background: none; padding: 6px 9px; border-radius: 8px; font-size: 0.75rem; color: var(--muted); cursor: pointer; }
  button.on { background: var(--ink); color: var(--paper); }
  @media (max-width: 720px) { .sw { bottom: auto; top: auto; left: 8px; right: 8px; bottom: 76px; justify-content: center; } }
</style>
