<script lang="ts">
  import { onMount, tick, type Snippet } from 'svelte';
  import { play } from '../lib/sound';

  let { label, hint = '✂ drag to cut · or click', children }: { label: string; hint?: string; children?: Snippet } = $props();

  const HANDLE = 32; // px, the scissors' hit area
  const HALF = HANDLE / 2;
  const THRESHOLD = 0.85; // share of the width that completes the cut
  const KEY = 'rd:cut';

  let rail: HTMLDivElement | undefined;
  let handle: HTMLButtonElement | undefined;
  let body: HTMLDivElement | undefined;

  let x = $state(0); // scissors left edge, px
  let pos = $state(0); // cut point (scissors centre), px, fixed once cut
  let dragging = $state(false);
  let busy = $state(false); // automatic cut running
  let done = $state(false); // line is cut
  let opened = $state(false); // content is visible
  let hinted = $state(false); // any interaction has happened, so hide the hint
  let restored = $state(false); // rendered from sessionStorage, so no animation
  let gliding = $state(false); // short ease for snap-back and reset

  const cutAt = $derived(done ? pos : x + HALF);
  const bladeOpen = $derived(Math.sin(x / 12) * 7); // degrees, tied to distance moved

  let reduced = false;
  let moved = false;
  let startX = 0;
  let startLeft = 0;
  let suppressClick = false;
  let raf = 0;
  let glideTimer = 0;
  let openTimer = 0;

  const railWidth = () => rail?.clientWidth ?? 0;
  const maxX = () => Math.max(0, railWidth() - HANDLE);
  const clamp = (v: number) => Math.min(maxX(), Math.max(0, v));

  function tween(to: number, ms: number, then: () => void) {
    cancelAnimationFrame(raf);
    const from = x;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      x = from + (to - from) * (1 - Math.pow(1 - k, 3));
      if (k < 1) {
        raf = requestAnimationFrame(step);
      } else {
        raf = 0;
        then();
      }
    };
    raf = requestAnimationFrame(step);
  }

  function glideTo(to: number) {
    if (reduced) {
      x = to;
      return;
    }
    gliding = true;
    x = to;
    clearTimeout(glideTimer);
    glideTimer = window.setTimeout(() => (gliding = false), 380);
  }

  function persist() {
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {}
  }

  function onDown(e: PointerEvent) {
    if (done || busy) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    handle?.setPointerCapture(e.pointerId);
    dragging = true;
    moved = false;
    gliding = false;
    startX = e.clientX;
    startLeft = x;
    hinted = true;
    play('pick');
  }

  function onMove(e: PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) < 4) return;
    moved = true;
    x = clamp(startLeft + dx);
    if ((x + HALF) / railWidth() >= THRESHOLD) complete();
  }

  function onUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    if (handle?.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
    if (done) return;
    if (moved) {
      // A drag that did not reach the end snaps back. Its trailing click must not start an auto cut.
      suppressClick = true;
      setTimeout(() => (suppressClick = false), 0);
      glideTo(0);
    }
    // A plain tap falls through to the click handler, which runs the automatic cut.
  }

  function onClick(e: MouseEvent) {
    if (suppressClick || done || busy) return;
    hinted = true;
    // Keyboard activation fires click with detail 0. Pointer taps already played 'pick' on pointerdown.
    if (e.detail === 0) play('pick');
    busy = true;
    if (reduced) {
      x = maxX();
      complete();
      return;
    }
    gliding = false;
    tween(maxX(), 700, complete);
  }

  function complete() {
    if (done) return;
    cancelAnimationFrame(raf);
    raf = 0;
    done = true;
    dragging = false;
    busy = false;
    hinted = true;
    play('copy');
    pos = railWidth() - HALF;
    if (reduced) {
      x = maxX();
      open();
    } else {
      gliding = true;
      x = maxX();
      clearTimeout(glideTimer);
      glideTimer = window.setTimeout(() => (gliding = false), 380);
      openTimer = window.setTimeout(open, 380);
    }
  }

  function open() {
    persist();
    const el = body;
    if (!el || reduced) {
      opened = true;
      return;
    }
    // Measure while still closed, animate height from 0, then let it go back to auto.
    el.style.overflow = 'hidden';
    const anim = el.animate(
      [{ height: '0px' }, { height: `${el.scrollHeight}px` }],
      { duration: 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
    opened = true;
    anim.onfinish = () => {
      el.style.overflow = '';
    };
  }

  async function fold() {
    play('close');
    const el = body;
    if (el && !reduced) {
      el.style.overflow = 'hidden';
      const anim = el.animate(
        [{ height: `${el.scrollHeight}px` }, { height: '0px' }],
        { duration: 450, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      );
      anim.onfinish = () => {
        el.style.overflow = '';
      };
    }
    opened = false;
    // Put the line back together so it can be cut again.
    done = false;
    restored = false;
    pos = 0;
    cancelAnimationFrame(raf);
    clearTimeout(openTimer);
    glideTo(0);
    await tick();
    handle?.focus({ preventScroll: true });
  }

  onMount(() => {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === '1';
    } catch {}
    if (seen) {
      done = true;
      opened = true;
      restored = true;
      hinted = true;
      pos = railWidth() - HALF;
      x = maxX();
    }

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(glideTimer);
      clearTimeout(openTimer);
    };
  });
</script>

<div class="cl">
  <div class="rail" bind:this={rail}>
    <div class="seg" class:gone={done} style:clip-path={`inset(-4px -4px -4px ${cutAt}px)`}>
      <span class="dash base"></span>
      <span class="dash shimmer"></span>
    </div>
    <span class="half left" class:show={done} class:apart={done} class:still={restored} style:left={`${pos - 20}px`}></span>
    <span class="half right" class:show={done} class:apart={done} class:still={restored} style:left={`${pos}px`}></span>

    <button
      bind:this={handle}
      type="button"
      class="scissors"
      class:gone={done}
      class:gliding
      aria-label={label}
      data-cursor="drag"
      style:transform={`translate3d(${x}px, 0, 0)`}
      onpointerdown={onDown}
      onpointermove={onMove}
      onpointerup={onUp}
      onpointercancel={onUp}
      onclick={onClick}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <g class="blade" style:transform={`rotate(${-bladeOpen}deg)`}>
          <path d="M9 9 L17.5 3.5" />
          <path d="M9 9 L5.2 6.6" />
          <circle cx="3.2" cy="5.2" r="2.2" />
        </g>
        <g class="blade" style:transform={`rotate(${bladeOpen}deg)`}>
          <path d="M9 9 L17.5 14.5" />
          <path d="M9 9 L5.2 11.4" />
          <circle cx="3.2" cy="12.8" r="2.2" />
        </g>
      </svg>
    </button>
  </div>
  <p class="hint mono" class:gone={hinted}>{hint}</p>

  <div class="body" bind:this={body} class:closed={!opened} inert={!opened}>
    {@render children?.()}
  </div>

  {#if opened}
    <button type="button" class="fold mono" onclick={fold}>fold back ↑</button>
  {/if}
</div>

<style>
  .cl { margin: 0; }

  .rail { position: relative; height: 32px; user-select: none; -webkit-user-select: none; }

  .seg { position: absolute; inset: 0; color: var(--muted); transition: opacity 0.3s; }
  .seg.gone { opacity: 0; }
  .dash {
    position: absolute;
    top: 50%;
    height: 1.5px;
    margin-top: -0.75px;
    background: repeating-linear-gradient(90deg, currentColor 0 6px, transparent 6px 11px);
  }
  .base { left: 0; right: 0; opacity: 0.35; }
  .shimmer {
    left: 0;
    width: 30%;
    color: var(--ink);
    opacity: 0.4;
    -webkit-mask-image: linear-gradient(90deg, transparent, black 50%, transparent);
    mask-image: linear-gradient(90deg, transparent, black 50%, transparent);
    animation: cut-shimmer 3.6s linear infinite;
  }
  @keyframes cut-shimmer {
    from { transform: translateX(-100%); }
    to { transform: translateX(340%); }
  }

  .half {
    position: absolute;
    top: 50%;
    width: 20px;
    height: 1.5px;
    margin-top: -0.75px;
    background: var(--muted);
    opacity: 0;
    transition: transform 0.5s var(--ease), opacity 0.3s;
  }
  .half.show { opacity: 0.35; }
  .half.apart.left { transform: translateX(-6px); }
  .half.apart.right { transform: translateX(6px); }
  .half.still { transition: none; }

  .scissors {
    position: absolute;
    left: 0;
    top: 0;
    width: 32px;
    height: 32px;
    padding: 0;
    margin: 0;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--ink);
    cursor: grab;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
    transition: opacity 0.25s;
  }
  .scissors.gliding { transition: transform 0.35s var(--ease), opacity 0.25s; }
  .scissors:active { cursor: grabbing; }
  .scissors.gone { opacity: 0; visibility: hidden; }
  .scissors svg { width: 18px; height: 18px; overflow: visible; }

  .blade {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    transform-box: view-box;
    transform-origin: 9px 9px;
  }

  .hint {
    margin: 10px 0 0;
    font-size: 0.75rem;
    color: var(--muted);
    transition: opacity 0.3s;
  }
  .hint.gone { opacity: 0; }

  .body { overflow: visible; }
  .body.closed { height: 0; overflow: hidden; }

  .fold {
    display: inline-flex;
    margin-top: 12px;
    padding: 4px 0;
    border: 0;
    background: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 0.75rem;
  }
  .fold:hover { color: var(--ink); }

  @media (prefers-reduced-motion: reduce) {
    .shimmer { animation: none; opacity: 0; }
  }
</style>
