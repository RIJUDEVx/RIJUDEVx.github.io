<script lang="ts">
  import { onMount } from 'svelte';
  import { play, isMuted, setMuted } from '../lib/sound';

  let { name }: { name: string } = $props();

  type Phase = 'idle' | 'playing' | 'exit';
  let phase = $state<Phase>('idle');
  let run = $state(0);
  let liftMs = $state(700);

  // Letters grouped by word, with a running index for the stagger delay.
  const words = $derived.by(() => {
    let i = 0;
    return name
      .split(' ')
      .filter(Boolean)
      .map((w) => [...w].map((ch) => ({ ch, i: i++ })));
  });

  const HOLD = 1800; // ms of animation before the slide-up starts
  const LIFT = 700; // slide-up duration
  const SKIP_LIFT = 450; // slide-up duration when skipped

  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let endTimer: ReturnType<typeof setTimeout> | undefined;
  let returnFocus: HTMLElement | null = null;
  let skipEl: HTMLButtonElement | undefined;

  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isPending = () => document.documentElement.dataset.intro === 'pending';

  function clearTimers() {
    clearTimeout(holdTimer);
    clearTimeout(endTimer);
  }

  function markSeen() {
    try { sessionStorage.setItem('rd:intro', '1'); } catch {}
  }

  function start() {
    clearTimers();
    phase = 'playing';
    liftMs = LIFT;
    holdTimer = setTimeout(() => lift(LIFT), HOLD);
    skipEl?.focus({ preventScroll: true });
  }

  // Starts the slide-up. The attribute is removed once it has finished,
  // so the overlay stays on screen while it moves.
  function lift(ms: number) {
    if (phase !== 'playing') return;
    clearTimeout(holdTimer);
    liftMs = ms;
    phase = 'exit';
    markSeen();
    endTimer = setTimeout(end, ms);
  }

  function end() {
    clearTimers();
    phase = 'idle';
    delete document.documentElement.dataset.intro;
    const back = returnFocus;
    returnFocus = null;
    if (back?.isConnected) back.focus({ preventScroll: true });
  }

  function skip() {
    lift(SKIP_LIFT);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' || e.key === 'Enter') skip();
  }

  function replay() {
    if (reducedMotion()) return;
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.scrollTo(0, 0);
    document.documentElement.dataset.intro = 'pending';
    run++; // remount the letters so the stagger plays again
    start();
  }

  // Audio needs a user gesture, so the sound only starts from this button.
  function sound() {
    if (isMuted()) setMuted(false);
    play('intro');
  }

  onMount(() => {
    window.addEventListener('keydown', onKey);
    window.addEventListener('intro:replay', replay);

    if (isPending()) {
      if (reducedMotion()) {
        markSeen();
        end();
      } else {
        // The CSS already shows the overlay; only the timers start here.
        start();
      }
    }

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('intro:replay', replay);
      clearTimers();
      // Leaving the page mid-intro: release the scroll lock.
      if (isPending()) {
        markSeen();
        delete document.documentElement.dataset.intro;
      }
    };
  });
</script>

<div
  class="overlay"
  class:exit={phase === 'exit'}
  style:--lift={`${liftMs}ms`}
  role="dialog"
  aria-modal="true"
  aria-label="Introduction"
  onclick={skip}
>
  {#key run}
    <div class="stage">
      <h1 class="name">
        <span class="sr-only">{name}</span>
        {#each words as word}
          <span class="word" aria-hidden="true">{#each word as l}<span class="ch" style:--i={l.i}>{l.ch}</span>{/each}</span>
        {/each}
      </h1>
      <p class="caption mono">senior software engineer · kolkata</p>
    </div>
    <div class="bar" aria-hidden="true"></div>
  {/key}

  <button
    bind:this={skipEl}
    type="button"
    class="btn btn-skip mono"
    onclick={skip}
  >Skip ↵</button>

  <button
    type="button"
    class="btn btn-sound mono"
    onclick={(e) => { e.stopPropagation(); sound(); }}
    onkeydown={(e) => { if (e.key === 'Enter') e.stopPropagation(); }}
  >♪ sound</button>
</div>

<style>
  /* Hidden by default so repeat visits never flash. Base.astro sets the attribute before paint. */
  .overlay {
    position: fixed; inset: 0; z-index: 90;
    display: none; place-items: center;
    background: var(--paper); color: var(--ink);
    overflow: hidden; cursor: pointer;
  }
  :global(html[data-intro='pending']) .overlay { display: grid; }
  :global(html[data-intro='pending']) { overflow: hidden; }
  .overlay.exit { animation: lift var(--lift, 0.7s) var(--ease) both; }
  @keyframes lift { to { transform: translateY(-100%); } }

  .stage { padding: 0 var(--gutter); text-align: center; }
  .name {
    margin: 0; font-family: var(--font-display); font-weight: 400;
    font-size: clamp(3rem, 13vw, 9rem); line-height: 1; letter-spacing: -0.02em;
    color: var(--ink); max-width: 92vw;
  }
  .word { display: inline-block; white-space: nowrap; margin-right: 0.22em; }
  .word:last-child { margin-right: 0; }
  .ch {
    display: inline-block; opacity: 0;
    animation: rise 0.9s var(--ease) both;
    animation-delay: calc(0.15s + var(--i) * 55ms);
  }
  @keyframes rise {
    from { opacity: 0; transform: translateY(0.5em); filter: blur(6px); }
    to { opacity: 1; transform: none; filter: none; }
  }

  .caption {
    margin: 28px 0 0; color: var(--muted);
    opacity: 0; animation: fade 0.8s var(--ease) 1.1s both;
  }
  @keyframes fade { to { opacity: 1; } }

  .bar {
    position: absolute; left: 0; bottom: 0;
    width: 100%; height: 2px;
    background: var(--accent);
    transform: scaleX(0); transform-origin: left center;
    animation: grow 1.8s linear both;
  }
  @keyframes grow { to { transform: scaleX(1); } }

  .btn {
    position: absolute; bottom: 24px; z-index: 1;
    padding: 6px 12px; border-radius: 999px;
    border: 1px solid var(--rule-strong); background: transparent;
    color: var(--muted); font-size: 0.8125rem; cursor: pointer;
    transition: color 0.2s, border-color 0.2s;
  }
  .btn:hover { color: var(--ink); border-color: var(--ink); }
  .btn-skip { right: var(--gutter); }
  .btn-sound { left: var(--gutter); }

  @media (prefers-reduced-motion: reduce) {
    :global(html[data-intro='pending']) .overlay { display: none; }
  }
</style>
