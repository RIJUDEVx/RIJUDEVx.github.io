<script lang="ts">
  import { onMount } from 'svelte';
  import Lenis from 'lenis';
  import 'lenis/dist/lenis.css';

  // Keeps same-page anchors clear of the sticky 60px header plus some air.
  const OFFSET = -72;

  onMount(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({ autoRaf: false });
    let stopped = false;
    let rafId = 0;

    // 'top' means scroll to the top; an Element means scroll to it; null means no such target.
    const resolve = (hash: string): Element | 'top' | null => {
      let id = '';
      try { id = decodeURIComponent(hash.slice(1)); } catch {}
      if (!id) return 'top';
      return document.getElementById(id);
    };

    const scrollTo = (t: Element | 'top', immediate = false) => {
      lenis.scrollTo(t === 'top' ? 0 : t, { offset: t === 'top' ? 0 : OFFSET, immediate });
    };

    const loop = (time: number) => {
      // The intro owns the page while it plays, so Lenis stays out of the way.
      const pending = document.documentElement.dataset.intro === 'pending';
      if (pending && !stopped) { lenis.stop(); stopped = true; }
      else if (!pending && stopped) { lenis.start(); stopped = false; }
      lenis.raf(time);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href^="#"], a[href^="/#"]') as HTMLAnchorElement | null;
      if (!a || a.classList.contains('skip') || (a.target && a.target !== '_self')) return;
      const href = a.getAttribute('href') ?? '';
      let hash: string;
      if (href.startsWith('#')) hash = href;
      else if (location.pathname === '/') hash = href.slice(1);
      else return;
      const t = resolve(hash);
      if (t === null) return;
      e.preventDefault();
      scrollTo(t);
    };

    const onPageLoad = () => {
      lenis.resize();
      const t = location.hash ? resolve(location.hash) : 'top';
      if (t === null) return;
      scrollTo(t, true);
    };

    document.addEventListener('click', onClick);
    document.addEventListener('astro:page-load', onPageLoad);
    // Mounted after the first page-load (client:only): handle an incoming hash now.
    if (location.hash) onPageLoad();

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('click', onClick);
      document.removeEventListener('astro:page-load', onPageLoad);
      lenis.destroy();
    };
  });
</script>
