<script lang="ts">
  // An underlined project name inside running text. Hover (or focus) and a small
  // card springs out of the word: area, years, status, summary, numbers. The card
  // follows the cursor along the word, flips below when there's no room above,
  // and you can move into it. On touch, the first tap opens it, the second follows the link.
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    href: string; title: string; area: string; years: string; status: string; tone: string;
    summary: string; stats?: { value: string; label: string }[]; children?: Snippet;
  }
  let { href, title, area, years, status, tone, summary, stats = [], children }: Props = $props();

  let word: HTMLAnchorElement | undefined = $state();
  let card: HTMLSpanElement | undefined = $state();
  let open = $state(false);
  let below = $state(false);
  let x = $state(0);       // card offset relative to the word's left edge
  let origin = $state(0);  // where the card grows from, inside the card
  let touchArmed = false;
  let tOpen: ReturnType<typeof setTimeout>, tClose: ReturnType<typeof setTimeout>;
  const id = `peek-${Math.random().toString(36).slice(2, 8)}`;
  const W = 300;

  function place(clientX?: number) {
    if (!word) return;
    const r = word.getBoundingClientRect();
    const px = clientX ?? r.left + r.width / 2;
    const left = Math.max(12, Math.min(innerWidth - W - 12, px - W / 2));
    x = left - r.left;
    origin = Math.max(16, Math.min(W - 16, px - left));
    below = r.top < 260;
  }

  function show(clientX?: number) { clearTimeout(tClose); place(clientX); tOpen = setTimeout(() => (open = true), 70); }
  function hide() { clearTimeout(tOpen); tClose = setTimeout(() => { open = false; touchArmed = false; }, 140); }

  function onClick(e: MouseEvent) {
    if (matchMedia('(pointer: coarse)').matches && !touchArmed) {
      e.preventDefault(); touchArmed = true; place(); open = true;
    }
  }

  onMount(() => {
    const away = (e: PointerEvent) => { if (open && word && card && !word.contains(e.target as Node) && !card.contains(e.target as Node)) { open = false; touchArmed = false; } };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') open = false; };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  });
</script>

<span class="peek"><a bind:this={word} class="w" class:on={open} {href} aria-describedby={id} data-cursor="peek"
  onpointerenter={(e) => { if (e.pointerType === 'mouse') show(e.clientX); }}
  onpointermove={(e) => { if (e.pointerType === 'mouse' && open) place(e.clientX); }}
  onpointerleave={(e) => { if (e.pointerType === 'mouse') hide(); }}
  onfocus={() => show()} onblur={hide} onclick={onClick}
><i class="dot" data-tone={tone} aria-hidden="true"></i>{@render children?.()}</a><span
  bind:this={card} class="card" class:open class:below {id} role="tooltip"
  style={`left:${x}px;--o:${origin}px`}
  onpointerenter={() => clearTimeout(tClose)} onpointerleave={hide}
><span class="top"><span class="meta">{area} · {years}</span><span class="st" data-tone={tone}><i></i>{status}</span></span><span class="t">{title}</span><span class="s">{summary}</span>{#if stats.length}<span class="nums">{#each stats.slice(0, 2) as n}<span><b>{n.value}</b>{n.label}</span>{/each}</span>{/if}<a class="go" {href}>Open case study <span aria-hidden="true">↗</span></a></span></span>

<style>
  .peek { position: relative; display: inline; }
  .w {
    color: var(--ink); text-decoration: none; font-weight: 500; white-space: nowrap;
    background: linear-gradient(currentColor, currentColor) 0 100% / 100% 1px no-repeat,
                linear-gradient(var(--accent), var(--accent)) 0 100% / 0% 2px no-repeat;
    background-size: 100% 1px, 0% 2px; padding-bottom: 1px;
    transition: background-size 0.35s var(--ease), color 0.2s;
  }
  .w:hover, .w.on, .w:focus-visible { background-size: 100% 1px, 100% 2px; color: var(--ink); }
  .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin: 0 5px 2px 1px; vertical-align: middle; background: var(--muted); }
  .dot[data-tone='ok'] { background: var(--ok); } .dot[data-tone='pilot'] { background: var(--accent); }

  .card {
    white-space: normal;
    position: absolute; bottom: calc(100% + 10px); z-index: 60; width: 300px; display: grid; gap: 8px;
    padding: 14px 16px 12px; border-radius: 16px; background: var(--surface);
    box-shadow: 0 0 0 1px var(--rule-strong), 0 24px 60px -24px rgb(0 0 0 / 0.55);
    font-size: 0.8125rem; line-height: 1.45; color: var(--text); text-align: left; white-space: normal;
    transform-origin: var(--o) 100%; transform: scale(0.92) translateY(6px); opacity: 0; visibility: hidden; pointer-events: none;
    transition: transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1), opacity 0.16s, visibility 0.16s;
  }
  .card.below { bottom: auto; top: calc(100% + 10px); transform-origin: var(--o) 0; transform: scale(0.92) translateY(-6px); }
  .card.open { transform: none; opacity: 1; visibility: visible; pointer-events: auto; }
  .top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .meta { font-family: var(--font-mono); font-size: 0.6875rem; color: var(--muted); }
  .st { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 0.625rem; color: var(--text); }
  .st i { width: 6px; height: 6px; border-radius: 50%; background: var(--muted); }
  .st[data-tone='ok'] i { background: var(--ok); } .st[data-tone='pilot'] i { background: var(--accent); }
  .t { font-size: 1.125rem; font-weight: 600; letter-spacing: -0.02em; color: var(--ink); }
  .nums { display: flex; gap: 18px; }
  .nums span { display: grid; font-size: 0.6875rem; color: var(--muted); }
  .nums b { font-size: 1rem; color: var(--ink); letter-spacing: -0.02em; }
  .go { justify-self: start; margin-top: 2px; font-family: var(--font-mono); font-size: 0.6875rem; color: var(--accent); text-decoration: none; }
  .go:hover { text-decoration: underline; text-underline-offset: 3px; }
  @media (prefers-reduced-motion: reduce) { .card { transition: opacity 0.12s, visibility 0.12s; transform: none !important; } .w { transition: none; } }
</style>
