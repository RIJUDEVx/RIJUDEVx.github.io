<script lang="ts">
  // Variant B, "Island": a small dark capsule at the top that always tells you
  // where you are (handle · section · Kolkata time). Hover, focus or tap and it
  // morphs open into the full menu. Works the same on phones (tap).
  import { onMount, tick } from 'svelte';
  import { Spring } from 'svelte/motion';
  import { fade } from 'svelte/transition';
  import { navItems, handle, createPageState, createFluidHover, reducedMotion } from '../../lib/nav.svelte';
  import { play } from '../../lib/sound';
  import { profile } from '../../data/site';

  const page = createPageState();
  const fh = createFluidHover({ axis: 'y' });
  let open = $state(false);
  let time = $state('');
  let shell: HTMLElement | undefined = $state();
  let closedEl: HTMLElement | undefined = $state();
  let openEl: HTMLElement | undefined = $state();
  // The island is the one place that animates size: it is the whole point of the morph.
  const w = new Spring(0, { stiffness: 0.24, damping: 0.78 });
  const h = new Spring(0, { stiffness: 0.24, damping: 0.78 });
  let closeTimer: ReturnType<typeof setTimeout>;

  function tickTime() {
    time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: profile.timezone }).format(new Date()).toLowerCase();
  }

  async function measure(instant = false) {
    await tick();
    const el = open ? openEl : closedEl;
    if (!el) return;
    const o = { instant: instant || reducedMotion() };
    w.set(el.offsetWidth, o);
    h.set(el.offsetHeight, o);
  }

  function setOpen(v: boolean) {
    clearTimeout(closeTimer);
    if (v === open) return;
    open = v;
    play(v ? 'open' : 'close');
    measure();
  }
  const softClose = () => { closeTimer = setTimeout(() => setOpen(false), 180); };

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('rd:theme', next); } catch {}
    play('toggle');
  }

  onMount(() => {
    const stop = page.start();
    tickTime();
    const t = setInterval(tickTime, 15000);
    measure(true);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) setOpen(false); };
    const onDoc = (e: PointerEvent) => { if (open && shell && !shell.contains(e.target as Node)) setOpen(false); };
    const onNav = () => setOpen(false);
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('astro:page-load', onNav);
    return () => { stop(); clearInterval(t); window.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDoc); document.removeEventListener('astro:page-load', onNav); };
  });

  // The collapsed label changes width as sections change; keep the shell fitted.
  $effect(() => { page.state.label; time; if (!open) measure(); });
</script>

<div class="anchor">
  <div
    class="island" class:open bind:this={shell}
    style={w.current ? `width:${w.current}px;height:${h.current}px` : ''}
    role="navigation" aria-label="Site"
    onpointerenter={(e) => { if (e.pointerType !== 'touch') setOpen(true); }}
    onpointerleave={(e) => { if (e.pointerType !== 'touch') softClose(); }}
    onfocusin={() => setOpen(true)}
    onfocusout={(e) => { if (!shell?.contains(e.relatedTarget as Node)) softClose(); }}
  >
    {#if !open}
      <button class="closed" bind:this={closedEl} onclick={() => setOpen(true)} aria-expanded="false" aria-label="Open menu" in:fade={{ duration: 120, delay: 60 }}>
        <span class="live" aria-hidden="true"></span>
        <span class="h">{handle}</span>
        <span class="div" aria-hidden="true">/</span>
        {#key page.state.label}
          <span class="sec" in:fade={{ duration: 160 }}>{page.state.label || 'Home'}</span>
        {/key}
        <span class="time mono">{time}</span>
      </button>
    {:else}
      <div class="panel" bind:this={openEl} in:fade={{ duration: 120, delay: 40 }}>
        <div class="top">
          <a class="h big" href="/" data-sound="tap"><span class="live" aria-hidden="true"></span>{handle}</a>
          <span class="mono dim">{profile.city.split(',')[0]} · {time}</span>
        </div>
        <div class="list" use:fh.container>
          <span class="hl" style={fh.style} aria-hidden="true"></span>
          {#each navItems as n, i (n.id)}
            <a href={n.href} use:fh.item data-sound="tap" class:on={page.state.active === n.id}>
              <span class="mono num">0{i + 1}</span><span>{n.label}</span><span class="arrow" aria-hidden="true">→</span>
            </a>
          {/each}
        </div>
        <div class="acts">
          <button onclick={() => window.dispatchEvent(new CustomEvent('palette:open'))} data-sound="tap">Search <kbd>⌘K</kbd></button>
          <button onclick={toggleTheme}>Theme</button>
          <a href="/resume.pdf" data-sound="tap">Resume</a>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .anchor { position: fixed; top: 12px; left: 0; right: 0; z-index: 50; display: flex; justify-content: center; pointer-events: none; }
  .island {
    pointer-events: auto; overflow: hidden; border-radius: 22px;
    background: #141413; color: #faf9f5;
    box-shadow: 0 10px 30px -12px rgb(0 0 0 / 0.45), inset 0 0 0 1px rgb(255 255 255 / 0.06);
    transition: border-radius 0.24s var(--ease);
  }
  :global(:root[data-theme='dark']) .island { background: #faf9f5; color: #141413; box-shadow: 0 10px 30px -12px rgb(0 0 0 / 0.6); }
  .island.open { border-radius: 26px; }
  .closed { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 16px 0 14px; white-space: nowrap; cursor: pointer; font-size: 0.8125rem; }
  .closed:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; border-radius: 22px; }
  .live { width: 7px; height: 7px; border-radius: 50%; background: #3ecf7a; flex: none; }
  .h { font-weight: 600; letter-spacing: -0.02em; }
  .div { opacity: 0.35; }
  .sec { opacity: 0.85; }
  .time { opacity: 0.55; font-size: 0.6875rem; margin-left: 6px; }

  .panel { width: min(360px, calc(100vw - 24px)); padding: 16px; box-sizing: border-box; }
  .top { display: flex; justify-content: space-between; align-items: center; padding: 0 6px 12px; }
  .big { display: inline-flex; align-items: center; gap: 8px; color: inherit; text-decoration: none; font-size: 0.9375rem; }
  .dim { opacity: 0.55; font-size: 0.6875rem; }
  .list { position: relative; display: grid; }
  .list a { position: relative; z-index: 1; display: grid; grid-template-columns: 28px 1fr auto; align-items: center; padding: 10px 8px; border-radius: 12px; color: inherit; text-decoration: none; font-size: 1.0625rem; font-weight: 500; letter-spacing: -0.02em; }
  .list a.on { font-weight: 600; }
  .num { opacity: 0.4; font-size: 0.6875rem; }
  .arrow { opacity: 0; transform: translateX(-4px); transition: opacity 0.08s, transform 0.16s var(--ease); }
  .list a:hover .arrow, .list a:focus-visible .arrow { opacity: 0.7; transform: none; }
  .hl { position: absolute; top: 0; left: 0; border-radius: 12px; background: rgb(255 255 255 / 0.08); transition: opacity 0.08s; pointer-events: none; }
  :global(:root[data-theme='dark']) .hl { background: rgb(0 0 0 / 0.07); }
  .acts { display: flex; gap: 6px; padding-top: 12px; margin-top: 8px; border-top: 1px solid rgb(127 127 127 / 0.2); }
  .acts > * { all: unset; cursor: pointer; flex: 1; text-align: center; padding: 8px 0; border-radius: 10px; font-size: 0.8125rem; background: rgb(127 127 127 / 0.12); }
  .acts > *:hover { background: rgb(127 127 127 / 0.2); }
  .acts > *:focus-visible { outline: 2px solid var(--accent); }
  kbd { font-family: var(--font-mono); font-size: 0.625rem; opacity: 0.6; margin-left: 4px; }
</style>
