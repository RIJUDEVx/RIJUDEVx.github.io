<script lang="ts">
  // The cursor, matched to kislay.forg.to: one 14px orange rounded square that
  // sits exactly on the pointer. It shrinks to a small dot over anything you can
  // press, stretches into a text bar over text, and squashes while the button is
  // down. The size changes are springs, the position is not (no lag).
  // Our additions: a small label for elements with data-cursor="…", and a few
  // pixels thrown on every click.
  import { onMount } from 'svelte';

  const HOT = 'a, button, [role=button], summary, label, select, [data-cursor]';
  const TEXT = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, code, dd, dt, figcaption, td, th';
  const FIELD_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number']);

  let enabled = $state(false);
  let visible = $state(false);
  let label = $state('');
  let box: HTMLDivElement | undefined = $state();
  let tag: HTMLSpanElement | undefined = $state();

  onMount(() => {
    if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    enabled = true;
    document.documentElement.classList.add('has-cursor');

    let x = -100, y = -100;
    let mode: 'idle' | 'hot' | 'text' = 'idle';
    let pressed = false;
    // Scale springs (current value and velocity for each axis).
    let sx = 1, sy = 1, vx = 0, vy = 0;

    const target = (): [number, number] => {
      const [tx, ty] = mode === 'hot' ? [0.42, 0.42] : mode === 'text' ? [0.17, 1.6] : [1, 1];
      return pressed ? [tx * (mode === 'text' ? 1 : 0.7), ty * 0.7] : [tx, ty];
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      x = e.clientX; y = e.clientY;
      if (!visible) visible = true;
    };
    const onOver = (e: PointerEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      if (!t) return;
      const field = t.closest('input, textarea') as HTMLInputElement | HTMLTextAreaElement | null;
      const typing = !!field && (field.tagName === 'TEXTAREA' || FIELD_TYPES.has((field as HTMLInputElement).type));
      mode = t.closest(HOT) && !typing ? 'hot' : typing || t.closest(TEXT) ? 'text' : 'idle';
      const lbl = t.closest<HTMLElement>('[data-cursor]')?.dataset.cursor ?? '';
      label = lbl === 'true' || lbl === 'none' ? '' : lbl;
    };
    const onOut = (e: MouseEvent) => { if (!e.relatedTarget) visible = false; };
    const onDown = (e: MouseEvent) => {
      pressed = true;
      for (let i = 0; i < 6; i++) {
        const sp = document.createElement('i');
        const a = (Math.PI * 2 * i) / 6 + Math.random() * 0.8, d = 18 + Math.random() * 22;
        sp.className = 'spark';
        sp.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px`;
        document.body.appendChild(sp);
        setTimeout(() => sp.remove(), 520);
      }
    };
    const onUp = () => (pressed = false);

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('mouseout', onOut);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup', onUp);
    window.addEventListener('blur', onUp);

    let raf = 0, prev = performance.now();
    const K = 420, D = 28; // stiffness and damping: quick, with a small overshoot
    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - prev) / 1000); prev = now;
      const [tx, ty] = target();
      vx += (K * (tx - sx) - D * vx) * dt; sx += vx * dt;
      vy += (K * (ty - sy) - D * vy) * dt; sy += vy * dt;
      if (box) box.style.transform = `translate3d(${x - 7}px, ${y - 7}px, 0) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
      if (tag) tag.style.transform = `translate3d(${x + 14}px, ${y + 12}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('mouseout', onOut);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
      window.removeEventListener('blur', onUp);
      document.documentElement.classList.remove('has-cursor');
    };
  });
</script>

{#if enabled}
  <div class="cursor" class:off={!visible} bind:this={box} aria-hidden="true"></div>
  <span class="tag mono" class:off={!visible || !label} bind:this={tag} aria-hidden="true">{label}</span>
{/if}

<style>
  .cursor, .tag { position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none; will-change: transform; transition: opacity 0.15s; }
  .cursor { width: 14px; height: 14px; border-radius: 4px; background: #fc4c01; }
  .tag {
    padding: 2px 8px; border-radius: 6px; background: #fc4c01; color: #fff;
    font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.06em; white-space: nowrap;
  }
  .off { opacity: 0; }

  :global(.spark) {
    position: fixed; z-index: 2147483646; width: 4px; height: 4px; margin: -2px 0 0 -2px; pointer-events: none; background: #fc4c01;
    animation: spark 0.5s cubic-bezier(0.2, 0.8, 0.3, 1) forwards;
  }
  @keyframes -global-spark { to { transform: translate(var(--dx), var(--dy)) scale(0.2); opacity: 0; } }

  /* Hide the native cursor only while the custom one is mounted. */
  :global(html.has-cursor), :global(html.has-cursor *) { cursor: none !important; }
</style>
