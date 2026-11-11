<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { play, isMuted, setMuted } from '../lib/sound';
  import { profile, links } from '../data/site';

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
    const navigate = (url: string) => { location.href = url; };
    await navigate(href);
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(profile.email);
      copied = true;
      play('copy');
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

  async function replayIntro() {
    if (location.pathname === '/') {
      window.dispatchEvent(new CustomEvent('intro:replay'));
      return;
    }
    const again = () => {
      document.removeEventListener('astro:page-load', again);
      window.dispatchEvent(new CustomEvent('intro:replay'));
    };
    document.addEventListener('astro:page-load', again);
    const navigate = (url: string) => { location.href = url; };
    await navigate('/');
  }

  const route = (id: string, group: Group, label: string, href: string): Cmd => ({
    id, group, label, hint: href, run: () => visit(href),
  });

  const commands = $derived.by<Cmd[]>(() => [
    route('home', 'Go to', 'Home', '/'),
    route('work', 'Go to', 'Work', '/#work'),
    route('experience', 'Go to', 'Experience', '/#experience'),
    route('about', 'Go to', 'About', '/#about'),
    route('pipeline', 'Go to', 'Try the pipeline', '/#pipeline'),
    route('contact', 'Go to', 'Contact', '/#contact'),

    route('crm', 'Case studies', 'Selegic CRM', '/work/selegic-crm'),
    route('migrata', 'Case studies', 'Migrata', '/work/migrata'),
    route('internal', 'Case studies', 'Selegic Internal', '/work/selegic-internal'),
    route('doc-gen', 'Case studies', 'Doc Gen', '/work/doc-gen'),

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
    play('open');
    tick().then(() => inputEl?.focus());
  }

  function close(withSound = true) {
    if (!open) return;
    open = false;
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
    muted = isMuted();

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
    };
  });
</script>

{#if open}
  <div
    class="backdrop"
    role="presentation"
    transition:fade={{ duration: dur }}
    onclick={(e) => { if (e.target === e.currentTarget) close(); }}
  >
    <div
      class="dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      bind:this={dialogEl}
      in:scale={{ start: 0.96, duration: dur, easing: cubicOut }}
      out:fade={{ duration: dur }}
    >
      <input
        bind:this={inputEl}
        bind:value={query}
        oninput={() => (active = 0)}
        class="search"
        type="text"
        role="combobox"
        aria-label="Search commands"
        aria-expanded="true"
        aria-controls="cmdk-list"
        aria-autocomplete="list"
        aria-activedescendant={flat[active] ? `cmdk-${flat[active].id}` : undefined}
        placeholder="Type a command or search"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
      />

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
              onclick={() => execute(it.c)}
              onpointermove={() => (active = it.i)}
            >
              <span>{it.c.label}</span>
              {#if it.c.hint}<span class="hint mono" class:ok={it.c.ok}>{it.c.hint}</span>{/if}
            </button>
          {/each}
        {:else}
          <p class="empty muted">No matches for “{query}”.</p>
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
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 12vh 16px 16px;
    background: color-mix(in oklab, var(--paper) 55%, transparent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .dialog {
    width: 100%;
    max-width: 560px;
    max-height: 72vh;
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border: 1px solid var(--rule);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    overflow: hidden;
  }

  .search {
    width: 100%;
    padding: 16px 18px;
    border: 0;
    border-bottom: 1px solid var(--rule);
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: 1rem; /* 16px avoids iOS zoom on focus */
    outline: none;
  }
  .search:focus-visible { box-shadow: inset 0 -2px 0 var(--accent); }

  .list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 6px;
    overscroll-behavior: contain;
  }

  .group {
    padding: 12px 12px 4px;
    color: var(--muted);
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding: 10px 12px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--text);
    text-align: left;
    font-size: 0.9375rem;
    cursor: pointer;
  }
  .item[aria-selected='true'] {
    background: var(--accent-soft);
    color: var(--ink);
  }

  .hint {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--muted);
    font-size: 0.75rem;
  }
  .hint.ok { color: var(--ok); }

  .empty { padding: 16px 12px; font-size: 0.9375rem; }

  .foot {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    padding: 10px 14px;
    border-top: 1px solid var(--rule);
    color: var(--muted);
    font-size: 0.75rem;
  }
  kbd {
    font: inherit;
    padding: 0 4px;
    margin-right: 2px;
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
    color: var(--ink);
  }

  @media (max-width: 640px) {
    .backdrop { padding: 10px 8px; }
    .dialog { max-width: none; max-height: 80vh; }
  }
</style>
