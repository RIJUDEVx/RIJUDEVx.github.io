<script lang="ts">
  // The backlog: a pile of tickets with a little gravity. Drag one, throw it,
  // or close everything at once. Purely for fun.
  import { onMount } from 'svelte';
  import { play } from '../lib/sound';

  const TICKETS = [
    { id: 'RD-101', label: 'fix the flaky test', tone: 'warn' },
    { id: 'RD-117', label: 'rename that variable', tone: 'muted' },
    { id: 'RD-042', label: 'write the docs', tone: 'accent' },
    { id: 'RD-203', label: 'update deps (again)', tone: 'muted' },
    { id: 'RD-009', label: 'works on my machine', tone: 'danger' },
    { id: 'RD-150', label: 'one more index?', tone: 'accent' },
    { id: 'RD-088', label: 'refactor later', tone: 'warn' },
    { id: 'RD-001', label: 'refill coffee', tone: 'ok' },
    { id: 'RD-177', label: 'delete dead code', tone: 'ok' },
  ];
  type Body = { x: number; y: number; vx: number; vy: number; w: number; h: number; r: number; rest: number; held: boolean };

  let box: HTMLDivElement | undefined = $state();
  const els: HTMLElement[] = $state([]);
  let closed = $state(false);
  let bodies: Body[] = [];
  let W = 0, H = 0, raf = 0, visible = false, lastThud = 0;
  let still = false;

  function spawn() {
    if (!box) return;
    W = box.clientWidth; H = box.clientHeight;
    bodies = els.map((el, i) => ({
      w: el.offsetWidth, h: el.offsetHeight,
      x: 12 + Math.random() * Math.max(1, W - el.offsetWidth - 24), y: still ? H - el.offsetHeight - (i % 3) * (el.offsetHeight + 2) : -40 - i * 46,
      vx: (Math.random() - 0.5) * 120, vy: 0, r: 0, rest: (Math.random() - 0.5) * 7, held: false,
    }));
    if (still) { for (let k = 0; k < 240; k++) step(1 / 60); paint(); }
  }

  function step(dt: number) {
    for (const b of bodies) {
      if (b.held) continue;
      b.vy += 2000 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < 0) { b.x = 0; b.vx = -b.vx * 0.45; }
      if (b.x + b.w > W) { b.x = W - b.w; b.vx = -b.vx * 0.45; }
      if (b.y + b.h > H) {
        if (b.vy > 420 && performance.now() - lastThud > 90) { lastThud = performance.now(); play('drop'); }
        b.y = H - b.h; b.vy = Math.abs(b.vy) < 90 ? 0 : -b.vy * 0.28; b.vx *= 0.8;
      }
    }
    // Keep tickets from sitting inside each other: push apart along the shallow axis.
    for (let pass = 0; pass < 4; pass++) for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], b = bodies[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox <= 0 || oy <= 0) continue;
      const fa = a.held ? 0 : b.held ? 1 : 0.5, fb = 1 - fa;
      if (oy < ox) {
        const s = a.y < b.y ? -1 : 1;
        a.y += s * oy * fa; b.y -= s * oy * fb;
        const v = (a.vy + b.vy) / 2; if (!a.held) a.vy = v * 0.4; if (!b.held) b.vy = v * 0.4;
        a.vx *= 0.92; b.vx *= 0.92;
      } else {
        const s = a.x < b.x ? -1 : 1;
        a.x += s * ox * fa; b.x -= s * ox * fb;
        const v = (a.vx + b.vx) / 2; if (!a.held) a.vx = v * 0.5; if (!b.held) b.vx = v * 0.5;
      }
    }
    for (const b of bodies) {
      b.x = Math.max(0, Math.min(W - b.w, b.x)); if (b.y + b.h > H) b.y = H - b.h;
      const air = b.held || Math.abs(b.vy) > 60;
      b.r += ((air ? Math.max(-16, Math.min(16, b.vx * 0.03)) : b.rest) - b.r) * 0.18;
    }
  }
  function paint() { bodies.forEach((b, i) => { const el = els[i]; if (el) el.style.transform = `translate(${b.x}px, ${b.y}px) rotate(${b.r}deg)`; }); }

  let prev = 0;
  function loop(t: number) {
    const dt = Math.min(0.032, (t - prev) / 1000 || 0.016); prev = t;
    if (visible && !closed) { step(dt / 2); step(dt / 2); paint(); }
    raf = requestAnimationFrame(loop);
  }

  // Dragging: the ticket follows the pointer and keeps its speed when you let go.
  let drag: { i: number; dx: number; dy: number; lx: number; ly: number; lt: number } | null = null;
  function down(e: PointerEvent, i: number) {
    const b = bodies[i]; if (!b || !box) return;
    const r = box.getBoundingClientRect();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    b.held = true; b.vx = b.vy = 0;
    drag = { i, dx: e.clientX - r.left - b.x, dy: e.clientY - r.top - b.y, lx: e.clientX, ly: e.clientY, lt: performance.now() };
    play('pick');
  }
  function move(e: PointerEvent) {
    if (!drag || !box) return;
    const b = bodies[drag.i], r = box.getBoundingClientRect(), t = performance.now(), dt = Math.max(8, t - drag.lt) / 1000;
    b.x = e.clientX - r.left - drag.dx; b.y = Math.min(H - b.h, e.clientY - r.top - drag.dy);
    b.vx = b.vx * 0.5 + ((e.clientX - drag.lx) / dt) * 0.5; b.vy = b.vy * 0.5 + ((e.clientY - drag.ly) / dt) * 0.5;
    drag.lx = e.clientX; drag.ly = e.clientY; drag.lt = t;
    if (still) paint();
  }
  function up() {
    if (!drag) return;
    const b = bodies[drag.i];
    b.held = false; b.vx = Math.max(-2200, Math.min(2200, b.vx)); b.vy = Math.max(-2200, Math.min(2200, b.vy));
    drag = null;
    if (still) { for (let k = 0; k < 240; k++) step(1 / 60); paint(); }
  }

  function closeAll() { closed = true; play('win'); }
  function reopen() { closed = false; play('open'); requestAnimationFrame(spawn); }

  onMount(() => {
    still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !bodies.length) spawn();
    }, { threshold: 0.25 });
    if (box) io.observe(box);
    const onResize = () => { if (box) { W = box.clientWidth; H = box.clientHeight; } };
    addEventListener('resize', onResize);
    if (!still) raf = requestAnimationFrame(loop);
    return () => { io.disconnect(); removeEventListener('resize', onResize); cancelAnimationFrame(raf); };
  });
</script>

<div class="top">
  <p class="mono lede">{closed ? 'inbox zero. it won’t last.' : 'drag it, throw it, or'}</p>
  {#if closed}
    <button class="mono act" onclick={reopen}>reopen everything</button>
  {:else}
    <button class="mono act" onclick={closeAll}>close all {TICKETS.length}</button>
  {/if}
</div>
<div class="pile" class:closed bind:this={box}>
  {#each TICKETS as t, i (t.id)}
    <div class="ticket" bind:this={els[i]} style={`--d:${i * 40}ms`} role="img" aria-label={`${t.id}: ${t.label}`} data-cursor="throw"
         onpointerdown={(e) => down(e, i)} onpointermove={move} onpointerup={up} onpointercancel={up}>
      <span class="in"><i data-tone={t.tone}></i><span class="id mono">{t.id}</span>{t.label}</span>
    </div>
  {/each}
  {#if closed}<p class="zero" aria-hidden="true">✓</p>{/if}
</div>

<style>
  .top { display: flex; justify-content: flex-end; align-items: baseline; gap: 8px; margin-bottom: 4px; }
  .lede { margin: 0; color: var(--muted); }
  .act { border: 0; background: none; padding: 0; cursor: pointer; color: var(--ink); text-decoration: underline; text-decoration-color: var(--rule-strong); text-underline-offset: 3px; }
  .act:hover { text-decoration-color: currentColor; }
  .pile { position: relative; height: 230px; overflow: hidden; touch-action: pan-y; }
  .ticket { position: absolute; left: 0; top: 0; will-change: transform; cursor: grab; touch-action: none; user-select: none; -webkit-user-select: none; transform: translate(-999px, 0); }
  .ticket:active { cursor: grabbing; }
  .in {
    display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; padding: 7px 12px; border-radius: 9px;
    font-size: 0.8125rem; color: var(--ink); background: var(--surface); border: 1px solid var(--rule-strong); box-shadow: var(--shadow);
    transition: transform 0.35s cubic-bezier(0.34, 1.4, 0.64, 1) var(--d), opacity 0.25s var(--d);
  }
  .closed .in { transform: scale(0.4); opacity: 0; }
  .closed .ticket { pointer-events: none; }
  .id { font-size: 0.625rem; color: var(--muted); }
  i { width: 7px; height: 7px; border-radius: 2px; background: var(--muted); }
  i[data-tone='ok'] { background: var(--ok); } i[data-tone='warn'] { background: var(--warn); }
  i[data-tone='danger'] { background: var(--danger); } i[data-tone='accent'] { background: var(--accent); }
  .zero { position: absolute; inset: 0; margin: 0; display: grid; place-items: center; font-size: 3rem; color: var(--ok); animation: pop 0.5s cubic-bezier(0.34, 1.5, 0.64, 1) 0.35s backwards; }
  @keyframes pop { from { transform: scale(0.3); opacity: 0; } }
  @media (max-width: 760px) { .pile { height: 260px; } }
</style>
