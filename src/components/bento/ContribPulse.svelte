<script lang="ts">
  // GitHub contributions as a pulse: 52 weekly bars mirrored around a centre line,
  // like an audio waveform. It fits any tile shape (unlike the 53×7 calendar),
  // draws itself in when it scrolls into view, and you can scrub it with the cursor.
  import { onMount } from 'svelte';

  interface Props {
    user: string;
    total: number;
    weeks: { start: string; count: number }[];
    weekday: number[];
    longestStreak: number;
    activeDays: number;
  }
  let { user, total, weeks, weekday, longestStreak, activeDays }: Props = $props();

  const max = Math.max(1, ...weeks.map((w) => w.count));
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const busiestDay = days[weekday.indexOf(Math.max(...weekday))];
  const wdMax = Math.max(1, ...weekday);
  const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

  let el: HTMLElement | undefined = $state();
  let shown = $state(false);
  let hover = $state<number | null>(null);

  // Square root keeps quiet weeks visible next to busy ones.
  const h = (c: number) => (c === 0 ? 0.04 : 0.12 + 0.88 * Math.sqrt(c / max));

  function onMove(e: PointerEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const i = Math.floor(((e.clientX - r.left) / r.width) * weeks.length);
    hover = Math.max(0, Math.min(weeks.length - 1, i));
  }

  onMount(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { shown = true; return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { shown = true; io.disconnect(); } }, { threshold: 0.4 });
    if (el) io.observe(el);
    return () => io.disconnect();
  });
</script>

<div class="pulse" bind:this={el} class:shown>
  <div class="top">
    <span class="k mono">GitHub</span>
    <a class="mono link" href={`https://github.com/${user}`} target="_blank" rel="noopener">@{user} ↗</a>
  </div>

  <div class="readout">
    {#if hover !== null}
      <span class="num">{weeks[hover].count}</span><span class="cap">contributions · week of {fmt.format(new Date(weeks[hover].start + 'T00:00:00Z'))}</span>
    {:else}
      <span class="num">{total.toLocaleString('en-US')}</span><span class="cap">contributions in the last year</span>
    {/if}
  </div>

  <div class="wave" role="img" aria-label={`${total} GitHub contributions in the last year`}
       onpointermove={onMove} onpointerleave={() => (hover = null)}>
    {#each weeks as w, i (w.start)}
      <span class="bar" class:on={hover === i} class:dim={hover !== null && hover !== i}
            style={`--h:${h(w.count)};--d:${i * 12}ms`}></span>
    {/each}
  </div>

  <div class="stats">
    <div><b>{longestStreak}d</b><span>longest streak</span></div>
    <div><b>{activeDays}</b><span>active days</span></div>
    <div class="wd">
      <span class="mini" aria-hidden="true">{#each weekday as v, i}<i style={`--v:${v / wdMax}`} class:top={days[i] === busiestDay}></i>{/each}</span>
      <span>busiest on {busiestDay}</span>
    </div>
  </div>
</div>

<style>
  .pulse { display: flex; flex-direction: column; gap: 10px; height: 100%; }
  .top { display: flex; justify-content: space-between; align-items: baseline; }
  .k { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }
  .link { font-size: 0.6875rem; color: var(--muted); text-decoration: none; }
  .link:hover { color: var(--ink); }
  .readout { display: flex; align-items: baseline; gap: 10px; min-height: 2.2rem; }
  .num { font-size: 1.875rem; font-weight: 600; letter-spacing: -0.04em; color: var(--ink); font-variant-numeric: tabular-nums; }
  .cap { font-size: 0.8125rem; color: var(--muted); }

  .wave { flex: 1; min-height: 72px; display: flex; align-items: center; gap: 2px; cursor: crosshair; touch-action: pan-y; }
  .bar {
    flex: 1; min-width: 2px; height: calc(var(--h) * 100%); border-radius: 99px;
    background: linear-gradient(180deg, color-mix(in oklab, var(--accent) 85%, transparent), color-mix(in oklab, var(--accent) 35%, transparent) 50%, color-mix(in oklab, var(--accent) 85%, transparent));
    transform: scaleY(0.02); transform-origin: center; opacity: 0.85;
    transition: transform 0.6s var(--ease) var(--d), opacity 0.15s, background 0.15s;
  }
  .shown .bar { transform: scaleY(1); }
  .bar.dim { opacity: 0.3; }
  .bar.on { opacity: 1; background: var(--ink); }

  .stats { display: grid; grid-template-columns: auto auto 1fr; gap: 20px; align-items: end; font-size: 0.75rem; color: var(--muted); }
  .stats b { display: block; color: var(--ink); font-size: 0.9375rem; font-weight: 600; letter-spacing: -0.02em; }
  .wd { justify-self: end; display: grid; justify-items: end; gap: 4px; }
  .mini { display: flex; align-items: flex-end; gap: 2px; height: 18px; }
  .mini i { width: 5px; height: calc(4px + var(--v) * 14px); border-radius: 2px; background: var(--rule-strong); }
  .mini i.top { background: var(--accent); }
  @media (prefers-reduced-motion: reduce) { .bar { transition: none; transform: none; } }
</style>
