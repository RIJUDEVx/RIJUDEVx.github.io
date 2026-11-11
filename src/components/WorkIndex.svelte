<script lang="ts">
  // The work index. Desktop interactions:
  //  - one highlight band glides between rows (fluid hover); others dim;
  //  - a preview card trails the cursor, tilting with horizontal speed;
  //  - inside the card, every project sits on a vertical reel, so moving from
  //    row to row slides the next project in instead of swapping images;
  //  - keyboard focus pins the card beside the focused row.
  // Touch devices get the plain list (summaries visible, no floating card).
  import { onMount } from 'svelte';
  import { Spring } from 'svelte/motion';
  import { play } from '../lib/sound';

  interface Item {
    id: string; title: string; area: string; status: string; tone: string; year: string;
    summary: string; stats: { value: string; label: string }[]; stack: string[]; img: string;
  }
  let { items }: { items: Item[] } = $props();

  let list: HTMLElement | undefined = $state();
  let card: HTMLElement | undefined = $state();
  const rows: HTMLElement[] = [];
  let active = $state<number | null>(null);
  let fine = $state(false);
  let reduce = false;

  // Highlight band: springs for position and height; a fresh entry appears in place.
  const by = new Spring(0, { stiffness: 0.28, damping: 0.82 });
  const bh = new Spring(0, { stiffness: 0.28, damping: 0.82 });
  let bandOn = $state(false);
  // Reel position inside the card.
  const reel = new Spring(0, { stiffness: 0.16, damping: 0.78 });

  // Card follow (rAF lerp, not a spring, so it never overshoots the cursor).
  let tx = 0, ty = 0, x = 0, y = 0, px = 0, rot = 0, raf = 0, cardOn = $state(false);

  function moveBand(i: number, instant: boolean) {
    const r = rows[i]; if (!r) return;
    const o = { instant: instant || reduce };
    by.set(r.offsetTop, o); bh.set(r.offsetHeight, o);
  }

  function enter(i: number, e?: PointerEvent) {
    if (e && e.pointerType === 'touch') return;
    const fresh = !bandOn;
    active = i; bandOn = true;
    moveBand(i, fresh);
    reel.set(i, { instant: fresh || reduce });
  }

  function leaveList() { active = null; bandOn = false; cardOn = false; }

  function loop() {
    x += (tx - x) * 0.16; y += (ty - y) * 0.16;
    const vx = x - px; px = x;
    rot += (Math.max(-9, Math.min(9, vx * 0.5)) - rot) * 0.12;
    if (card) card.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${reduce ? 0 : rot}deg)`;
    raf = requestAnimationFrame(loop);
  }

  function onMove(e: PointerEvent) {
    if (!fine || e.pointerType !== 'mouse') return;
    const W = 340, H = 300;
    tx = Math.min(innerWidth - W - 16, e.clientX + 28);
    ty = Math.max(16, Math.min(innerHeight - H - 16, e.clientY - H / 2));
    if (!cardOn && active !== null) { x = tx; y = ty; px = x; cardOn = true; }
  }

  function onFocus(i: number) {
    enter(i);
    if (!fine) return;
    const r = rows[i].getBoundingClientRect();
    tx = Math.min(innerWidth - 356, r.right - 360); ty = Math.max(16, r.top - 100);
    if (!cardOn) { x = tx; y = ty; px = x; } cardOn = true;
  }

  onMount(() => {
    fine = matchMedia('(pointer: fine)').matches;
    reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (fine) raf = requestAnimationFrame(loop);
    const hide = () => { cardOn = false; };
    window.addEventListener('scroll', () => { if (active !== null) moveBand(active, true); }, { passive: true });
    document.addEventListener('astro:before-preparation', hide);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('astro:before-preparation', hide); };
  });
</script>

<div class="wi" role="presentation" onpointerleave={leaveList} onpointermove={onMove}>
  <div class="ih mono" aria-hidden="true"><span></span><span>Project</span><span>Area</span><span>Status</span><span>Year</span><span></span></div>
  <div class="lw">
  <span class="band" class:on={bandOn} style={`transform:translateY(${by.current}px);height:${bh.current}px`} aria-hidden="true"></span>
  <ol bind:this={list} class:has={active !== null}>
    {#each items as it, i (it.id)}
      <li bind:this={rows[i]}>
        <a href={`/work/${it.id}`} class:on={active === i} data-cursor="view"
           onpointerenter={(e) => enter(i, e)} onfocus={() => onFocus(i)} onblur={() => { cardOn = false; }}
           onclick={() => play('tap')}>
          <span class="mono n">{String(i + 1).padStart(2, '0')}</span>
          <span class="ttl">{it.title}</span>
          <span class="area">{it.area}</span>
          <span class="mono st" data-tone={it.tone}><i></i>{it.status}</span>
          <span class="mono yr">{it.year}</span>
          <span class="go" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 17 17 7M8 7h9v9"/></svg></span>
          <span class="sum"><span>{it.summary}</span></span>
        </a>
      </li>
    {/each}
  </ol>
  </div>

  {#if fine}
    <div class="card" class:on={cardOn && active !== null} bind:this={card} aria-hidden="true">
      <div class="reel" style={`transform:translateY(${-reel.current * 100}%)`}>
        {#each items as it (it.id)}
          <div class="slide">
            <div class="head" data-tone={it.tone}>
              <div class="row"><span class="mono">{it.area} · {it.year}</span><span class="pill-st mono"><i></i>{it.status}</span></div>
              <span class="big">{it.title}</span>
            </div>
            <div class="meta">
              <p class="blurb">{it.summary}</p>
              {#if it.stats.length}
                <div class="stats">{#each it.stats.slice(0, 2) as s}<div><b>{s.value}</b><span>{s.label}</span></div>{/each}</div>
              {/if}
              <div class="chips">{#each it.stack.slice(0, 4) as t}<span>{t}</span>{/each}</div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .wi { position: relative; }
  .ih { display: grid; grid-template-columns: 48px 1fr 170px 160px 100px 32px; padding: 0 12px 10px; color: var(--muted); font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid var(--rule); }
  .lw { position: relative; }
  ol { list-style: none; margin: 0; padding: 0; }
  li { position: relative; z-index: 1; }
  .band { position: absolute; left: 0; right: 0; top: 0; z-index: 0; border-radius: 14px; background: var(--surface); box-shadow: inset 0 0 0 1px var(--rule); opacity: 0; transition: opacity 0.12s; pointer-events: none; }
  .band.on { opacity: 1; }
  a { position: relative; display: grid; grid-template-columns: 48px 1fr 170px 160px 100px 32px; align-items: center; row-gap: 2px; padding: 18px 12px; border-bottom: 1px solid var(--rule); text-decoration: none; color: var(--ink); transition: color 0.2s, border-color 0.2s; }
  .has a { color: var(--muted); }
  .has a.on { color: var(--ink); border-color: transparent; }
  .n { color: var(--muted); font-size: 0.75rem; transition: color 0.2s; }
  a.on .n { color: var(--accent); }
  .ttl { font-size: clamp(1.35rem, 2.4vw, 1.9rem); font-weight: 500; letter-spacing: -0.035em; line-height: 1.15; transition: transform 0.35s var(--ease); }
  a.on .ttl { transform: translateX(8px); }
  .area { font-size: 0.875rem; color: inherit; }
  .st { display: inline-flex; align-items: center; gap: 7px; font-size: 0.75rem; }
  .st i { width: 6px; height: 6px; border-radius: 50%; background: var(--muted); }
  .st[data-tone='ok'] i { background: var(--ok); } .st[data-tone='pilot'] i { background: var(--accent); }
  .yr { font-size: 0.75rem; }
  .go { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: var(--ink); color: var(--paper); transform: scale(0.4); opacity: 0; transition: transform 0.3s var(--ease), opacity 0.2s; }
  a.on .go { transform: scale(1); opacity: 1; }
  /* Desktop: the summary lives in the preview card, so rows never change height. */
  .sum { display: none; grid-column: 2 / 5; font-size: 0.875rem; color: var(--text); max-width: 60ch; }

  .card { position: fixed; left: 0; top: 0; z-index: 45; width: 340px; height: 300px; border-radius: 16px; overflow: hidden; pointer-events: none;
    background: var(--surface); box-shadow: 0 30px 70px -25px rgb(0 0 0 / 0.65), inset 0 0 0 1px var(--rule);
    opacity: 0; scale: 0.88; transition: opacity 0.18s, scale 0.35s var(--ease); will-change: transform; }
  .card.on { opacity: 1; scale: 1; }
  .reel { height: 100%; }
  .slide { height: 100%; overflow: hidden; display: flex; flex-direction: column; }
  .head { position: relative; height: 128px; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;
    background: radial-gradient(120% 140% at 100% 0%, color-mix(in oklab, var(--accent) 28%, transparent), transparent 60%), var(--paper);
    border-bottom: 1px solid var(--rule); }
  .head[data-tone='ok'] { background: radial-gradient(120% 140% at 100% 0%, color-mix(in oklab, var(--ok) 24%, transparent), transparent 60%), var(--paper); }
  .head[data-tone='past'] { background: radial-gradient(120% 140% at 100% 0%, color-mix(in oklab, var(--muted) 26%, transparent), transparent 60%), var(--paper); }
  .head::after { content: ''; position: absolute; inset: 0; background-image: radial-gradient(var(--rule-strong) 1px, transparent 1px); background-size: 12px 12px; opacity: 0.35; mask-image: linear-gradient(90deg, transparent, #000); pointer-events: none; }
  .big { position: relative; z-index: 1; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.035em; color: var(--ink); line-height: 1.1; }
  .pill-st { display: inline-flex; align-items: center; gap: 6px; font-size: 0.625rem; color: var(--text); padding: 3px 8px; border-radius: 99px; background: color-mix(in oklab, var(--surface) 80%, transparent); box-shadow: inset 0 0 0 1px var(--rule-strong); }
  .pill-st i { width: 5px; height: 5px; border-radius: 50%; background: var(--muted); }
  .head[data-tone='ok'] .pill-st i { background: var(--ok); } .head[data-tone='pilot'] .pill-st i { background: var(--accent); }
  .meta { flex: 1; min-height: 0; padding: 12px 16px 14px; display: flex; flex-direction: column; gap: 10px; }
  .row { position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 0.6875rem; color: var(--muted); }
  .stats { display: flex; gap: 18px; }
  .stats b { display: block; font-size: 1.0625rem; color: var(--ink); letter-spacing: -0.02em; }
  .stats span { font-size: 0.6875rem; color: var(--muted); }
  .blurb { margin: 0; font-size: 0.75rem; color: var(--text); line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .chips { margin-top: auto; display: flex; flex-wrap: wrap; gap: 4px; }
  .chips span { font-family: var(--font-mono); font-size: 0.625rem; padding: 2px 7px; border-radius: 6px; background: var(--rule); color: var(--text); }

  @media (max-width: 960px) {
    .ih { display: none; }
    a { grid-template-columns: 36px 1fr auto; }
    .area, .yr, .go { display: none; }
    .sum { display: block; grid-column: 2 / 4; padding-top: 4px; }
    a.on .ttl { transform: none; }
  }
  /* Phones: iOS grouped list. */
  @media (max-width: 760px) {
    ol { background: var(--surface); border-radius: 20px; overflow: hidden; position: relative; }
    .band { display: none; }
    a { grid-template-columns: 1fr auto; padding: 14px 40px 14px 16px; border-bottom: 0.5px solid var(--rule-strong); color: var(--ink) !important; }
    li:last-child a { border-bottom: 0; }
    a::after { content: ''; position: absolute; right: 18px; top: 50%; width: 8px; height: 8px; border-right: 2px solid var(--rule-strong); border-top: 2px solid var(--rule-strong); transform: translateY(-50%) rotate(45deg); }
    a:active { background: rgb(127 127 127 / 0.12); }
    .n { display: none; }
    .ttl { font-size: 1.0625rem; font-weight: 600; letter-spacing: -0.01em; }
    .st { font-family: var(--font-sans); font-size: 0.8125rem; }
    .sum { grid-column: 1 / 3; }
  }
</style>
