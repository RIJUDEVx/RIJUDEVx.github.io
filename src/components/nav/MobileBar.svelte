<script lang="ts">
  // Phones only (≤760px): the site behaves like an iOS app.
  //  - Top: a compact glass navigation bar that fades in once the large title
  //    (the profile header) scrolls away, with the current section as its title.
  //  - Bottom: a floating Liquid Glass tab bar with a sliding selection bubble,
  //    plus a separate round search button (iOS 26 pattern). It minimises to the
  //    active tab while you scroll down and expands when you scroll up or tap.
  import { onMount, tick } from 'svelte';
  import { Spring } from 'svelte/motion';
  import { fly } from 'svelte/transition';
  import { createPageState, reducedMotion } from '../../lib/nav.svelte';
  import { play } from '../../lib/sound';

  const tabs = [
    { id: 'top', label: 'Home', href: '/#top', icon: 'home' },
    { id: 'work', label: 'Work', href: '/#work', icon: 'stack' },
    { id: 'pipeline', label: 'Play', href: '/#pipeline', icon: 'spark' },
    { id: 'contact', label: 'Contact', href: '/#contact', icon: 'mail' },
  ] as const;
  // Sections that belong to a tab, so the bubble stays on the right tab while reading.
  const owner: Record<string, string> = {
    top: 'top', about: 'top', ask: 'top', experience: 'work', work: 'work',
    pipeline: 'pipeline', activity: 'pipeline', education: 'contact', skills: 'contact', contact: 'contact',
  };

  const page = createPageState();
  let bar: HTMLElement | undefined = $state();
  const els: Record<string, HTMLElement> = {};
  const bx = new Spring(0, { stiffness: 0.2, damping: 0.72 });
  const bw = new Spring(0, { stiffness: 0.2, damping: 0.72 });
  let mounted = $state(false);
  let forceOpen = $state(false);
  let theme = $state('dark');

  const activeTab = $derived(page.state.path === '/' ? owner[page.state.active] ?? 'top' : '');
  const compact = $derived(page.state.hidden && !forceOpen);
  const showTop = $derived(page.state.path !== '/' || page.state.progress > 0.04);

  async function place(instant = false) {
    await tick();
    const el = activeTab ? els[activeTab] : null;
    if (!bar || !el) return;
    const o = { instant: instant || reducedMotion() };
    bx.set(el.offsetLeft, o);
    bw.set(el.offsetWidth, o);
  }

  // Tabs animate their width when the bar minimises, so measure again once that settles.
  let settle: ReturnType<typeof setTimeout>;
  $effect(() => { activeTab; compact; if (mounted) { place(); clearTimeout(settle); settle = setTimeout(() => place(), 340); } });

  function haptic() { try { navigator.vibrate?.(8); } catch {} }

  function onTab(e: MouseEvent, id: string) {
    haptic();
    play('tap');
    forceOpen = false;
    if (id === 'top' && location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
    }
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
    const onResize = () => place(true);
    window.addEventListener('resize', onResize);
    return () => { stop(); window.removeEventListener('resize', onResize); };
  });
</script>

<div class="mobile">
  <header class="navbar glass" class:show={showTop} aria-hidden={!showTop}>
    <a class="av rd" href="/" aria-label="Home" tabindex={showTop ? 0 : -1}>rd</a>
    <div class="title">
      {#key page.state.label}
        <span in:fly={{ y: 6, duration: reducedMotion() ? 0 : 200 }}>{page.state.label || 'RIJUDEVx'}</span>
      {/key}
    </div>
    <button class="circle" onclick={toggleTheme} aria-label="Toggle theme" tabindex={showTop ? 0 : -1}>
      {#if theme === 'dark'}
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      {:else}
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
      {/if}
    </button>
  </header>

  <div class="dock">
    <nav class="tabbar glass" class:compact bind:this={bar} aria-label="Sections" ontransitionend={() => place()}
         onclick={() => { if (compact) { forceOpen = true; haptic(); } }}>
      {#if activeTab}<span class="bubble" style={`transform:translateX(${bx.current}px);width:${bw.current}px`} aria-hidden="true"></span>{/if}
      {#each tabs as t (t.id)}
        <a href={t.href} bind:this={els[t.id]} class:on={activeTab === t.id} class:gone={compact && activeTab !== t.id}
           aria-current={activeTab === t.id ? 'location' : undefined} onclick={(e) => onTab(e, t.id)}>
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

    /* Liquid Glass: blur + saturation, a hairline rim, a specular top edge. */
    .glass {
      position: relative;
      background: color-mix(in oklab, var(--surface) 58%, transparent);
      backdrop-filter: blur(22px) saturate(1.9); -webkit-backdrop-filter: blur(22px) saturate(1.9);
      border: 0.5px solid rgb(255 255 255 / 0.16);
      box-shadow: inset 0 1px 0.5px rgb(255 255 255 / 0.28), inset 0 -0.5px 0 rgb(255 255 255 / 0.06), 0 12px 32px -12px rgb(0 0 0 / 0.55);
    }
    :global(:root[data-theme='light']) .glass { border-color: rgb(0 0 0 / 0.06); box-shadow: inset 0 1px 0.5px rgb(255 255 255 / 0.9), 0 10px 30px -12px rgb(0 0 0 / 0.25); }
    .glass::before {
      content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
      background: linear-gradient(160deg, rgb(255 255 255 / 0.14), transparent 38%, transparent 70%, rgb(255 255 255 / 0.05));
    }

    .navbar {
      position: fixed; z-index: 60; top: max(8px, env(safe-area-inset-top)); left: 10px; right: 10px;
      height: 46px; border-radius: 23px; display: grid; grid-template-columns: 46px 1fr 46px; align-items: center;
      opacity: 0; transform: translateY(-10px) scale(0.98); pointer-events: none;
      transition: opacity 0.2s, transform 0.3s var(--ease);
    }
    .navbar.show { opacity: 1; transform: none; pointer-events: auto; }
    .av { justify-self: center; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: var(--ink); color: var(--paper); font-size: 1.1rem; padding-bottom: 2px; box-sizing: border-box; text-decoration: none; }
    .title { display: grid; justify-items: center; overflow: hidden; font-weight: 600; font-size: 0.9375rem; letter-spacing: -0.01em; color: var(--ink); }
    .title > * { grid-area: 1 / 1; white-space: nowrap; }
    .circle { justify-self: center; width: 34px; height: 34px; border-radius: 50%; border: 0; display: grid; place-items: center; background: rgb(127 127 127 / 0.16); color: var(--ink); }

    .dock {
      position: fixed; z-index: 60; left: 14px; right: 14px; bottom: max(14px, calc(env(safe-area-inset-bottom) + 4px));
      display: flex; align-items: center; justify-content: center; gap: 10px; pointer-events: none;
    }
    .tabbar {
      pointer-events: auto; flex: 0 1 auto; display: flex; align-items: center; height: 62px; padding: 4px; border-radius: 31px;
      transition: padding 0.3s var(--ease);
    }
    .tabbar a {
      position: relative; z-index: 1; display: grid; justify-items: center; align-content: center; gap: 2px;
      width: 74px; height: 54px; border-radius: 27px; color: var(--ink); text-decoration: none;
      -webkit-tap-highlight-color: transparent; transition: width 0.3s var(--ease), opacity 0.2s, color 0.15s;
    }
    .tabbar a.on { color: var(--accent); }
    .tabbar a:active { transform: scale(0.94); }
    .lbl { font-size: 0.625rem; font-weight: 600; letter-spacing: 0.01em; }
    .bubble { position: absolute; top: 4px; left: 0; height: 54px; border-radius: 27px; background: rgb(127 127 127 / 0.2); box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.12); }

    .tabbar.compact { height: 52px; }
    .tabbar.compact a { height: 44px; }
    .tabbar.compact .lbl { display: none; }
    .tabbar.compact .bubble { height: 44px; }
    .tabbar a.gone { width: 0; opacity: 0; pointer-events: none; overflow: hidden; }

    .search { pointer-events: auto; flex: none; width: 62px; height: 62px; border-radius: 50%; display: grid; place-items: center; color: var(--ink); transition: width 0.3s var(--ease), height 0.3s var(--ease); }
    .tabbar.compact + .search { width: 52px; height: 52px; }
    .search:active { transform: scale(0.94); }
  }
</style>
