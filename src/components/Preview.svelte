<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    line,
    href,
    statusText,
    tone,
    children,
  }: {
    title: string;
    line: string;
    href: string;
    status?: string;
    statusText: string;
    tone: 'ok' | 'pilot' | 'past';
    children?: Snippet;
  } = $props();

  let root: HTMLSpanElement | undefined = $state();
  let link: HTMLAnchorElement | undefined = $state();
  let floatEl: HTMLSpanElement | undefined = $state();

  // Each trigger keeps its own flag, so a mouse leave does not close a card that
  // is still open from keyboard focus or a touch tap.
  let hover = $state(false);
  let focus = $state(false);
  let tapped = $state(false);
  let place = $state<'above' | 'below'>('above');
  let shift = $state(0);

  const open = $derived(hover || focus || tapped);
  const id = 'preview-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const CARD_W = 280;
  const MARGIN = 8;

  function measure() {
    if (!link || !floatEl) return;
    const r = link.getBoundingClientRect();
    const h = floatEl.offsetHeight;

    const spaceAbove = r.top;
    const spaceBelow = window.innerHeight - r.bottom;
    place = spaceAbove >= h || spaceAbove >= spaceBelow ? 'above' : 'below';

    // Keep the card inside the viewport horizontally.
    const left = r.left + r.width / 2 - CARD_W / 2;
    const maxLeft = window.innerWidth - MARGIN - CARD_W;
    const clamped = Math.min(Math.max(left, MARGIN), Math.max(MARGIN, maxLeft));
    shift = clamped - left;
  }

  $effect(() => {
    if (!open) return;
    measure();
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  // Tapping anywhere outside closes a card that was opened by touch.
  $effect(() => {
    if (!tapped) return;
    const onDown = (e: PointerEvent) => {
      if (root && !root.contains(e.target as Node)) tapped = false;
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  });

  function onClick(e: MouseEvent) {
    // First tap on a touch screen opens the card. The next tap follows the link.
    if (window.matchMedia('(pointer: coarse)').matches && !tapped) {
      e.preventDefault();
      tapped = true;
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      hover = false;
      focus = false;
      tapped = false;
    }
  }
</script>

<span class="preview" bind:this={root} onpointerenter={(e) => { if (e.pointerType !== 'touch') hover = true; }} onpointerleave={(e) => { if (e.pointerType !== 'touch') hover = false; }}>
  <a
    bind:this={link}
    class="word"
    {href}
    data-cursor="open"
    aria-describedby={id}
    onclick={onClick}
    onkeydown={onKeydown}
    onfocus={(e) => { if (e.currentTarget.matches(':focus-visible')) focus = true; }}
    onblur={() => (focus = false)}
  >{@render children?.()}</a><span class="float" bind:this={floatEl} data-place={place} data-open={open} style:--shift="{shift}px">
    <span class="card" {id} role="tooltip">
      <span class="title display">{title}</span>
      <span class="badge" data-tone={tone}>{statusText}</span>
      <span class="line">{line}</span>
      <span class="mono cta">read the case study →</span>
    </span>
  </span></span>

<style>
  .preview { position: relative; display: inline; }

  .word {
    color: inherit;
    text-decoration-line: underline;
    text-decoration-color: var(--accent);
    text-decoration-thickness: 2px;
    text-underline-offset: 4px;
  }

  /* The transparent padding on .float bridges the gap between word and card, so the pointer does not leave. */
  .float {
    position: absolute; left: 50%; bottom: 100%;
    width: 280px; padding: 0 0 12px;
    opacity: 0; visibility: hidden; pointer-events: none;
    transform: translate(calc(-50% + var(--shift, 0px)), 6px);
    transition: opacity 0.15s var(--ease), transform 0.15s var(--ease), visibility 0.15s;
    z-index: 20;
  }
  .float[data-place='below'] { bottom: auto; top: 100%; padding: 12px 0 0; transform: translate(calc(-50% + var(--shift, 0px)), -6px); }
  .float[data-open='true'] { opacity: 1; visibility: visible; pointer-events: auto; transform: translate(calc(-50% + var(--shift, 0px)), 0); }

  .card {
    display: grid; gap: 8px; justify-items: start;
    padding: 16px 18px; background: var(--surface);
    border: 1px solid var(--rule-strong); border-radius: 12px; box-shadow: var(--shadow);
    color: var(--text); font-size: 0.9375rem; line-height: 1.45; text-align: left;
  }
  .title { font-size: 1.0625rem; font-weight: 600; letter-spacing: -0.01em; line-height: 1.2; color: var(--ink); }
  .line { color: var(--text); }
  .cta { color: var(--muted); font-size: 0.75rem; }
</style>
