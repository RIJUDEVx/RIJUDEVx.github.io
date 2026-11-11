<script lang="ts">
  import { onMount } from 'svelte';
  import { play, isMuted, setMuted } from '../lib/sound';

  type Theme = 'light' | 'dark';

  // Defaults match the server render. Real values are read in onMount, so there is no hydration mismatch.
  let kbd = $state('⌘K');
  let muted = $state(false);
  let theme = $state<Theme>('light');
  let home = $state(false);

  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const readTheme = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

  function sync() {
    home = location.pathname === '/';
    theme = readTheme();
  }

  function openPalette() {
    window.dispatchEvent(new CustomEvent('palette:open'));
  }

  function toggleSound() {
    if (muted) {
      setMuted(false);
      play('toggle');
    } else {
      setMuted(true);
    }
  }

  function onSound(e: Event) {
    muted = (e as CustomEvent<{ muted: boolean }>).detail.muted;
  }

  // Injected once. Drives the circular reveal for the theme change.
  function injectViewTransitionStyle() {
    if (document.getElementById('rd-theme-vt')) return;
    const s = document.createElement('style');
    s.id = 'rd-theme-vt';
    s.textContent = `
      ::view-transition-old(root), ::view-transition-new(root) { animation: none; mix-blend-mode: normal; }
      ::view-transition-new(root) { animation: rd-reveal 0.6s var(--ease) both; }
      @keyframes rd-reveal {
        from { clip-path: circle(0px at var(--vt-x) var(--vt-y)); }
        to { clip-path: circle(var(--vt-r) at var(--vt-x) var(--vt-y)); }
      }`;
    document.head.append(s);
  }

  function toggleTheme(e: MouseEvent) {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    const apply = () => {
      document.documentElement.dataset.theme = next;
      theme = next;
      try { localStorage.setItem('rd:theme', next); } catch {}
    };

    play('toggle');

    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (!doc.startViewTransition || reduced()) {
      apply();
      return;
    }

    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const style = document.documentElement.style;
    style.setProperty('--vt-x', `${x}px`);
    style.setProperty('--vt-y', `${y}px`);
    style.setProperty('--vt-r', `${radius}px`);
    injectViewTransitionStyle();
    doc.startViewTransition(apply);
  }

  function replay() {
    window.dispatchEvent(new CustomEvent('intro:replay'));
  }

  onMount(() => {
    kbd = /Mac/i.test(navigator.platform) ? '⌘K' : 'Ctrl K';
    muted = isMuted();
    sync();

    window.addEventListener('sound:change', onSound);
    // Header persists across ClientRouter navigations, so re-check the path each time.
    document.addEventListener('astro:page-load', sync);

    return () => {
      window.removeEventListener('sound:change', onSound);
      document.removeEventListener('astro:page-load', sync);
    };
  });
</script>

<div class="controls">
  <button
    type="button"
    class="ctrl palette"
    aria-label="Open command palette"
    title={`Command palette (${kbd})`}
    onclick={openPalette}
  >
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
    <kbd class="chip">{kbd}</kbd>
  </button>

  <button
    type="button"
    class="ctrl"
    aria-label="Sound"
    aria-pressed={!muted}
    title={muted ? 'Sound off' : 'Sound on'}
    onclick={toggleSound}
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
      {#if muted}
        <path d="m16 9 5 6m0-6-5 6" />
      {:else}
        <path d="M15.5 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
      {/if}
    </svg>
  </button>

  <button
    type="button"
    class="ctrl"
    aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
    onclick={toggleTheme}
  >
    {#if theme === 'dark'}
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    {:else}
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    {/if}
  </button>

  {#if home}
    <button type="button" class="ctrl" aria-label="Replay intro" title="Replay intro" onclick={replay}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11 19 2 12l9-7v14z" />
        <path d="M22 19l-9-7 9-7v14z" />
      </svg>
    </button>
  {/if}
</div>

<style>
  .controls { display: flex; align-items: center; gap: 4px; }

  .ctrl {
    width: 32px; height: 32px; padding: 0;
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    border: 0; border-radius: 999px; background: transparent;
    color: var(--muted); cursor: pointer;
    transition: background 0.2s, color 0.2s;
  }
  .ctrl:hover { background: var(--accent-soft); color: var(--ink); }
  .ctrl svg {
    width: 16px; height: 16px; flex: none;
    fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round;
  }

  .palette { width: auto; padding: 0 6px; }
  .chip {
    font-family: var(--font-mono); font-size: 0.6875rem; line-height: 1;
    padding: 3px 5px; border: 1px solid var(--rule-strong); border-radius: 6px;
    color: var(--muted); white-space: nowrap;
  }

  /* Touch devices get just the search icon. */
  @media (hover: none), (pointer: coarse) {
    .palette { width: 32px; padding: 0; }
    .chip { display: none; }
  }
</style>
