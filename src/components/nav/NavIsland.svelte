<script lang="ts">
  import { toast, copiedLine } from '../../lib/toast';
  // Desktop nav: a "dynamic island". Collapsed, it says where you are and rotates
  // a little live info. It leans toward the cursor and a soft light follows the
  // pointer across it. Hover, focus or click and it morphs open into the menu.
  // Phones get MobileBar.svelte instead (iOS-style), so this hides under 760px.
  import { onMount, tick } from 'svelte';
  import { Spring } from 'svelte/motion';
  import { fade, fly } from 'svelte/transition';
  import { navItems, handle, createPageState, createFluidHover, reducedMotion } from '../../lib/nav.svelte';
  import { play, musicPlaying, setMusic } from '../../lib/sound';
  import portrait from '../../assets/portrait.png?inline';
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
  let music = $state(false);
  let shell: HTMLElement | undefined = $state();
  let zone: HTMLElement | undefined = $state();
  let closedEl: HTMLElement | undefined = $state();
  let openEl: HTMLElement | undefined = $state();

  // Size morph + magnetic lean. Springs, so an interrupted move reverses from where it is.
  const w = new Spring(0, { stiffness: 0.26, damping: 0.8 });
  const h = new Spring(0, { stiffness: 0.26, damping: 0.8 });
  const lean = new Spring({ x: 0, y: 0, s: 1 }, { stiffness: 0.12, damping: 0.6 });
  let light = $state({ x: 50, y: 50, on: false });
  let closeTimer: ReturnType<typeof setTimeout>;

  const tickers = $derived([
    `${time} in kolkata · ${status}`,
    'building selegic crm',
    music ? 'now playing: hooghly loop' : 'hover me for the menu',
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
    try { await navigator.clipboard.writeText(profile.email); copied = true; play('copy'); toast(copiedLine(profile.email)); setTimeout(() => (copied = false), 1600); }
    catch { location.href = `mailto:${profile.email}`; }
  }

  // Magnetic lean: within ~160px the island drifts up to 5px toward the pointer.
  function onWindowMove(e: PointerEvent) {
    // Left through the top edge and came back lower down: close once clearly below the zone.
    if (open && zone && e.pointerType === 'mouse') {
      const z = zone.getBoundingClientRect();
      if (e.clientY > z.bottom + 12 || e.clientX < z.left - 12 || e.clientX > z.right + 12) softClose();
    }
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
    const rot = setInterval(() => { if (!open) tickerIndex = (tickerIndex + 1) % tickers.length; }, 4200);
    measure(true);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) setOpen(false); };
    const onDoc = (e: PointerEvent) => { if (open && shell && !shell.contains(e.target as Node)) setOpen(false); };
    const onNav = () => setOpen(false);
    const onMusic = () => { music = musicPlaying(); };
    music = musicPlaying();
    window.addEventListener('music:change', onMusic);
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointermove', onWindowMove, { passive: true });
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('astro:page-load', onNav);
    return () => {
      stop(); clearInterval(t); clearInterval(rot);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('music:change', onMusic);
      window.removeEventListener('pointermove', onWindowMove);
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('astro:page-load', onNav);
    };
  });



</script>

<div class="anchor">
  <!-- Hover zone: the island plus the gap above it (to the browser edge) and a margin
       around it, so moving through the top padding never collapses the menu. -->
  <div class="zone" bind:this={zone}
    onpointerenter={(e) => { if (e.pointerType === 'mouse') setOpen(true); }}
    onpointerleave={(e) => { if (e.pointerType === 'mouse' && e.clientY > 0) softClose(); }}
  >
  <div
    class="island" class:open bind:this={shell} data-cursor="none"
    style={`${w.current ? `width:${w.current}px;height:${h.current}px;` : ''}transform:translate3d(${lean.current.x}px,${lean.current.y}px,0) scale(${lean.current.s});--mx:${light.x}%;--my:${light.y}%`}
    class:lit={light.on}
    role="navigation" aria-label="Site"
    onfocusin={() => setOpen(true)}
    onfocusout={(e) => { if (!shell?.contains(e.relatedTarget as Node)) softClose(); }}
  >
    <span class="glow" aria-hidden="true"></span>
    {#if !open}
      <button class="closed" bind:this={closedEl} onclick={() => setOpen(true)} aria-expanded="false" aria-label="Open menu" in:fade={{ duration: 100, delay: 40 }}>
        <img class="face" src={portrait} alt="" width="22" height="22" />
        <span class="h">{handle}</span>
        {#if music}<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>{:else}<span class="led" aria-hidden="true"></span>{/if}
        <span class="tick mono">
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
          <span class="tile" aria-hidden="true"><img src={portrait} alt="" width="44" height="44" /></span>
          <div class="id">
            <a class="name" href="/" data-sound="tap">{profile.name}</a>
            <span class="st mono"><span class="led" aria-hidden="true"></span>{profile.city.split(',')[0].toLowerCase()} · {time} · {status}</span>
          </div>
        </div>

        <div class="list" use:fh.container>
          <span class="hl" style={fh.style} aria-hidden="true"></span>
          {#each navItems as n, i (n.id)}
            <a href={n.href} use:fh.item data-sound="tap" class:on={page.state.active === n.id}>
              <span class="mono num">0{i + 1}</span><span class="lbl">{n.label}</span>
              {#if page.state.active === n.id}<span class="here mono">you are here</span>{:else}<span class="arrow" aria-hidden="true">→</span>{/if}
            </a>
          {/each}
        </div>

        <div class="acts mono">
          <button onclick={copyEmail} aria-live="polite">{copied ? 'copied ✓' : 'copy email'}</button>
          <button onclick={() => { setOpen(false); window.dispatchEvent(new CustomEvent('palette:open')); }}>search <kbd>⌘K</kbd></button>
          <button onclick={() => setMusic(!music)} aria-label={music ? 'Stop the music' : 'Play the 8-bit loop'} aria-pressed={music} class:playing={music}>{#if music}<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>{:else}♪{/if}</button>
          <button onclick={toggleTheme} aria-label="Toggle theme">◐</button>
          <a href="/resume.pdf" data-sound="tap">cv</a>
        </div>
        <p class="psst mono">psst: press <kbd>D</kbd> anywhere to deploy</p>
      </div>
    {/if}
  </div>
</div>
</div>

<style>
  .anchor { position: fixed; top: 0; left: 0; right: 0; z-index: 50; display: flex; justify-content: center; pointer-events: none; }
  .zone { pointer-events: auto; padding: 10px 28px 22px; }
  .island {
    --bg: #0b0b0a; --fg: #f5f4ef; --dim: rgb(245 244 239 / 0.5); --line: rgb(255 255 255 / 0.08);
    position: relative; pointer-events: auto; overflow: hidden; border-radius: 13px;
    background: var(--bg); color: var(--fg);
    box-shadow: 0 8px 28px -10px rgb(0 0 0 / 0.55), inset 0 0 0 1px var(--line), inset 0 1px 0 rgb(255 255 255 / 0.06);
    transition: border-radius 0.24s var(--ease), box-shadow 0.2s;
    will-change: transform;
  }
  :global(:root[data-theme='light']) .island { --bg: #141413; }
  .island.open { border-radius: 22px; box-shadow: 0 18px 50px -14px rgb(0 0 0 / 0.6), inset 0 0 0 1px var(--line); }
  .glow { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.2s; background: radial-gradient(120px circle at var(--mx) var(--my), rgb(255 255 255 / 0.10), transparent 70%); }
  .lit .glow { opacity: 1; }

  .closed { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 12px 0 7px; white-space: nowrap; cursor: pointer; font-size: 0.75rem; }
  .closed:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; border-radius: 19px; }
  /* The pixel portrait, as on the page: a small square tile with hard-edged pixels. */
  .face { width: 22px; height: 22px; border-radius: 6px; background: #fff; image-rendering: pixelated; display: block; }
  .h { font-weight: 600; letter-spacing: -0.01em; }
  .led { flex: none; width: 5px; height: 5px; background: #3ecf7a; animation: led 2.2s steps(2) infinite; }
  @keyframes led { 50% { opacity: 0.35; } }
  .eq { flex: none; display: inline-flex; align-items: flex-end; gap: 2px; height: 9px; color: #3ecf7a; }
  .eq i { width: 2px; height: 3px; background: currentColor; animation: eq 0.6s steps(4) infinite alternate; }
  .eq i:nth-child(2) { animation-delay: -0.25s; } .eq i:nth-child(3) { animation-delay: -0.45s; }
  @keyframes eq { to { height: 9px; } }
  .tick { display: grid; overflow: hidden; color: var(--dim); width: 12.5rem; font-size: 0.6875rem; }
  .tk { grid-area: 1 / 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .panel { width: 348px; padding: 16px 16px 12px; box-sizing: border-box; }
  .who { display: flex; gap: 12px; align-items: center; padding: 2px 2px 14px; }
  .tile { position: relative; flex: none; width: 44px; height: 44px; border-radius: 12px; overflow: hidden; background: #fff; rotate: -4deg; box-shadow: 0 0 0 1px var(--line); }
  .tile img { display: block; width: 100%; height: 100%; image-rendering: pixelated; }
  .tile::after { content: ''; position: absolute; inset: 0; opacity: 0.18; background: repeating-linear-gradient(rgb(18 16 16) 0 1px, transparent 1px 3px); }
  .id { display: grid; gap: 2px; min-width: 0; }
  .name { color: var(--fg); text-decoration: none; font-weight: 600; font-size: 0.9375rem; letter-spacing: -0.015em; }
  .st { display: inline-flex; align-items: center; gap: 7px; font-size: 0.625rem; color: var(--dim); white-space: nowrap; }

  /* Section names in the same serif as the page headings, dotted rules between them. */
  .list { position: relative; display: grid; border-top: 1px dotted rgb(255 255 255 / 0.2); }
  .list a { position: relative; z-index: 1; display: grid; grid-template-columns: 26px 1fr auto; align-items: baseline; padding: 9px 8px 10px; border-bottom: 1px dotted rgb(255 255 255 / 0.2); color: var(--fg); text-decoration: none; }
  .lbl { font-family: var(--font-serif); font-size: 1.375rem; line-height: 1.1; letter-spacing: -0.01em; transition: translate 0.2s var(--ease); }
  .list a:hover .lbl, .list a:focus-visible .lbl { translate: 3px 0; }
  .num { color: var(--dim); font-size: 0.625rem; }
  .here { font-size: 0.5625rem; color: #3ecf7a; text-transform: uppercase; letter-spacing: 0.06em; }
  .arrow { opacity: 0; transform: translateX(-4px); transition: opacity 0.08s, transform 0.16s var(--ease); color: var(--dim); }
  .list a:hover .arrow, .list a:focus-visible .arrow { opacity: 1; transform: none; }
  .hl { position: absolute; top: 0; left: 0; border-radius: 8px; background: rgb(255 255 255 / 0.07); transition: opacity 0.08s; pointer-events: none; }
  .acts { display: grid; grid-template-columns: 1.5fr 1.4fr 0.55fr 0.55fr 0.6fr; gap: 6px; padding-top: 12px; }
  .acts > * { all: unset; box-sizing: border-box; display: grid; place-items: center; grid-auto-flow: column; gap: 4px; cursor: pointer; text-align: center; height: 30px; border-radius: 8px; font-size: 0.6875rem; background: rgb(255 255 255 / 0.07); color: var(--fg); transition: background 0.08s; }
  .acts > *:hover { background: rgb(255 255 255 / 0.13); }
  .acts > *:focus-visible { outline: 2px solid var(--accent); }
  .acts .playing { background: rgb(62 207 122 / 0.16); }
  kbd { font-family: var(--font-mono); font-size: 0.5625rem; color: var(--dim); }
  .psst { margin: 10px 2px 0; font-size: 0.5625rem; color: var(--dim); }
  .psst kbd { border: 1px solid rgb(255 255 255 / 0.2); border-bottom-width: 2px; border-radius: 3px; padding: 0 4px; }
  @media (prefers-reduced-motion: reduce) { .led, .eq i { animation: none; } }

  @media (max-width: 760px) { .anchor { display: none; } }
</style>
