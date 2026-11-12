<script lang="ts">
  // "On call": a 30-second shift. Four servers, things go wrong, you fix them
  // by clicking (or pressing 1 to 4). Every second something stays broken costs uptime.
  import { onMount } from 'svelte';
  import { play } from '../lib/sound';

  const SERVERS = ['api-1', 'api-2', 'db-1', 'worker-1'];
  const INCIDENTS = [
    { what: 'memory leak', log: 'heap is at 97%. somebody is caching the whole table again.' },
    { what: 'bad deploy', log: 'the hotfix needed a hotfix. rolling back.' },
    { what: 'slow query', log: 'sequential scan on 4 million rows. where is the index?' },
    { what: 'disk full', log: 'disk at 100%. who logs at DEBUG in prod?' },
    { what: 'cert expired', log: 'the certificate expired. the reminder was in the backlog.' },
    { what: 'retry storm', log: 'clients are retrying with no backoff. politely murdering us.' },
    { what: 'stuck queue', log: 'one poison message, ten thousand waiting behind it.' },
  ];
  const SHIFT = 30;

  type Slot = { what: string; hits: number; need: number } | null;
  let slots = $state<Slot[]>([null, null, null, null]);
  let phase = $state<'idle' | 'live' | 'done'>('idle');
  let left = $state(SHIFT);
  let uptime = $state(100);
  let fixed = $state(0);
  let line = $state('quiet night. pager is charged.');
  let best = $state<number | null>(null);
  let hit = $state(-1);
  let timer = 0, spawnIn = 0, turn = 0;

  const verdict = $derived(
    uptime >= 99.9 ? 'that is a lot of nines. are you hiring?'
    : uptime >= 99.5 ? 'solid shift. nobody upstairs noticed a thing.'
    : uptime >= 98 ? 'a few customers refreshed twice. survivable.'
    : 'we will be writing a post-mortem about this one.');

  function start() {
    slots = [null, null, null, null]; left = SHIFT; uptime = 100; fixed = 0; turn = 0; spawnIn = 0.6;
    line = 'shift started. good luck.'; phase = 'live'; play('open');
    clearInterval(timer);
    timer = window.setInterval(tick, 100);
  }
  function tick() {
    const dt = 0.1;
    left = Math.max(0, left - dt);
    const broken = slots.filter(Boolean).length;
    uptime = Math.max(0, uptime - broken * 0.2 * dt); // 0.2% a second for each thing that is down
    spawnIn -= dt;
    if (spawnIn <= 0) {
      const free = slots.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
      if (free.length) {
        const i = free[Math.floor(Math.random() * free.length)], inc = INCIDENTS[turn++ % INCIDENTS.length];
        const progress = 1 - left / SHIFT;
        slots[i] = { what: inc.what, hits: 0, need: 1 + Math.floor(Math.random() * (1.4 + progress * 2)) };
        line = `${SERVERS[i]}: ${inc.log}`; play('deny');
      }
      spawnIn = 1.35 - (1 - left / SHIFT) * 0.85 + Math.random() * 0.3; // it gets busier
    }
    if (left <= 0) end();
  }
  function end() {
    clearInterval(timer); phase = 'done'; play('win');
    const score = Math.round(uptime * 100) / 100;
    if (best === null || score > best) { best = score; try { localStorage.setItem('rd:oncall', String(score)); } catch {} }
    line = verdict;
  }
  function fix(i: number) {
    const s = slots[i];
    if (phase !== 'live' || !s) return;
    hit = i; setTimeout(() => { if (hit === i) hit = -1; }, 120);
    s.hits++;
    if (s.hits >= s.need) { slots[i] = null; fixed++; line = `${SERVERS[i]}: fixed. back to green.`; play('copy'); }
    else play('tap');
  }
  function onKey(e: KeyboardEvent) {
    if (phase !== 'live' || e.metaKey || e.ctrlKey || e.altKey) return;
    const i = '1234'.indexOf(e.key);
    if (i >= 0) { e.preventDefault(); fix(i); }
  }

  onMount(() => {
    try { const b = parseFloat(localStorage.getItem('rd:oncall') ?? ''); if (!Number.isNaN(b)) best = b; } catch {}
    return () => clearInterval(timer);
  });
</script>

<svelte:window onkeydown={onKey} />

<div class="oncall" class:live={phase === 'live'}>
  <div class="hud mono">
    <span>uptime <b class:bad={uptime < 99}>{uptime.toFixed(2)}%</b></span>
    <span>fixed <b>{fixed}</b></span>
    <span class="clock">{phase === 'live' ? `${left.toFixed(1)}s left` : best !== null ? `best ${best.toFixed(2)}%` : '30 second shift'}</span>
  </div>
  <div class="time" aria-hidden="true"><i style={`scale:${left / SHIFT} 1`}></i></div>

  <div class="rack">
    {#each SERVERS as name, i (name)}
      {@const s = slots[i]}
      <button class="srv" class:down={!!s} class:hit={hit === i} disabled={phase !== 'live'} onclick={() => fix(i)}
              aria-label={s ? `${name}: ${s.what}. Fix it.` : `${name}: healthy`} data-cursor={s ? 'fix' : ''}>
        <span class="leds" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="name mono">{name}</span>
        <span class="state">{s ? s.what : 'healthy'}</span>
        <span class="pips" aria-hidden="true">{#if s}{#each Array(s.need) as _, k}<i class:done={k < s.hits}></i>{/each}{/if}</span>
        <kbd class="mono">{i + 1}</kbd>
      </button>
    {/each}
  </div>

  <p class="pager mono" role="status"><span class="bell" aria-hidden="true">▚</span>{line}</p>

  {#if phase !== 'live'}
    <div class="veil">
      {#if phase === 'done'}
        <p class="score">{uptime.toFixed(2)}<span>% uptime</span></p>
        <p class="sub">{fixed} incidents fixed. {verdict}</p>
      {:else}
        <p class="sub">Things will break. Click a red server to fix it, or press <kbd class="mono">1</kbd>–<kbd class="mono">4</kbd>. Some need more than one go.</p>
      {/if}
      <button class="go" onclick={start} data-cursor="go">{phase === 'done' ? 'take another shift' : 'start the shift'}</button>
    </div>
  {/if}
</div>

<style>
  .oncall { position: relative; border: 1px solid var(--rule-strong); border-radius: 16px; overflow: hidden; background: var(--surface); box-shadow: var(--shadow); }
  .hud { display: flex; gap: 18px; padding: 10px 14px; font-size: 0.6875rem; color: var(--muted); }
  .hud b { color: var(--ink); font-weight: 500; font-variant-numeric: tabular-nums; } .hud b.bad { color: var(--danger); }
  .clock { margin-left: auto; font-variant-numeric: tabular-nums; }
  .time { height: 2px; background: var(--rule); } .time i { display: block; height: 100%; background: var(--accent); transform-origin: left; transition: scale 0.1s linear; }

  .rack { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 16px; }
  .srv {
    position: relative; display: grid; gap: 4px; justify-items: start; text-align: left; padding: 12px 12px 14px; min-height: 124px; cursor: pointer;
    border-radius: 12px; border: 1px solid var(--rule); background: var(--paper); color: var(--ink); font: inherit;
    transition: border-color 0.15s, background 0.15s, transform 0.08s;
  }
  .srv:disabled { cursor: default; }
  .srv.hit { transform: scale(0.96); }
  .leds { display: flex; gap: 4px; margin-bottom: 8px; }
  .leds i { width: 6px; height: 6px; background: var(--ok); }
  .live .leds i { animation: led 1.1s steps(2) infinite; } .leds i:nth-child(2) { animation-delay: -0.4s; } .leds i:nth-child(3) { animation-delay: -0.8s; }
  @keyframes led { 50% { opacity: 0.35; } }
  .name { font-size: 0.6875rem; color: var(--muted); }
  .state { font-size: 0.875rem; font-weight: 500; letter-spacing: -0.01em; }
  .pips { display: flex; gap: 4px; min-height: 6px; margin-top: 4px; }
  .pips i { width: 14px; height: 4px; background: color-mix(in oklab, var(--danger) 35%, transparent); } .pips i.done { background: var(--ok); }
  .srv kbd { position: absolute; right: 9px; top: 9px; font-size: 0.625rem; color: var(--muted); border: 1px solid var(--rule-strong); border-bottom-width: 2px; border-radius: 4px; padding: 0 5px; }
  .srv.down { border-color: var(--danger); background: color-mix(in oklab, var(--danger) 12%, var(--paper)); animation: alert 0.5s steps(2) infinite; }
  .srv.down .leds i { background: var(--danger); animation-duration: 0.3s; }
  .srv.down .state { color: var(--danger); }
  @keyframes alert { 50% { box-shadow: 0 0 0 3px color-mix(in oklab, var(--danger) 22%, transparent); } }

  .pager { margin: 0; padding: 10px 14px; border-top: 1px solid var(--rule); font-size: 0.6875rem; color: var(--text); min-height: 2.9em; display: flex; gap: 8px; align-items: baseline; }
  .bell { color: var(--warn); }

  .veil { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 10px; padding: 20px; text-align: center; background: color-mix(in oklab, var(--surface) 86%, transparent); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); }
  .score { margin: 0; font-size: 3rem; font-weight: 600; letter-spacing: -0.05em; line-height: 1; color: var(--ink); font-variant-numeric: tabular-nums; }
  .score span { font-size: 0.875rem; font-weight: 500; letter-spacing: 0; color: var(--muted); margin-left: 6px; }
  .sub { margin: 0; max-width: 40ch; font-size: 0.875rem; line-height: 1.5; color: var(--text); }
  .sub kbd { font-size: 0.6875rem; border: 1px solid var(--rule-strong); border-bottom-width: 2px; border-radius: 4px; padding: 0 5px; }
  .go { margin-top: 6px; padding: 9px 18px; border-radius: 999px; border: 0; cursor: pointer; font: inherit; font-size: 0.875rem; font-weight: 500; background: var(--ink); color: var(--paper); transition: transform 0.2s var(--ease); }
  .go:hover { transform: translateY(-1px) scale(1.03); }
  @media (max-width: 760px) { .rack { grid-template-columns: 1fr 1fr; } .srv { min-height: 104px; } .srv kbd { display: none; } }
  @media (prefers-reduced-motion: reduce) { .srv.down, .leds i { animation: none !important; } }
</style>
