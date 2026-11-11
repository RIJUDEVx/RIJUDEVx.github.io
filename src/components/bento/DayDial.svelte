<script lang="ts">
  // "Now" as a 24-hour dial for Kolkata: the night arc, the working-hours arc,
  // and a dot for the current time. Answers "can I reach him now?" at a glance.
  import { onMount } from 'svelte';
  const TZ = 'Asia/Kolkata';
  let mins = $state<number | null>(null);
  let label = $state('');
  let status = $state('');

  function update() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: 'numeric', hour12: false, weekday: 'short', timeZone: TZ }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    const h = Number(get('hour')) % 24, m = Number(get('minute'));
    mins = h * 60 + m;
    label = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ }).format(now).toLowerCase();
    const weekend = ['Sat', 'Sun'].includes(get('weekday'));
    status = h < 7 ? 'probably asleep' : !weekend && h >= 9 && h < 19 ? 'at work' : 'around';
  }
  onMount(() => { update(); const t = setInterval(update, 30000); return () => clearInterval(t); });

  const R = 44, C = 2 * Math.PI * R;
  // Arc from hour a to hour b, as a dash on a circle starting at midnight (top).
  const arc = (a: number, b: number) => `stroke-dasharray:${((b - a) / 24) * C} ${C};stroke-dashoffset:${-(a / 24) * C}`;
  const dot = $derived(mins === null ? null : (() => {
    const t = (mins / 1440) * 2 * Math.PI - Math.PI / 2;
    return { x: 60 + R * Math.cos(t), y: 60 + R * Math.sin(t) };
  })());
</script>

<div class="dial">
  <span class="k mono">Now · Kolkata</span>
  <div class="face">
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r={R} class="track" />
      <circle cx="60" cy="60" r={R} class="night" style={arc(0, 7)} transform="rotate(-90 60 60)" />
      <circle cx="60" cy="60" r={R} class="work" style={arc(9, 19)} transform="rotate(-90 60 60)" />
      {#each [0, 6, 12, 18] as hr}
        {@const t = (hr / 24) * 2 * Math.PI - Math.PI / 2}
        <text x={60 + 31 * Math.cos(t)} y={60 + 31 * Math.sin(t) + 3} class="hr">{hr}</text>
      {/each}
      {#if dot}<circle cx={dot.x} cy={dot.y} r="5" class="dot" /><circle cx={dot.x} cy={dot.y} r="9" class="halo" />{/if}
    </svg>
    <div class="center"><span class="t">{label || '—'}</span><span class="s">{status}</span></div>
  </div>
  <p class="legend mono"><i class="lw"></i>work <i class="ln"></i>night</p>
</div>

<style>
  .dial { display: flex; flex-direction: column; gap: 8px; height: 100%; }
  .k { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }
  .face { position: relative; width: 100%; max-width: 150px; aspect-ratio: 1; margin: auto; }
  svg { width: 100%; height: 100%; overflow: visible; }
  circle { fill: none; stroke-width: 7; }
  .track { stroke: var(--rule); }
  .night { stroke: color-mix(in oklab, var(--muted) 45%, transparent); stroke-linecap: round; }
  .work { stroke: var(--accent); stroke-linecap: round; }
  .hr { font: 500 7px var(--font-mono); fill: var(--muted); text-anchor: middle; }
  .dot { fill: var(--ink); stroke: none; }
  .halo { fill: none; stroke: var(--ink); stroke-width: 1; opacity: 0.35; animation: ping 2.4s ease-out infinite; transform-box: fill-box; transform-origin: center; }
  @keyframes ping { 0% { transform: scale(0.6); opacity: 0.5; } 100% { transform: scale(1.6); opacity: 0; } }
  .center { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
  .t { font-size: 0.9375rem; font-weight: 600; color: var(--ink); letter-spacing: -0.02em; }
  .s { font-size: 0.6875rem; color: var(--muted); }
  .legend { margin: 0; display: flex; align-items: center; gap: 6px; font-size: 0.625rem; color: var(--muted); justify-content: center; }
  .legend i { width: 10px; height: 4px; border-radius: 2px; display: inline-block; }
  .lw { background: var(--accent); } .ln { background: color-mix(in oklab, var(--muted) 45%, transparent); margin-left: 6px; }
  @media (prefers-reduced-motion: reduce) { .halo { animation: none; } }
</style>
