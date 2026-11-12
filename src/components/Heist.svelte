<script lang="ts">
  // "Try to break in": a toy copy of the access model behind Selegic CRM.
  // You are a sales rep at Acme and want Globex's deal. Every move is a real
  // class of attack; the console shows the request, the answer, and why.
  import { play } from '../lib/sound';

  type Move = { id: string; label: string; req: string; code: number; status: string; why: string };
  const MOVES: Move[] = [
    { id: 'url', label: 'Change the workspace in the URL', req: 'GET /w/globex/deals/42', code: 403, status: 'Forbidden',
      why: 'The workspace comes from your session, never from the URL. Globex lives in its own schema; your connection cannot even see it.' },
    { id: 'role', label: 'Promote yourself to admin', req: 'PATCH /me  { "role": "admin" }', code: 403, status: 'Forbidden',
      why: 'Role is a guarded field. Only an admin can write it, and you are not one.' },
    { id: 'field', label: 'Quietly edit a locked field', req: 'PATCH /deals/7  { "amount": 0 }', code: 403, status: 'Forbidden',
      why: 'Field-level write guard: your role can read the amount on this deal, not change it.' },
    { id: 'invite', label: 'Reuse an old invite link', req: 'POST /invites/8f3a/accept', code: 410, status: 'Gone',
      why: 'Invite links expire and work once. This one has done both.' },
    { id: 'agent', label: 'Ask the AI agent to do it for you', req: 'agent.run("export every Globex deal")', code: 403, status: 'Forbidden',
      why: 'Agents call the same permission-checked tools you do. It has your access, not more.' },
    { id: 'own', label: 'Fine. Read your own deal', req: 'GET /deals/7', code: 200, status: 'OK',
      why: 'Rocket Bakery · ₹1.2L · Proposal. Allowed, because it is yours.' },
  ];
  type Line = { id: number; req: string; typed: string; code?: number; status?: string; why?: string };

  let log = $state<Line[]>([]);
  let tried = $state<Record<string, boolean>>({});
  let busy = $state(false);
  let alarm = $state(false);
  let shake = $state(false);
  let screen: HTMLDivElement | undefined = $state();
  let n = 0;

  const blocked = $derived(MOVES.filter((m) => m.code !== 200 && tried[m.id]).length);
  const allowed = $derived(MOVES.filter((m) => m.code === 200 && tried[m.id]).length);
  const done = $derived(MOVES.every((m) => tried[m.id]));
  const down = () => requestAnimationFrame(() => screen?.scrollTo({ top: screen.scrollHeight }));

  function run(m: Move) {
    if (busy) return;
    busy = true;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    log.push({ id: n++, req: m.req, typed: still ? m.req : '' });
    const line = log[log.length - 1];
    down();
    let i = line.typed.length;
    const type = () => {
      if (i < m.req.length) { i += 2; line.typed = m.req.slice(0, i); if (i % 6 === 0) play('tap'); setTimeout(type, 16); return; }
      setTimeout(() => {
        line.code = m.code; line.status = m.status; line.why = m.why;
        tried[m.id] = true; busy = false;
        if (m.code === 200) play('win');
        else { play('deny'); alarm = true; shake = true; setTimeout(() => (shake = false), 380); setTimeout(() => (alarm = false), 1200); }
        down();
      }, still ? 0 : 320);
    };
    type();
  }
  function reset() { log = []; tried = {}; play('close'); }
</script>

<div class="heist" class:shake>
  <div class="bar mono">
    <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
    <span class="who">rep@acme · sales rep · workspace acme</span>
    <span class="lamp" class:on={alarm} aria-hidden="true"></span>
  </div>
  <div class="split">
    <div class="moves">
      <p class="goal">Your target: <b>Globex’s ₹2.1L deal.</b> It is not yours. Pick a way in.</p>
      <ul>
        {#each MOVES as m (m.id)}
          <li>
            <button class:tried={tried[m.id]} class:ok={tried[m.id] && m.code === 200} disabled={busy} onclick={() => run(m)} data-cursor={m.code === 200 ? 'allowed' : 'try it'}>
              <span class="mark mono" aria-hidden="true">{tried[m.id] ? (m.code === 200 ? '✓' : '✕') : '→'}</span>{m.label}
            </button>
          </li>
        {/each}
      </ul>
    </div>
    <div class="screen mono" bind:this={screen} role="log" aria-live="polite">
      {#if !log.length}<p class="idle">waiting for your first move<span class="caret">▍</span></p>{/if}
      {#each log as l (l.id)}
        <p class="req"><span class="pr">$</span> {l.typed}{#if l.code === undefined}<span class="caret">▍</span>{/if}</p>
        {#if l.code !== undefined}
          <p class="res" class:good={l.code === 200}>← {l.code} {l.status}</p>
          <p class="why">{l.why}</p>
        {/if}
      {/each}
      {#if done}
        <p class="end">Nothing got through that shouldn’t. That’s the part of the job I like.</p>
      {/if}
    </div>
  </div>
  <div class="foot mono">
    <span>blocked <b>{blocked}</b>/5 · allowed <b>{allowed}</b>/1</span>
    {#if done}<a href="/work/selegic-crm" data-sound="tap">how the real one is built ↗</a>{/if}
    {#if log.length}<button class="reset" onclick={reset}>reset</button>{/if}
  </div>
</div>
<p class="fine mono">a toy, written for this page. the ideas are from the real thing: a schema per tenant, guarded fields, permission-checked agent tools.</p>

<style>
  .heist { border: 1px solid var(--rule-strong); border-radius: 16px; overflow: hidden; background: var(--surface); box-shadow: var(--shadow); }
  .heist.shake { animation: shake 0.36s; }
  @keyframes shake { 20% { transform: translateX(-5px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(2px); } }
  .bar { display: flex; align-items: center; gap: 12px; padding: 9px 14px; border-bottom: 1px solid var(--rule); font-size: 0.6875rem; color: var(--muted); }
  .dots { display: inline-flex; gap: 5px; } .dots i { width: 9px; height: 9px; border-radius: 50%; background: var(--rule-strong); }
  .who { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lamp { width: 9px; height: 9px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 0 3px color-mix(in oklab, var(--ok) 20%, transparent); transition: background 0.2s, box-shadow 0.2s; }
  .lamp.on { background: var(--danger); box-shadow: 0 0 0 3px color-mix(in oklab, var(--danger) 25%, transparent), 0 0 14px var(--danger); animation: blink 0.3s steps(2) 4; }
  @keyframes blink { 50% { opacity: 0.3; } }

  .split { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); }
  .moves { padding: 16px; border-right: 1px solid var(--rule); }
  .goal { margin: 0 0 12px; font-size: 0.8125rem; line-height: 1.5; color: var(--text); }
  .goal b { color: var(--ink); font-weight: 600; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .moves button {
    display: flex; gap: 10px; align-items: baseline; width: 100%; text-align: left; cursor: pointer; padding: 8px 10px; border-radius: 9px;
    border: 1px solid var(--rule); background: var(--paper); color: var(--ink); font: inherit; font-size: 0.8125rem; line-height: 1.35;
    transition: border-color 0.15s, transform 0.15s var(--ease), color 0.15s;
  }
  .moves button:hover:not(:disabled) { border-color: var(--rule-strong); transform: translateX(3px); }
  .moves button:disabled { cursor: progress; }
  .mark { color: var(--muted); font-size: 0.75rem; width: 10px; flex: none; }
  .tried { color: var(--muted); } .tried .mark { color: var(--danger); } .tried.ok .mark { color: var(--ok); }

  .screen { height: 318px; overflow-y: auto; padding: 14px 16px; font-size: 0.75rem; line-height: 1.6; background: color-mix(in oklab, var(--paper) 86%, #000); overscroll-behavior: contain; }
  .screen p { margin: 0; }
  .idle { color: var(--muted); }
  .req { color: var(--ink); margin-top: 10px !important; overflow-wrap: anywhere; } .req:first-child { margin-top: 0 !important; }
  .pr { color: var(--muted); }
  .res { color: var(--danger); font-weight: 500; } .res.good { color: var(--ok); }
  .why { color: var(--text); font-family: var(--font-sans); font-size: 0.8125rem; line-height: 1.5; }
  .end { margin-top: 14px !important; padding-top: 12px; border-top: 1px dashed var(--rule-strong); color: var(--ink); font-family: var(--font-sans); font-size: 0.875rem; }
  .caret { animation: caret 1s steps(2) infinite; } @keyframes caret { 50% { opacity: 0; } }

  .foot { display: flex; align-items: center; gap: 16px; padding: 9px 14px; border-top: 1px solid var(--rule); font-size: 0.6875rem; color: var(--muted); }
  .foot b { color: var(--ink); font-weight: 500; }
  .foot a { color: var(--accent); text-decoration: none; margin-left: auto; } .foot a:hover { text-decoration: underline; text-underline-offset: 3px; }
  .reset { margin-left: auto; border: 0; background: none; padding: 0; cursor: pointer; font: inherit; color: var(--muted); text-decoration: underline dotted; text-underline-offset: 3px; }
  .foot a + .reset { margin-left: 0; }
  .fine { margin: 12px 0 0; font-size: 0.6875rem; color: var(--muted); line-height: 1.6; }
  @media (max-width: 760px) {
    .split { grid-template-columns: 1fr; }
    .moves { border-right: 0; border-bottom: 1px solid var(--rule); }
    .screen { height: 240px; }
  }
  @media (prefers-reduced-motion: reduce) { .heist.shake, .lamp.on, .caret { animation: none; } }
</style>
