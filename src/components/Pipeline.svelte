<script lang="ts">
  import { tick } from 'svelte';
  import { crossfade } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { cubicOut } from 'svelte/easing';
  import { Tween } from 'svelte/motion';
  import { play } from '../lib/sound';

  type Deal = { id: number; name: string; value: number; stage: number; owner: string; days: number };
  type Drag = {
    id: number; pointerId: number; el: HTMLElement;
    sx: number; sy: number; left: number; top: number; w: number; active: boolean;
  };

  const STAGES: readonly string[] = ['Lead', 'Qualified', 'Proposal', 'Won'];
  const WON = STAGES.length - 1;
  const CONFETTI = ['var(--accent)', 'var(--ok)', 'var(--warn)'];

  // Made-up deals and owners. Values are in lakhs.
  const SEED: Deal[] = [
    { id: 1, name: 'Rocket Bakery', value: 1.2, stage: 0, owner: 'Asha Kar', days: 4 },
    { id: 2, name: 'Hooghly Ferries', value: 3.5, stage: 1, owner: 'Mira Sen', days: 9 },
    { id: 3, name: 'Paper Kite Studio', value: 0.8, stage: 0, owner: 'Dev Pal', days: 2 },
    { id: 4, name: 'Night Market Co.', value: 2.1, stage: 2, owner: 'Tara Bose', days: 6 },
    { id: 5, name: 'Tram Line Coffee', value: 1.6, stage: 1, owner: 'Ishan Roy', days: 3 },
  ];
  const seed = (): Deal[] => SEED.map((d) => ({ ...d }));

  const lakh = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmt = (v: number) => `₹${lakh.format(v)}L`;
  const sum = (arr: Deal[]) => Math.round(arr.reduce((s, d) => s + d.value, 0) * 10) / 10;
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const initials = (name: string) =>
    name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const reduced = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let deals = $state<Deal[]>(seed());
  let announce = $state('');
  let overStage = $state<number | null>(null);
  let dragId = $state<number | null>(null);
  let ghost = $state<{ id: number; left: number; top: number; w: number; dx: number; dy: number; tilt: number } | null>(null);
  let bursts = $state<{ key: number; x: number; y: number; dots: { dx: number; dy: number; color: string }[] }[]>([]);
  let root = $state<HTMLElement>();

  const columns = $derived(
    STAGES.map((name, i) => {
      const items = deals.filter((d) => d.stage === i);
      return { name, i, items, total: sum(items) };
    }),
  );
  const won = $derived(deals.filter((d) => d.stage === WON));
  const closed = $derived(sum(won));
  const rate = $derived(deals.length ? Math.round((won.length / deals.length) * 100) : 0);
  const cleared = $derived(deals.length > 0 && won.length === deals.length);
  const ghostDeal = $derived(ghost ? deals.find((d) => d.id === ghost!.id) : undefined);

  const closedT = new Tween(0, { duration: 500, easing: cubicOut });
  const rateT = new Tween(0, { duration: 500, easing: cubicOut });
  $effect(() => {
    const d = reduced() ? 0 : 500;
    closedT.set(closed, { duration: d });
    rateT.set(rate, { duration: d });
  });

  const [send, receive] = crossfade({
    duration: (d: number) => (reduced() ? 0 : Math.max(200, Math.sqrt(d) * 22)),
    easing: cubicOut,
  });
  const flipDuration = (d: number) => (reduced() ? 0 : Math.sqrt(d) * 60);

  function burst(el: HTMLElement) {
    if (reduced()) return;
    const r = el.getBoundingClientRect();
    const key = Date.now() + Math.random();
    const dots = Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 36 + Math.random() * 34;
      return { dx: Math.cos(a) * dist, dy: Math.sin(a) * dist, color: CONFETTI[i % CONFETTI.length] };
    });
    bursts = [...bursts, { key, x: r.left + r.width / 2, y: r.top + r.height / 2, dots }];
    setTimeout(() => (bursts = bursts.filter((b) => b.key !== key)), 900);
  }

  function move(id: number, to: number) {
    const deal = deals.find((d) => d.id === id);
    if (!deal || to < 0 || to > WON || to === deal.stage) return;
    const hadFocus = !!root?.contains(document.activeElement);
    deal.stage = to;
    deal.days = 0;
    announce = `${deal.name} moved to ${STAGES[to]}`;
    if (to === WON) play('win');
    else play('drop');
    tick().then(() => {
      const el = root?.querySelector<HTMLElement>(`[data-card="${id}"]`);
      if (hadFocus) el?.focus({ preventScroll: true });
      if (to === WON && el) burst(el);
    });
  }

  function reset() {
    deals = seed();
    bursts = [];
    overStage = null;
    dragId = null;
    ghost = null;
    announce = 'Board reset';
  }

  function onKey(e: KeyboardEvent, id: number) {
    const deal = deals.find((d) => d.id === id);
    if (!deal) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      move(id, deal.stage + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      move(id, deal.stage - 1);
    }
  }

  // Pointer drag. Cards set touch-action: none, so touch drags are not
  // hijacked by scrolling. The ← → buttons remain the tap-first path.
  let drag: Drag | null = null;

  function stageAt(x: number, y: number): number | null {
    if (!root) return null;
    for (const col of root.querySelectorAll<HTMLElement>('[data-stage]')) {
      const r = col.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return Number(col.dataset.stage);
    }
    return null;
  }

  function onDown(e: PointerEvent, id: number) {
    if (e.button !== 0) return;
    if ((e.target as Element).closest('button')) return;
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    drag = { id, pointerId: e.pointerId, el, sx: e.clientX, sy: e.clientY, left: r.left, top: r.top, w: r.width, active: false };
    try { el.setPointerCapture(e.pointerId); } catch {}
  }

  function onMove(e: PointerEvent) {
    const d = drag;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.active) {
      if (Math.hypot(dx, dy) < 6) return;
      d.active = true;
      dragId = d.id;
      play('pick');
    }
    ghost = {
      id: d.id, left: d.left, top: d.top, w: d.w, dx, dy,
      tilt: Math.max(-4, Math.min(4, dx / 16)),
    };
    overStage = stageAt(e.clientX, e.clientY);
  }

  function onUp(e: PointerEvent, cancelled = false) {
    const d = drag;
    if (!d || e.pointerId !== d.pointerId) return;
    drag = null;
    try { d.el.releasePointerCapture(e.pointerId); } catch {}
    if (!d.active) return;
    const target = cancelled ? null : stageAt(e.clientX, e.clientY);
    ghost = null;
    dragId = null;
    overStage = null;
    if (target !== null) move(d.id, target);
  }
</script>

{#snippet face(deal: Deal)}
  <div class="top">
    <span class="name">{deal.name}</span>
    <span class="owner mono" aria-hidden="true" title={deal.owner}>{initials(deal.owner)}</span>
  </div>
  <div class="mid">
    <span class="val mono">{fmt(deal.value)}</span>
    {#if deal.stage === WON}
      <span class="badge" data-tone="ok">✓ closed</span>
    {/if}
  </div>
  <div class="foot">
    <span class="age mono muted">{deal.days}d in stage</span>
    <span class="actions">
      {#if deal.stage > 0}
        <button
          type="button"
          class="step"
          aria-label="Move {deal.name} back to {STAGES[deal.stage - 1]}"
          onclick={() => move(deal.id, deal.stage - 1)}>←</button>
      {/if}
      <button
        type="button"
        class="step"
        aria-label={deal.stage < WON ? `Move ${deal.name} to ${STAGES[deal.stage + 1]}` : `${deal.name} is won`}
        disabled={deal.stage === WON}
        onclick={() => move(deal.id, deal.stage + 1)}>→</button>
    </span>
  </div>
{/snippet}

<div class="pipe" bind:this={root}>
  <div class="bar">
    <p class="stat mono">
      closed <span class="num">{fmt(closedT.current)}</span> · win rate <span class="num">{Math.round(rateT.current)}%</span>
    </p>
    <button type="button" class="reset mono" data-sound="tap" onclick={reset}>reset</button>
  </div>

  <p class="hint mono muted">scroll →</p>

  <div class="board">
    {#each columns as col (col.i)}
      <div class="col" data-stage={col.i} class:over={overStage === col.i} role="group" aria-label={col.name}>
        <header class="colhead">
          <h3 class="mono">{col.name}</h3>
          <span class="mono muted">{col.items.length} · {fmt(col.total)}</span>
        </header>
        <div class="cards">
          {#each col.items as deal (deal.id)}
            <div
              class="card"
              class:is-src={dragId === deal.id}
              class:won={deal.stage === WON}
              role="group"
              tabindex="0"
              data-card={deal.id}
              data-cursor="drag"
              aria-label="{deal.name}, {fmt(deal.value)}, {STAGES[deal.stage]}"
              onpointerdown={(e) => onDown(e, deal.id)}
              onpointermove={onMove}
              onpointerup={(e) => onUp(e)}
              onpointercancel={(e) => onUp(e, true)}
              onkeydown={(e) => onKey(e, deal.id)}
              animate:flip={{ duration: flipDuration }}
              in:receive={{ key: deal.id }}
              out:send={{ key: deal.id }}>
              {@render face(deal)}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  {#if ghost && ghostDeal}
    <div class="ghost" aria-hidden="true" inert style="left:{ghost.left}px;top:{ghost.top}px;width:{ghost.w}px;transform:translate({ghost.dx}px,{ghost.dy}px) rotate({ghost.tilt}deg)">
      <div class="card lift">
        {@render face(ghostDeal)}
      </div>
    </div>
  {/if}

  {#each bursts as b (b.key)}
    <div class="burst" style="left:{b.x}px;top:{b.y}px">
      {#each b.dots as d}
        <span class="dot" style="--dx:{d.dx}px;--dy:{d.dy}px;--c:{d.color}"></span>
      {/each}
    </div>
  {/each}

  {#if cleared}
    <div class="cleared">
      <p>Pipeline cleared. The real one also has workflows, access control and an AI agent.</p>
      <button type="button" class="pill" data-sound="tap" onclick={reset}>reset</button>
    </div>
  {/if}

  <p class="sr-only" aria-live="polite">{announce}</p>
  <p class="caption mono muted">a toy version of the CRM I build at Selegic</p>
</div>

<style>
  .pipe { position: relative; }

  .bar { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 12px; }
  .stat { margin: 0; font-size: 0.75rem; color: var(--text); }
  .num { color: var(--ink); font-variant-numeric: tabular-nums; }
  .reset {
    flex: none; background: none; border: 0; padding: 2px 4px; cursor: pointer;
    font-size: 0.75rem; color: var(--muted);
    text-decoration: underline dotted; text-underline-offset: 4px;
  }
  .reset:hover { color: var(--ink); }

  .hint { display: none; margin: 0 0 8px; font-size: 0.75rem; text-align: right; }

  .board { display: grid; grid-template-columns: repeat(4, minmax(150px, 1fr)); gap: 10px; }

  .col {
    min-width: 0; display: flex; flex-direction: column; gap: 10px;
    padding: 10px; min-height: 260px;
    border: 1px solid var(--rule); border-radius: var(--radius);
    transition: background-color 0.2s, border-color 0.2s;
  }
  .col.over { background: var(--accent-soft); border: 1px dashed var(--accent); }

  .colhead { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; padding: 0 4px; }
  .colhead h3 {
    font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--ink); font-weight: 500;
  }
  .colhead .mono { font-size: 0.6875rem; white-space: nowrap; }

  .cards { display: flex; flex-direction: column; gap: 8px; }

  .card {
    position: relative; display: flex; flex-direction: column; gap: 8px;
    padding: 12px; background: var(--surface);
    border: 1px solid var(--rule); border-radius: 10px;
    touch-action: none; user-select: none; -webkit-user-select: none;
    cursor: grab; transition: border-color 0.2s, opacity 0.2s;
  }
  .card:hover { border-color: var(--rule-strong); }
  .card.won { border-color: color-mix(in oklab, var(--ok) 35%, var(--rule)); }
  .card.is-src { opacity: 0.35; border-style: dashed; }
  .card.lift {
    cursor: grabbing; border-color: var(--rule-strong);
    box-shadow: var(--shadow), 0 22px 44px -18px color-mix(in oklab, var(--ink) 40%, transparent);
  }

  .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
  .name { font-size: 0.8125rem; line-height: 1.3; color: var(--ink); font-weight: 600; overflow-wrap: anywhere; }
  .owner {
    flex: none; width: 24px; height: 24px; border-radius: 50%;
    display: grid; place-items: center;
    background: var(--accent-soft); color: var(--accent);
    font-size: 0.6875rem; letter-spacing: 0;
  }

  .mid { display: flex; justify-content: space-between; align-items: center; gap: 6px; flex-wrap: wrap; }
  .val { color: var(--ink); font-size: 0.75rem; }
  .badge { font-size: 0.6875rem; padding: 0 6px; }
  .badge::before { display: none; }

  .foot { display: flex; justify-content: space-between; align-items: flex-end; gap: 6px; margin-top: auto; }
  .age { font-size: 0.6875rem; line-height: 1.3; }
  .actions { display: flex; gap: 4px; flex: none; }
  .step {
    width: 28px; height: 26px; padding: 0; display: grid; place-items: center;
    background: var(--surface); color: var(--text); font-size: 0.8125rem; line-height: 1;
    border: 1px solid var(--rule-strong); border-radius: 6px; cursor: pointer;
  }
  .step:hover:not(:disabled) { border-color: var(--ink); color: var(--ink); }
  .step:disabled { opacity: 0.35; cursor: default; }

  .ghost { position: fixed; top: 0; z-index: 60; pointer-events: none; will-change: transform; }

  .burst { position: fixed; width: 0; height: 0; z-index: 70; pointer-events: none; }
  .dot {
    position: absolute; left: -3px; top: -3px; width: 6px; height: 6px; border-radius: 50%;
    background: var(--c); animation: burst 800ms var(--ease) forwards;
  }
  @keyframes burst {
    from { transform: translate(0, 0) scale(1); opacity: 1; }
    to { transform: translate(var(--dx), var(--dy)) scale(0.3); opacity: 0; }
  }

  .cleared {
    margin-top: 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;
    padding: 14px 16px; border: 1px dashed var(--rule-strong); border-radius: var(--radius);
  }
  .cleared p { margin: 0; color: var(--ink); font-family: var(--font-sans); font-weight: 500; font-size: 1.0625rem; line-height: 1.4; }

  .caption { margin: 14px 0 0; font-size: 0.75rem; text-align: center; }

  @media (max-width: 640px) {
    .hint { display: block; }
    .board {
      grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: 160px;
      overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding-inline: var(--gutter);
      margin-inline: calc(-1 * var(--gutter)); padding: 0 var(--gutter) 6px;
      -webkit-overflow-scrolling: touch;
    }
    .col { scroll-snap-align: start; }
  }
</style>
