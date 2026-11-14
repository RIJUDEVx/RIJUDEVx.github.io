<script lang="ts">
  // Phones only (≤760px): the site behaves like an iOS app.
  //  - Top: a frosted navigation bar. On the home page it fades in once the large
  //    title (the hero heading) scrolls away, titled with the section you're in.
  //    On other pages it's always there with a back button ("‹ Projects"), and the
  //    page title fades into it once the page's own heading scrolls under it.
  //    Tapping the title scrolls back to the top, like tapping the status bar.
  //  - Bottom: a floating frosted tab bar with a sliding selection bubble, plus a
  //    separate round search button (iOS 26 pattern). It never minimises. The tab
  //    that owns the current page or section stays selected.
  import { onMount, tick } from 'svelte';
  import { Spring } from 'svelte/motion';
  import { fly } from 'svelte/transition';
  import { createPageState, reducedMotion } from '../../lib/nav.svelte';
  import { play } from '../../lib/sound';

  const tabs = [
    { id: 'top', label: 'Home', href: '/#top', icon: 'home' },
    { id: 'work', label: 'Projects', href: '/#work', icon: 'stack' },
    { id: 'pipeline', label: 'Play', href: '/#pipeline', icon: 'spark' },
    { id: 'contact', label: 'Contact', href: '/#contact', icon: 'mail' },
  ] as const;
  // Home sections, in page order, mapped to the tab that owns them and the bar title.
  const sections: Record<string, { tab: string; title: string }> = {
    top: { tab: 'top', title: 'RIJUDEVx' },
    about: { tab: 'top', title: 'About' },
    work: { tab: 'work', title: 'Projects' },
    experience: { tab: 'work', title: 'Experience' },
    ask: { tab: 'work', title: 'Before you hire me' },
    pipeline: { tab: 'pipeline', title: 'Take my pager' },
    contact: { tab: 'contact', title: 'Say hi' },
  };
  // Pages other than home: which tab they belong to and where "back" goes.
  const routeFor = (path: string) =>
    path === '/' ? { tab: '', back: null }
    : path.startsWith('/work/') ? { tab: 'work', back: { label: 'Projects', href: '/#work' } }
    : { tab: 'top', back: { label: 'Home', href: '/' } };

  const page = createPageState();
  let bar: HTMLElement | undefined = $state();
  const els: Record<string, HTMLElement> = $state({});
  const bx = new Spring(0, { stiffness: 0.2, damping: 0.72 });
  const bw = new Spring(0, { stiffness: 0.2, damping: 0.72 });
  let mounted = $state(false);
  let theme = $state('dark');
  let headingGone = $state(false); // the page's large title has scrolled under the bar

  const home = $derived(page.state.path === '/');
  const route = $derived(routeFor(page.state.path));
  const activeTab = $derived(home ? sections[page.state.active]?.tab ?? 'top' : route.tab);
  const showTop = $derived(!home || headingGone);
  const title = $derived(home ? sections[page.state.active]?.title ?? 'RIJUDEVx' : page.state.label);
  const showTitle = $derived(home || headingGone);

  async function place(instant = false) {
    await tick();
    const el = activeTab ? els[activeTab] : null;
    if (!bar || !el) return;
    const o = { instant: instant || reducedMotion() };
    bx.set(el.offsetLeft, o);
    bw.set(el.offsetWidth, o);
  }
  $effect(() => { activeTab; if (mounted) place(); });

  function haptic() { try { navigator.vibrate?.(8); } catch {} }
  const toTop = () => window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });

  function onTab(e: MouseEvent, id: string) {
    haptic();
    play('tap');
    if (id === 'top' && home) { e.preventDefault(); toTop(); }
  }

  // Back returns to where you were on the home page when you came from it, like a pop.
  function onBack(e: MouseEvent) {
    haptic();
    play('tap');
    try {
      const from = document.referrer ? new URL(document.referrer) : null;
      if (from && from.origin === location.origin && from.pathname === '/' && history.length > 1) { e.preventDefault(); history.back(); }
    } catch {}
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    theme = next;
    try { localStorage.setItem('rd:theme', next); } catch {}
    haptic();
    play('toggle');
  }

  onMount(() => {
    const stop = page.start();
    theme = document.documentElement.dataset.theme ?? 'dark';
    mounted = true;
    place(true);
    // Watch the page's large title; once it has scrolled up under the bar, the bar takes over.
    const h1 = document.querySelector('main h1');
    const io = h1 ? new IntersectionObserver(([e]) => { headingGone = !e.isIntersecting && e.boundingClientRect.top < 64; }, { rootMargin: '-64px 0px 0px 0px' }) : null;
    if (h1) io!.observe(h1);
    const onResize = () => place(true);
    window.addEventListener('resize', onResize);
    return () => { stop(); io?.disconnect(); window.removeEventListener('resize', onResize); };
  });
</script>

<div class="mobile">
  <header class="navbar glass" class:show={showTop} aria-hidden={!showTop}>
    {#if route.back}
      <a class="back" href={route.back.href} onclick={onBack} tabindex={showTop ? 0 : -1} aria-label={`Back to ${route.back.label}`}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
        <span>{route.back.label}</span>
      </a>
    {:else}
      <a class="av rd" href="/#top" aria-label="Home" tabindex={showTop ? 0 : -1} onclick={(e) => { e.preventDefault(); haptic(); toTop(); }}>rd</a>
    {/if}
    <button class="title" class:on={showTitle} onclick={toTop} tabindex="-1" aria-hidden="true">
      {#key title}
        <span in:fly={{ y: 6, duration: reducedMotion() ? 0 : 200 }}>{title}</span>
      {/key}
    </button>
    <button class="circle" onclick={toggleTheme} aria-label="Toggle theme" tabindex={showTop ? 0 : -1}>
      {#if theme === 'dark'}
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      {:else}
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
      {/if}
    </button>
  </header>

  <div class="dock">
    <nav class="tabbar glass" bind:this={bar} aria-label="Sections">
      {#if activeTab}<span class="bubble" style={`transform:translateX(${bx.current}px);width:${bw.current}px`} aria-hidden="true"></span>{/if}
      {#each tabs as t (t.id)}
        <a href={t.href} bind:this={els[t.id]} class:on={activeTab === t.id}
           aria-current={activeTab === t.id ? (home ? 'location' : 'page') : undefined} onclick={(e) => onTab(e, t.id)}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            {#if t.icon === 'home'}<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>
            {:else if t.icon === 'stack'}<rect x="3" y="8" width="18" height="13" rx="3"/><path d="M6 5h12M8.5 2h7"/>
            {:else if t.icon === 'spark'}<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>
            {:else}<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>{/if}
          </svg>
          <span class="lbl">{t.label}</span>
        </a>
      {/each}
    </nav>
    <button class="search glass" aria-label="Search" onclick={() => { haptic(); window.dispatchEvent(new CustomEvent('palette:open')); }}>
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    </button>
  </div>
</div>

<style>
  .mobile { display: none; }
  @media (max-width: 760px) {
    .mobile { display: block; }

    /* Frosted glass: a heavy blur with a tinted fill, so text behind it reads as soft
       colour, not as letters. A hairline rim and a light top edge give it thickness. */
    .glass {
      --frost: rgb(30 30 32 / 0.72);
      position: relative;
      background: var(--frost);
      backdrop-filter: blur(30px) saturate(1.8);
      border: 0.5px solid rgb(255 255 255 / 0.14);
      box-shadow: inset 0 1px 0.5px rgb(255 255 255 / 0.2), 0 10px 30px -10px rgb(0 0 0 / 0.6);
    }
    :global(:root[data-theme='light']) .glass {
      --frost: rgb(248 248 250 / 0.74);
      border-color: rgb(0 0 0 / 0.07);
      box-shadow: inset 0 1px 0.5px rgb(255 255 255 / 0.9), 0 8px 26px -10px rgb(0 0 0 / 0.22);
    }
    @supports not (backdrop-filter: blur(1px)) {
      .glass { --frost: rgb(30 30 32 / 0.96); }
      :global(:root[data-theme='light']) .glass { --frost: rgb(248 248 250 / 0.97); }
    }
    .glass::before {
      content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
      background: linear-gradient(170deg, rgb(255 255 255 / 0.08), transparent 45%);
    }

    .navbar {
      position: fixed; z-index: 60; top: max(8px, env(safe-area-inset-top)); left: 10px; right: 10px;
      height: 46px; border-radius: 23px; display: grid; grid-template-columns: minmax(46px, 1fr) auto minmax(46px, 1fr); align-items: center;
      opacity: 0; transform: translateY(-10px) scale(0.98); pointer-events: none;
      transition: opacity 0.2s, transform 0.3s var(--ease);
    }
    .navbar.show { opacity: 1; transform: none; pointer-events: auto; }
    .av { justify-self: start; margin-left: 7px; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: var(--ink); color: var(--paper); font-size: 1.1rem; padding-bottom: 2px; box-sizing: border-box; text-decoration: none; }
    .back {
      justify-self: start; display: inline-flex; align-items: center; gap: 1px; height: 46px; padding: 0 10px 0 6px;
      color: var(--accent); font-size: 0.9375rem; font-weight: 500; letter-spacing: -0.01em; text-decoration: none; -webkit-tap-highlight-color: transparent;
    }
    .back:active { opacity: 0.5; }
    .title {
      display: grid; justify-items: center; max-width: 52vw; overflow: hidden; padding: 0; border: 0; background: none; color: var(--ink);
      font: inherit; font-weight: 600; font-size: 0.9375rem; letter-spacing: -0.01em;
      opacity: 0; transition: opacity 0.2s; -webkit-tap-highlight-color: transparent;
    }
    .title.on { opacity: 1; }
    .title > * { grid-area: 1 / 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    .circle { justify-self: end; margin-right: 6px; width: 34px; height: 34px; border-radius: 50%; border: 0; display: grid; place-items: center; background: rgb(127 127 127 / 0.16); color: var(--ink); }

    .dock {
      position: fixed; z-index: 60; left: 14px; right: 14px; bottom: max(14px, calc(env(safe-area-inset-bottom) + 4px));
      display: flex; align-items: center; justify-content: center; gap: 10px; pointer-events: none;
    }
    .tabbar { pointer-events: auto; flex: 0 1 304px; min-width: 0; display: flex; align-items: center; height: 62px; padding: 4px; border-radius: 31px; }
    .tabbar a {
      position: relative; z-index: 1; flex: 1 1 0; min-width: 0; display: grid; justify-items: center; align-content: center; gap: 2px;
      height: 54px; border-radius: 27px; color: var(--ink); text-decoration: none;
      -webkit-tap-highlight-color: transparent; transition: color 0.15s, transform 0.15s var(--ease);
    }
    .tabbar a.on { color: var(--accent); }
    .tabbar a:active { transform: scale(0.94); }
    .lbl { font-size: 0.625rem; font-weight: 600; letter-spacing: 0.01em; }
    .bubble { position: absolute; top: 4px; left: 0; height: 54px; border-radius: 27px; background: rgb(127 127 127 / 0.22); box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.1); }

    .search { pointer-events: auto; flex: none; width: 62px; height: 62px; border-radius: 50%; display: grid; place-items: center; color: var(--ink); -webkit-tap-highlight-color: transparent; }
    .search:active { transform: scale(0.94); }
  }
</style>
