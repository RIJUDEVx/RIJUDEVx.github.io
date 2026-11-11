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

    // Where the reader actually is, per page, so a reload returns there
    // (and never to a stale #section in the URL).
    const key = () => `rd:scroll:${location.pathname}`;
    let saveTimer = 0;
    const save = () => {
      clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        const y = Math.round(window.scrollY);
        try { sessionStorage.setItem(key(), String(y)); } catch {}
        // Astro's router saves scroll only on 'scrollend', which Lenis-driven scrolling
        // often doesn't fire, so it would restore a stale position on reload. Keep it in sync.
        if (history.state && history.state.scrollY !== y) {
          try { history.replaceState({ ...history.state, scrollX: window.scrollX, scrollY: y }, ''); } catch {}
        }
      }, 120);
    };
    const dropHash = () => {
      if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
    };
    const isReload = () => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      return nav?.type === 'reload';
    };

    let first = true;
    const onPageLoad = () => {
      lenis.resize();
      if (first && isReload()) {
        first = false;
        let y: number | null = null;
        try { const v = sessionStorage.getItem(key()); y = v === null ? null : Number(v); } catch {}
        dropHash();
        if (y !== null && !Number.isNaN(y)) { lenis.scrollTo(y, { immediate: true }); return; }
      }
      first = false;
      const t = location.hash ? resolve(location.hash) : 'top';
      dropHash();
      if (t === null) return;
      scrollTo(t, true);
    };

    document.addEventListener('click', onClick);
    document.addEventListener('astro:page-load', onPageLoad);
    window.addEventListener('scroll', save, { passive: true });
    window.addEventListener('pagehide', () => { try { sessionStorage.setItem(key(), String(Math.round(window.scrollY))); } catch {} });
    // Mounted after the first page-load (client:only): handle it now.
    onPageLoad();

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('click', onClick);
      document.removeEventListener('astro:page-load', onPageLoad);
      window.removeEventListener('scroll', save);
      lenis.destroy();
    };
  });
</script>
