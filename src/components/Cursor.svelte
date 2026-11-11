<script lang="ts">
  import { onMount } from 'svelte';

  // Only mounted on fine-pointer devices without reduced motion (see onMount).
  const HOT = 'a, button, [role=button], [data-cursor]';
  const TEXT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number']);

  let enabled = $state(false);
  let visible = $state(false);
  let hot = $state(false);
  let pressed = $state(false);
  let hiddenForField = $state(false);
  let label = $state('');

  let dot: HTMLDivElement | undefined = $state();
  let ringWrap: HTMLDivElement | undefined = $state();

  // Plain variables: these change every frame, so they stay out of reactivity.
  let x = 0;
  let y = 0;
  let rx = 0;
  let ry = 0;

  onMount(() => {
    const finePointer = matchMedia('(pointer: fine)').matches;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reduced) return;

    enabled = true;
    document.documentElement.classList.add('has-cursor');

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      x = e.clientX;
      y = e.clientY;
      // The dot follows the pointer exactly; the ring lags behind in the loop below.
      if (dot) dot.style.transform = `translate3d(${x - 3}px, ${y - 3}px, 0)`;
      if (!visible) {
        rx = x;
        ry = y;
        visible = true;
      }
    };

    const onOver = (e: PointerEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      if (!t) return;
      const field = t.closest('input, textarea') as HTMLInputElement | HTMLTextAreaElement | null;
      hiddenForField = !!field && (field.tagName === 'TEXTAREA' || TEXT_TYPES.has((field as HTMLInputElement).type));
      hot = !hiddenForField && !!t.closest(HOT);
      const lbl = t.closest<HTMLElement>('[data-cursor]')?.dataset.cursor ?? '';
      label = lbl === 'true' ? '' : lbl;
    };

    const onMouseOut = (e: MouseEvent) => {
      // No relatedTarget means the pointer has left the window.
      if (!e.relatedTarget) visible = false;
    };
    const onDown = () => (pressed = true);
    const onUp = () => (pressed = false);

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('mouseout', onMouseOut);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup', onUp);
    window.addEventListener('blur', onUp);

    let raf = 0;
    const tick = () => {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      if (ringWrap) ringWrap.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('mouseout', onMouseOut);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
      window.removeEventListener('blur', onUp);
      document.documentElement.classList.remove('has-cursor');
    };
  });
</script>

{#if enabled}
  <div class="cursor-dot" class:off={!visible || hiddenForField} bind:this={dot} aria-hidden="true"></div>
  <div class="cursor-ring" class:off={!visible || hiddenForField} bind:this={ringWrap} aria-hidden="true">
    <span class="ring" class:hot class:pressed></span>
    {#if label}<span class="tag mono">{label}</span>{/if}
  </div>
{/if}

<style>
  .cursor-dot,
  .cursor-ring {
    position: fixed;
    left: 0;
    top: 0;
    z-index: 100;
    pointer-events: none;
    will-change: transform;
    transition: opacity 0.2s;
  }
  .off { opacity: 0; }

  .cursor-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--ink);
  }

  .cursor-ring { width: 0; height: 0; }

  .ring {
    position: absolute;
    left: 0;
    top: 0;
    width: 32px;
    height: 32px;
    margin: -16px 0 0 -16px;
    border-radius: 50%;
    border: 1px solid var(--ink);
    transition:
      width 0.3s var(--ease),
      height 0.3s var(--ease),
      margin 0.3s var(--ease),
      transform 0.2s var(--ease),
      background-color 0.3s var(--ease);
  }
  .ring.hot {
    width: 48px;
    height: 48px;
    margin: -24px 0 0 -24px;
    background: var(--accent-soft);
  }
  .ring.pressed { transform: scale(0.82); }

  .tag {
    position: absolute;
    left: 26px;
    top: 14px;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--ink);
    color: var(--paper);
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
  }

  /* Hide the native cursor only while the custom one is mounted. */
  :global(html.has-cursor),
  :global(html.has-cursor *) {
    cursor: none !important;
  }
  :global(html.has-cursor input),
  :global(html.has-cursor textarea) {
    cursor: text !important;
  }
</style>
