<script lang="ts">
  import { onMount } from 'svelte';
  import { profile } from '../data/site';

  let { variant }: { variant: 'hero' | 'footer' } = $props();

  type Snap = {
    hero: string;
    footer: string;
    status: string;
    state: 'work' | 'around' | 'asleep';
  };

  // The server render and the first client render both show the same placeholder,
  // so there is no hydration mismatch. The real time is filled in on mount.
  let snap = $state<Snap | null>(null);

  function read(now: Date): Snap {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: profile.timezone,
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';

    const hour = Number(get('hour')) % 24;
    const minute = get('minute');
    const weekday = get('weekday');
    const h12 = hour % 12 || 12;
    const ampm = hour < 12 ? 'am' : 'pm';
    const weekdayWork = !['Saturday', 'Sunday'].includes(weekday);

    let status = 'around';
    let state: Snap['state'] = 'around';
    if (weekdayWork && hour >= 9 && hour < 19) {
      status = 'at work';
      state = 'work';
    } else if (hour < 7) {
      status = 'probably asleep';
      state = 'asleep';
    }

    return {
      hero: `${h12}:${minute} ${ampm} · ${weekday.toLowerCase()}`,
      footer: `Kolkata ${String(hour).padStart(2, '0')}:${minute} IST`,
      status,
      state,
    };
  }

  function update() {
    snap = read(new Date());
  }

  onMount(() => {
    update();
    const id = setInterval(update, 15_000);
    return () => clearInterval(id);
  });
</script>

<span class="clock">
  {#if variant === 'hero'}
    {#if snap}
      <span class="mono time">{snap.hero}</span>
      <span class="status"><span class="dot" data-state={snap.state} aria-hidden="true"></span>{snap.status}</span>
    {:else}
      <span class="mono">Kolkata time</span>
    {/if}
  {:else}
    <span class="mono">{snap ? snap.footer : 'Kolkata time'}</span>
  {/if}
</span>

<style>
  .clock { font-variant-numeric: tabular-nums; }
  .time { color: inherit; }
  .status { margin-left: 10px; color: var(--muted); font-family: var(--font-mono); font-size: 0.75rem; white-space: nowrap; }
  .dot {
    display: inline-block; width: 6px; height: 6px; margin-right: 6px;
    border-radius: 50%; vertical-align: middle; background: var(--muted);
  }
  .dot[data-state='work'] { background: var(--ok); }
  .dot[data-state='around'] { background: var(--accent); }
  .dot[data-state='asleep'] { background: var(--muted); }
</style>
