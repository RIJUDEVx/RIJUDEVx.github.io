<script lang="ts">
  import { play } from '../lib/sound';

  let { email, big = false }: { email: string; big?: boolean } = $props();

  let copied = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function fallbackCopy(text: string): boolean {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.pointerEvents = 'none';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }

  async function copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return fallbackCopy(text);
    }
  }

  async function onCopy() {
    const ok = await copyText(email);
    if (!ok) {
      window.location.href = `mailto:${email}`;
      return;
    }
    play('copy');
    copied = true;
    clearTimeout(timer);
    timer = setTimeout(() => (copied = false), 1600);
  }

  $effect(() => () => clearTimeout(timer));
</script>

<span class="wrap">
  <button type="button" class="copy" class:pill={big} data-cursor="copy" title="Copy email" onclick={onCopy}>
    {email}
  </button>
  <span class="copied mono" aria-live="polite">{copied ? 'copied ✓' : ''}</span>
</span>

<style>
  .wrap { display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; max-width: 100%; }
  .copy {
    background: none; border: 0; padding: 0; cursor: pointer; min-width: 0;
    font-family: var(--font-mono); font-size: 0.75rem; letter-spacing: 0; color: inherit;
    text-align: left; overflow-wrap: anywhere;
    text-decoration: underline; text-decoration-color: var(--rule-strong); text-underline-offset: 3px;
  }
  .copy:hover { text-decoration-color: currentColor; }
  .copy.pill {
    background: var(--surface); border: 1px solid var(--rule-strong); padding: 6px 14px;
    font-family: var(--font-sans); font-weight: 500; font-size: 0.875rem; color: var(--ink); text-decoration: none;
  }
  .copy.pill:hover { border-color: var(--ink); }
  .copied { color: var(--ok); font-size: 0.75rem; min-height: 1em; }
  .copied:empty { display: none; } /* no phantom gap beside the button */
</style>
