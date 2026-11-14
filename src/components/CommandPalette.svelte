<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { play, isMuted, setMuted } from '../lib/sound';
  import { toast, copiedLine } from '../lib/toast';
  import { profile, links } from '../data/site';

  // Every case study, in the same order as the projects log (passed in from Base.astro).
  let { cases = [] }: { cases?: { id: string; title: string }[] } = $props();

  type Group = 'Go to' | 'Case studies' | 'Actions' | 'Elsewhere';
  const GROUPS: Group[] = ['Go to', 'Case studies', 'Actions', 'Elsewhere'];

  type Cmd = {
    id: string;
    group: Group;
    label: string;
    hint?: string;
    ok?: boolean;
    stay?: boolean;
    run: () => void | Promise<void>;
  };

  let open = $state(false);
  let query = $state('');
  let active = $state(0);
  let copied = $state(false);
  let muted = $state(false);
  let theme = $state<'light' | 'dark'>('light');
  let reduced = $state(false);
  let inputEl = $state<HTMLInputElement>();
  let dialogEl = $state<HTMLElement>();
  let listEl = $state<HTMLElement>();
  let prevFocus: HTMLElement | null = null;
  let touch = $state(false);
  let vvh = $state(0); // visible height above an on-screen keyboard

  const dur = $derived(reduced ? 0 : 180);

  // Navigation: same-page hashes go through a real anchor so SmoothScroll handles the offset.
  async function visit(href: string) {
    const url = new URL(href, location.href);
    if (url.pathname === location.pathname && url.hash) {
      const a = document.createElement('a');
      a.href = href;
      document.body.append(a);
      a.click();
      a.remove();
      return;
    }
    location.href = href;
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(profile.email);
      copied = true;
      play('copy');
      toast(copiedLine(profile.email));
    } catch {}
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('rd:theme', next); } catch {}
  }

  function toggleSound() {
    setMuted(!isMuted());
  }

  function downloadResume() {
    const a = document.createElement('a');
    a.href = '/resume.pdf';
    a.download = '';
    document.body.append(a);
    a.click();
    a.remove();
  }

  function replayIntro() {
    if (location.pathname === '/') {
      window.dispatchEvent(new CustomEvent('intro:replay'));
      return;
    }
    // The home page plays the intro when this session hasn't seen it yet.
    try { sessionStorage.removeItem('rd:intro'); } catch {}
    location.href = '/';
  }

  const route = (id: string, group: Group, label: string, href: string): Cmd => ({
    id, group, label, hint: href, run: () => visit(href),
  });

  const commands = $derived.by<Cmd[]>(() => [
    route('home', 'Go to', 'Home', '/'),
    route('work', 'Go to', 'Projects', '/#work'),
    route('experience', 'Go to', 'Experience', '/#experience'),
    route('ask', 'Go to', 'Before you hire me', '/#ask'),
    route('pipeline', 'Go to', 'Take my pager', '/#pipeline'),
    route('contact', 'Go to', 'Say hi', '/#contact'),

    ...cases.map((c) => route(`case-${c.id}`, 'Case studies', c.title, `/work/${c.id}`)),

    {
      id: 'copy', group: 'Actions', label: 'Copy email', stay: true,
      hint: copied ? 'copied' : profile.email, ok: copied, run: copyEmail,
    },
    { id: 'theme', group: 'Actions', label: 'Toggle theme', hint: theme === 'dark' ? 'light' : 'dark', run: toggleTheme },
    { id: 'sound', group: 'Actions', label: 'Toggle sound', hint: muted ? 'off' : 'on', run: toggleSound },
    { id: 'resume', group: 'Actions', label: 'Download resume', hint: '.pdf', run: downloadResume },
    { id: 'intro', group: 'Actions', label: 'Replay intro', run: replayIntro },

    ...links
      .filter((l) => l.label !== 'Resume')
      .map<Cmd>((l) => ({
        id: `ext-${l.label}`, group: 'Elsewhere', label: l.label, hint: 'new tab',
        run: () => { window.open(l.href, '_blank', 'noopener,noreferrer'); },
      })),
  ]);

  // Case-insensitive subsequence match. Prefix matches rank above other matches; -1 means no match.
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');
  function rank(q: string, text: string): number {
    if (!q) return 0;
    const t = norm(text);
    if (t.startsWith(q)) return 0;
    let i = 0;
    for (const ch of t) if (ch === q[i] && ++i === q.length) return 1;
    return -1;
  }

  type Row = { c: Cmd; i: number };
  const groups = $derived.by(() => {
    const q = norm(query.trim());
    const scored = commands.map((c) => ({ c, s: rank(q, c.label) })).filter((x) => x.s >= 0);
    const out: { name: Group; items: Row[] }[] = [];
    let i = 0;
    for (const name of GROUPS) {
      const items = scored
        .filter((x) => x.c.group === name)
        .sort((a, b) => a.s - b.s)
        .map(({ c }) => ({ c, i: i++ }));
      if (items.length) out.push({ name, items });
    }
    return out;
  });
  const flat = $derived(groups.flatMap((g) => g.items.map((r) => r.c)));

  function openPalette() {
    if (open) return;
    prevFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    query = '';
    active = 0;
    copied = false;
    muted = isMuted();
    theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    open = true;
    document.documentElement.style.overflow = 'hidden';
    play('open');
    tick().then(() => inputEl?.focus());
  }

  function close(withSound = true) {
    if (!open) return;
    open = false;
    document.documentElement.style.overflow = '';
    if (withSound) play('close');
    const el = prevFocus;
    prevFocus = null;
    if (el?.isConnected) el.focus({ preventScroll: true });
  }

  function move(d: number) {
    const n = flat.length;
    if (!n) return;
    active = (active + d + n) % n;
    tick().then(() => listEl?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }));
  }

  function execute(cmd: Cmd) {
    if (cmd.stay) {
      cmd.run();
      return;
    }
    play('tap');
    close(false);
    cmd.run();
  }

  function isTyping(t: EventTarget | null) {
    return t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  }

  onMount(() => {
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    touch = matchMedia('(hover: none)').matches;
    muted = isMuted();
    // Android keeps the layout height when the keyboard opens; size the sheet to what's visible.
    const vv = window.visualViewport;
    const onViewport = () => { vvh = vv ? vv.height : innerHeight; };
    onViewport();
    vv?.addEventListener('resize', onViewport);

    const onSound = (e: Event) => {
      muted = (e as CustomEvent<{ muted: boolean }>).detail.muted;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) close(); else openPalette();
        return;
      }
      if (!open) {
        if (e.key === '/' && !mod && !e.altKey && !isTyping(e.target)) {
          e.preventDefault();
          openPalette();
        }
        return;
      }
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          close();
          break;
        case 'ArrowDown':
          e.preventDefault();
          move(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          move(-1);
          break;
        case 'Enter': {
          e.preventDefault();
          const cmd = flat[active];
          if (cmd) execute(cmd);
          break;
        }
        case 'Tab':
          // Only the search input is focusable inside the dialog, so Tab stays on it.
          e.preventDefault();
          inputEl?.focus();
          break;
      }
    };
    // Focus trap: anything that takes focus outside the dialog gets sent back to the search input.
    const onFocusIn = (e: FocusEvent) => {
      if (open && dialogEl && !dialogEl.contains(e.target as Node)) inputEl?.focus();
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('focusin', onFocusIn);
    window.addEventListener('palette:open', openPalette);
    window.addEventListener('sound:change', onSound);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('palette:open', openPalette);
      window.removeEventListener('sound:change', onSound);
      vv?.removeEventListener('resize', onViewport);
      document.documentElement.style.overflow = '';
    };
  });
</script>

{#snippet icon(group: Group)}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    {#if group === 'Go to'}<path d="M5 12h14M13 6l6 6-6 6"/>
    {:else if group === 'Case studies'}<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>
    {:else if group === 'Actions'}<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>
    {:else}<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>{/if}
  </svg>
{/snippet}

{#if open}
  <div
    class="backdrop"
    role="presentation"
    style={vvh ? `--vvh:${vvh}px` : ''}
    transition:fade={{ duration: dur }}
    onclick={(e) => { if (e.target === e.currentTarget) close(); }}
  >
    <div
      class="dialog"
      class:touch
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      bind:this={dialogEl}
      in:scale={{ start: 0.96, duration: dur, easing: cubicOut }}
      out:fade={{ duration: dur }}
    >
      <div class="bar">
        <label class="field">
          <svg class="glass-icon" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input
            bind:this={inputEl}
            bind:value={query}
            oninput={() => (active = 0)}
            class="search"
            type="search"
            role="combobox"
            aria-label="Search pages and actions"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-autocomplete="list"
            aria-activedescendant={flat[active] ? `cmdk-${flat[active].id}` : undefined}
            placeholder={touch ? 'Search' : 'Type a command or search'}
            enterkeyhint="go"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
          />
          {#if query}<button type="button" class="clear" aria-label="Clear search" onclick={() => { query = ''; active = 0; inputEl?.focus(); }}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="var(--surface)" stroke-width="2" stroke-linecap="round"/></svg>
          </button>{/if}
        </label>
        <button type="button" class="cancel" onclick={() => close()}>{touch ? 'Cancel' : 'esc'}</button>
      </div>

      <div class="list" id="cmdk-list" role="listbox" bind:this={listEl}>
        {#each groups as g (g.name)}
          <div class="group mono" role="presentation">{g.name}</div>
          {#each g.items as it (it.c.id)}
            <button
              type="button"
              role="option"
              id={`cmdk-${it.c.id}`}
              aria-selected={it.i === active}
              class="item"
              class:nav={it.c.hint?.startsWith('/')}
              tabindex="-1"
              onclick={() => execute(it.c)}
              onpointermove={(e) => { if (e.pointerType === 'mouse') active = it.i; }}
            >
              <span class="ic">{@render icon(it.c.group)}</span>
              <span class="label">{it.c.label}</span>
              {#if it.c.hint}<span class="hint mono" class:ok={it.c.ok} class:path={it.c.hint.startsWith('/')}>{it.c.hint}</span>{/if}
            </button>
          {/each}
        {:else}
          <p class="empty">No matches for “{query}”.</p>
        {/each}
      </div>

      <footer class="foot mono">
        <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
        <span><kbd>↵</kbd> select</span>
        <span><kbd>esc</kbd> close</span>
      </footer>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed; inset: 0; z-index: 90;
    display: flex; justify-content: center; align-items: flex-start;
    padding: 12vh 16px 16px;
    background: color-mix(in oklab, var(--paper) 55%, transparent);
    backdrop-filter: blur(8px);
  }

  .dialog {
    width: 100%; max-width: 560px; max-height: 72vh;
    display: flex; flex-direction: column;
    background: var(--surface); border: 1px solid var(--rule); border-radius: var(--radius);
    box-shadow: var(--shadow); overflow: hidden;
  }

  .bar { display: flex; align-items: center; gap: 10px; padding: 0 12px 0 18px; border-bottom: 1px solid var(--rule); }
  .field { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; color: var(--muted); }
  .search {
    flex: 1; min-width: 0; padding: 16px 0; border: 0; background: transparent; color: var(--ink);
    font: inherit; font-size: 1rem; /* 16px avoids zoom on focus */ outline: none;
    appearance: none; -webkit-appearance: none;
  }
  .search::-webkit-search-cancel-button { display: none; }
  .search::placeholder { color: var(--muted); }
  .clear { display: grid; place-items: center; padding: 4px; border: 0; background: none; color: var(--muted); cursor: pointer; }
  .cancel {
    flex: none; padding: 3px 7px; border: 1px solid var(--rule-strong); border-bottom-width: 2px; border-radius: 6px;
    background: none; color: var(--muted); font-family: var(--font-mono); font-size: 0.6875rem; cursor: pointer;
  }
  .cancel:hover { color: var(--ink); }

  .list { flex: 1; min-height: 0; overflow-y: auto; padding: 6px; overscroll-behavior: contain; }
  .group { padding: 12px 12px 4px; color: var(--muted); font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.06em; }

  .item {
    display: flex; align-items: center; gap: 12px; width: 100%; padding: 9px 12px;
    border: 0; border-radius: 8px; background: transparent; color: var(--text);
    text-align: left; font-size: 0.9375rem; cursor: pointer; -webkit-tap-highlight-color: transparent;
  }
  .ic { flex: none; display: grid; place-items: center; width: 16px; color: var(--muted); }
  .label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .item[aria-selected='true'] { background: var(--accent-soft); color: var(--ink); }
  .item[aria-selected='true'] .ic { color: var(--accent); }

  .hint { flex: none; max-width: 45%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted); font-size: 0.75rem; }
  .hint.ok { color: var(--ok); }

  .empty { margin: 0; padding: 16px 12px; font-size: 0.9375rem; color: var(--muted); }

  .foot { display: flex; flex-wrap: wrap; gap: 6px 16px; padding: 10px 14px; border-top: 1px solid var(--rule); color: var(--muted); font-size: 0.75rem; }
  kbd { font: inherit; padding: 0 4px; margin-right: 2px; border: 1px solid var(--rule-strong); border-radius: 4px; color: var(--ink); }

  /* Phones: an iOS search sheet. Frosted like the bars, a rounded search field with
     Cancel beside it, big rows grouped as inset lists, and no keyboard hints. */
  @media (max-width: 760px) {
    .backdrop {
      align-items: flex-start;
      padding: max(8px, env(safe-area-inset-top)) 10px 10px;
      background: rgb(0 0 0 / 0.35);
      backdrop-filter: blur(6px);
    }
    :global(:root[data-theme='light']) .backdrop { background: rgb(0 0 0 / 0.18); }
    .dialog {
      max-width: none;
      max-height: calc(var(--vvh, 100dvh) - max(8px, env(safe-area-inset-top)) - 10px);
      border-radius: 24px;
      background: rgb(30 30 32 / 0.8);
      backdrop-filter: blur(30px) saturate(1.8);
      border: 0.5px solid rgb(255 255 255 / 0.14);
      box-shadow: inset 0 1px 0.5px rgb(255 255 255 / 0.18), 0 20px 50px -12px rgb(0 0 0 / 0.6);
    }
    :global(:root[data-theme='light']) .dialog {
      background: rgb(248 248 250 / 0.84);
      border-color: rgb(0 0 0 / 0.07);
      box-shadow: inset 0 1px 0.5px rgb(255 255 255 / 0.9), 0 20px 50px -12px rgb(0 0 0 / 0.25);
    }
    .bar { gap: 12px; padding: 12px 12px 8px; border-bottom: 0; }
    .field { gap: 6px; height: 40px; padding: 0 8px 0 10px; border-radius: 12px; background: rgb(127 127 127 / 0.2); }
    .search { padding: 0; font-family: var(--font-sans); }
    .cancel { padding: 6px 2px; border: 0; color: var(--accent); font-family: var(--font-sans); font-size: 1rem; font-weight: 500; }
    .cancel:active { opacity: 0.5; }

    .list { padding: 0 12px 12px; }
    .group { padding: 16px 6px 6px; font-family: var(--font-sans); font-size: 0.75rem; font-weight: 600; letter-spacing: 0.02em; }
    .item { min-height: 48px; gap: 14px; padding: 0 14px; border-radius: 0; font-size: 1rem; color: var(--ink); background: rgb(127 127 127 / 0.12); }
    .item + .item { box-shadow: inset 0 0.5px 0 rgb(127 127 127 / 0.28); }
    .group + .item { border-top-left-radius: 12px; border-top-right-radius: 12px; }
    .item:has(+ .group), .item:last-child { border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; }
    .ic { width: 28px; height: 28px; border-radius: 8px; background: rgb(127 127 127 / 0.2); color: var(--ink); }
    .hint { font-size: 0.75rem; }
    /* On touch, the press shows instead of a keyboard selection. The first match still
       runs on the keyboard's Go key. */
    .touch .item[aria-selected='true'] { background: rgb(127 127 127 / 0.12); }
    .touch .item[aria-selected='true'] .ic { color: var(--ink); }
    .item:active, .touch .item:active { background: rgb(127 127 127 / 0.26); }
    .foot { display: none; }
    /* Page rows end in a chevron instead of their path. */
    .hint.path { display: none; }
    .item.nav::after { content: ''; flex: none; width: 7px; height: 7px; margin-right: 3px; border-top: 2px solid var(--muted); border-right: 2px solid var(--muted); rotate: 45deg; opacity: 0.7; }
  }
</style>
