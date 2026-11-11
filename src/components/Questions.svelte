<script lang="ts">
  import { play } from '../lib/sound';

  let { questions }: { questions: { q: string; a: string }[] } = $props();

  let active = $state<number | null>(null);
  let shown = $state('');
  let typing = $state(false);
  let timer: ReturnType<typeof setInterval> | undefined;

  function reduced() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = undefined;
    typing = false;
  }

  function typeOut(text: string) {
    stop();
    if (reduced()) {
      shown = text;
      return;
    }
    shown = '';
    typing = true;
    let i = 0;
    timer = setInterval(() => {
      i += 1;
      shown = text.slice(0, i);
      if (i >= text.length) stop();
    }, 10);
  }

  function pick(i: number) {
    play('tap');
    if (active === i) {
      stop();
      active = null;
      shown = '';
      return;
    }
    active = i;
    typeOut(questions[i].a);
  }

  $effect(() => () => stop());
</script>

<div class="questions">
  <h2>Before you hire me</h2>
  <p class="sub">go on, ask:</p>

  <div class="chips">
    {#each questions as item, i (item.q)}
      <button
        type="button"
        class="pill chip"
        aria-pressed={active === i}
        onclick={() => pick(i)}
      >{item.q}</button>
    {/each}
  </div>

  <div class="answer" aria-live="polite" aria-busy={typing}>
    {#if active !== null}
      <div class="bubble">
        <div class="avatar" aria-hidden="true">rd</div>
        <div class="card">
          <div class="who">
            <span class="name">riju</span>
            <span class="online">online</span>
          </div>
          <p class="text">{shown}{#if typing}<span class="caret" aria-hidden="true"></span>{/if}</p>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .questions { margin-top: 8px; }
  h2 { font-size: 1.375rem; font-weight: 500; letter-spacing: -0.025em; line-height: 1.3; color: var(--ink); margin: 0; }
  .sub { margin: 4px 0 0; font-size: 0.8125rem; color: var(--muted); }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
  .chip { font-size: 0.8125rem; padding: 5px 11px; text-align: left; }
  .chip[aria-pressed='true'] {
    border-color: var(--accent); background: var(--accent-soft); color: var(--ink);
  }

  .answer { margin-top: 16px; }
  .bubble { display: flex; gap: 10px; align-items: flex-start; }
  .avatar {
    flex: none; width: 22px; height: 22px; border-radius: 6px;
    background: var(--ink); color: var(--paper);
    display: grid; place-items: center; font-family: var(--font-sans); font-weight: 600;
    font-size: 0.6875rem; letter-spacing: -0.02em; line-height: 1;
  }
  .card {
    flex: 1; min-width: 0; padding: 14px 16px; background: var(--surface);
    border: 1px solid var(--rule); border-radius: var(--radius); box-shadow: var(--shadow);
  }
  .who { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-family: var(--font-mono); font-size: 0.75rem; }
  .name { color: var(--ink); }
  .online { display: inline-flex; align-items: center; gap: 5px; color: var(--ok); }
  .online::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--ok); }
  .text { margin: 0; color: var(--text); font-size: 0.9375rem; line-height: 1.6; overflow-wrap: anywhere; }
  .caret {
    display: inline-block; width: 2px; height: 1em; margin-left: 2px; vertical-align: -2px;
    background: var(--accent); animation: blink 1s steps(1) infinite;
  }
  @keyframes blink { 50% { opacity: 0; } }
</style>
