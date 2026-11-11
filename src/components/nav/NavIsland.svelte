<script lang="ts">
  // Desktop nav: a "dynamic island". Collapsed, it says where you are and rotates
  // a little live info. It leans toward the cursor and a soft light follows the
  // pointer across it. Hover, focus or click and it morphs open into the menu.
  // Phones get MobileBar.svelte instead (iOS-style), so this hides under 760px.
  import { onMount, tick } from 'svelte';
  import { Spring } from 'svelte/motion';
  import { fade, fly } from 'svelte/transition';
  import { navItems, handle, createPageState, createFluidHover, reducedMotion } from '../../lib/nav.svelte';
  import { play } from '../../lib/sound';
  import { profile } from '../../data/site';

  const page = createPageState();
  const fh = createFluidHover({ axis: 'y' });
  let open = $state(false);
  let time = $state('');
  let status = $state('');
  let tickerIndex = $state(0);
  // The section label only changes once scrolling settles, so fast scrolls don't flicker it.
  let shownLabel = $state('');
  let labelTimer: ReturnType<typeof setTimeout>;
  $effect(() => {
    const next = page.state.path === '/' && page.state.active !== 'top' ? page.state.label : '';
    clearTimeout(labelTimer);
    labelTimer = setTimeout(() => { shownLabel = next; }, 320);
  });
  let copied = $state(false);
  let shell: HTMLElement | undefined = $state();
  let closedEl: HTMLElement | undefined = $state();
  let openEl: HTMLElement | undefined = $state();

  // Size morph + magnetic lean. Springs, so an interrupted move reverses from where it is.
  const w = new Spring(0, { stiffness: 0.26, damping: 0.8 });
  const h = new Spring(0, { stiffness: 0.26, damping: 0.8 });
  const lean = new Spring({ x: 0, y: 0, s: 1 }, { stiffness: 0.12, damping: 0.6 });
  let light = $state({ x: 50, y: 50, on: false });
  let closeTimer: ReturnType<typeof setTimeout>;

  const tickers = $derived([
    `${time} in Kolkata`,
    'Building Selegic CRM',
    `${profile.title}`,
  ]);

  function updateTime() {
    const now = new Date();
    time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: profile.timezone }).format(now).toLowerCase();
    const hr = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: profile.timezone }).format(now));
    const day = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: profile.timezone }).format(now);
    const weekday = !['Sat', 'Sun'].includes(day);
    status = hr < 7 ? 'probably asleep' : weekday && hr >= 9 && hr < 19 ? 'at work' : 'around';
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
  const softClose = () => { closeTimer = setTimeout(() => setOpen(false), 220); };

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('rd:theme', next); } catch {}
    play('toggle');
  }

  async function copyEmail() {
    try { await navigator.clipboard.writeText(profile.email); copied = true; play('copy'); setTimeout(() => (copied = false), 1600); }
    catch { location.href = `mailto:${profile.email}`; }
  }

  // Magnetic lean: within ~160px the island drifts up to 5px toward the pointer.
  function onWindowMove(e: PointerEvent) {
    if (!shell || e.pointerType !== 'mouse' || reducedMotion()) return;
    const r = shell.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    const reach = Math.max(r.width, r.height) / 2 + 160;
    if (d < reach && !open) {
      const f = 1 - d / reach;
      lean.target = { x: (dx / reach) * 10 * f, y: (dy / reach) * 6 * f, s: 1 + 0.035 * f };
    } else lean.target = { x: 0, y: 0, s: 1 };
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
      light = { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, on: true };
    } else if (light.on) light = { ...light, on: false };
  }

  onMount(() => {
    const stop = page.start();
    updateTime();
    const t = setInterval(updateTime, 15000);
    const rot = setInterval(() => { if (!open) tickerIndex = (tickerIndex + 1) % 3; }, 4200);
    measure(true);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) setOpen(false); };
    const onDoc = (e: PointerEvent) => { if (open && shell && !shell.contains(e.target as Node)) setOpen(false); };
    const onNav = () => setOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointermove', onWindowMove, { passive: true });
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('astro:page-load', onNav);
    return () => {
      stop(); clearInterval(t); clearInterval(rot);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointermove', onWindowMove);
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('astro:page-load', onNav);
    };
  });



</script>

<div class="anchor">
  <div
    class="island" class:open bind:this={shell} data-cursor="none"
    style={`${w.current ? `width:${w.current}px;height:${h.current}px;` : ''}transform:translate3d(${lean.current.x}px,${lean.current.y}px,0) scale(${lean.current.s});--mx:${light.x}%;--my:${light.y}%`}
    class:lit={light.on}
    role="navigation" aria-label="Site"
    onpointerenter={(e) => { if (e.pointerType === 'mouse') setOpen(true); }}
    onpointerleave={(e) => { if (e.pointerType === 'mouse') softClose(); }}
    onfocusin={() => setOpen(true)}
    onfocusout={(e) => { if (!shell?.contains(e.relatedTarget as Node)) softClose(); }}
  >
    <span class="glow" aria-hidden="true"></span>
    {#if !open}
      <button class="closed" bind:this={closedEl} onclick={() => setOpen(true)} aria-expanded="false" aria-label="Open menu" in:fade={{ duration: 100, delay: 40 }}>
        <span class="mark rd" aria-hidden="true">rd</span>
        <span class="h">{handle}</span>
        <span class="sep" aria-hidden="true"></span>
        <span class="tick">
          {#key `${shownLabel}|${tickerIndex}`}
            <span class="tk" in:fly={{ y: 8, duration: reducedMotion() ? 0 : 220, delay: reducedMotion() ? 0 : 120 }} out:fly={{ y: -8, duration: reducedMotion() ? 0 : 120 }}>
              {shownLabel && tickerIndex === 0 ? shownLabel : tickers[tickerIndex]}
            </span>
          {/key}
        </span>
      </button>
    {:else}
      <div class="panel" bind:this={openEl} in:fade={{ duration: 120, delay: 50 }}>
        <div class="who">
          <span class="tile rd" aria-hidden="true">rd</span>
          <div class="id">
            <a class="name" href="/" data-sound="tap">{profile.name}</a>
            <span class="st"><span class="live" aria-hidden="true"></span>{profile.title} · Selegic</span>
          </div>
        </div>
        <p class="meta mono">{profile.city.split(',')[0]} · {time} · {status}</p>

        <div class="list" use:fh.container>
          <span class="hl" style={fh.style} aria-hidden="true"></span>
          {#each navItems as n, i (n.id)}
            <a href={n.href} use:fh.item data-sound="tap" class:on={page.state.active === n.id}>
              <span class="mono num">0{i + 1}</span><span class="lbl">{n.label}</span>
              {#if page.state.active === n.id}<span class="here mono">you're here</span>{:else}<span class="arrow" aria-hidden="true">→</span>{/if}
            </a>
          {/each}
        </div>

        <div class="acts">
          <button onclick={copyEmail} aria-live="polite">{copied ? 'Copied ✓' : 'Copy email'}</button>
          <button onclick={() => { setOpen(false); window.dispatchEvent(new CustomEvent('palette:open')); }}>Search <kbd>⌘K</kbd></button>
          <button onclick={toggleTheme} aria-label="Toggle theme">◐</button>
          <a href="/resume.pdf" data-sound="tap">CV</a>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .anchor { position: fixed; top: 10px; left: 0; right: 0; z-index: 50; display: flex; justify-content: center; pointer-events: none; }
  .island {
    --bg: #0b0b0a; --fg: #f5f4ef; --dim: rgb(245 244 239 / 0.5); --line: rgb(255 255 255 / 0.08);
    position: relative; pointer-events: auto; overflow: hidden; border-radius: 19px;
    background: var(--bg); color: var(--fg);
    box-shadow: 0 8px 28px -10px rgb(0 0 0 / 0.55), inset 0 0 0 1px var(--line), inset 0 1px 0 rgb(255 255 255 / 0.06);
    transition: border-radius 0.24s var(--ease), box-shadow 0.2s;
    will-change: transform;
  }
  :global(:root[data-theme='light']) .island { --bg: #141413; }
  .island.open { border-radius: 24px; box-shadow: 0 18px 50px -14px rgb(0 0 0 / 0.6), inset 0 0 0 1px var(--line); }
  .glow { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.2s; background: radial-gradient(120px circle at var(--mx) var(--my), rgb(255 255 255 / 0.10), transparent 70%); }
  .lit .glow { opacity: 1; }

  .closed { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; gap: 8px; height: 34px; padding: 0 10px 0 6px; white-space: nowrap; cursor: pointer; font-size: 0.75rem; }
  .closed:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; border-radius: 19px; }
  .mark { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; background: var(--fg); color: var(--bg); font-size: 0.875rem; padding-bottom: 2px; box-sizing: border-box; }
  .h { font-weight: 600; letter-spacing: -0.01em; }
  .sep { width: 3px; height: 3px; border-radius: 50%; background: var(--dim); }
  .tick { display: grid; overflow: hidden; color: var(--dim); width: 9.75rem; }
  .tk { grid-area: 1 / 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .panel { width: 320px; padding: 14px; box-sizing: border-box; }
  .who { display: flex; gap: 10px; align-items: center; padding: 2px 4px 0; }
  .tile { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; background: var(--fg); color: var(--bg); font-size: 1.4rem; padding-bottom: 3px; box-sizing: border-box; transform: rotate(-4deg); }
  .id { display: grid; }
  .name { color: var(--fg); text-decoration: none; font-weight: 600; font-size: 0.875rem; letter-spacing: -0.01em; }
  .st { display: inline-flex; align-items: center; gap: 6px; font-size: 0.6875rem; color: var(--dim); }
  .st .live { color: #3ecf7a; }
  .live { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 3px rgb(62 207 122 / 0.2); }
  .meta { margin: 10px 4px 8px; font-size: 0.625rem; color: var(--dim); }
  .list { position: relative; display: grid; }
  .list a { position: relative; z-index: 1; display: grid; grid-template-columns: 24px 1fr auto; align-items: center; padding: 8px 8px; border-radius: 10px; color: var(--fg); text-decoration: none; font-size: 0.9375rem; font-weight: 500; letter-spacing: -0.015em; }
  .num { color: var(--dim); font-size: 0.625rem; }
  .here { font-size: 0.5625rem; color: #3ecf7a; text-transform: uppercase; letter-spacing: 0.06em; }
  .arrow { opacity: 0; transform: translateX(-4px); transition: opacity 0.08s, transform 0.16s var(--ease); color: var(--dim); }
  .list a:hover .arrow, .list a:focus-visible .arrow { opacity: 1; transform: none; }
  .hl { position: absolute; top: 0; left: 0; border-radius: 10px; background: rgb(255 255 255 / 0.07); transition: opacity 0.08s; pointer-events: none; }
  .acts { display: grid; grid-template-columns: 1.3fr 1.2fr 0.5fr 0.6fr; gap: 6px; padding-top: 10px; margin-top: 6px; border-top: 1px solid var(--line); }
  .acts > * { all: unset; box-sizing: border-box; cursor: pointer; text-align: center; padding: 7px 0; border-radius: 9px; font-size: 0.75rem; background: rgb(255 255 255 / 0.07); color: var(--fg); transition: background 0.08s; }
  .acts > *:hover { background: rgb(255 255 255 / 0.13); }
  .acts > *:focus-visible { outline: 2px solid var(--accent); }
  kbd { font-family: var(--font-mono); font-size: 0.5625rem; color: var(--dim); margin-left: 3px; }

  @media (max-width: 760px) { .anchor { display: none; } }
</style>
