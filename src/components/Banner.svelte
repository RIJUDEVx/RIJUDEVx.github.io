<script lang="ts">
  import { onMount } from 'svelte';

  // A quiet "system map": one core, four tenant clusters and a gateway.
  // Positions are unit space (0..1 of width and height), so the map scales with the banner.
  // Index 0 is the core, 13 is the gateway, and the rest are tenant clusters of three.
  const SITES: [number, number][] = [
    [0.5, 0.5],
    [0.12, 0.28], [0.2, 0.16], [0.22, 0.46], // tenant A (1-3)
    [0.62, 0.15], [0.74, 0.1], [0.7, 0.3], // tenant B (4-6)
    [0.86, 0.46], [0.94, 0.28], [0.9, 0.72], // tenant C (7-9)
    [0.3, 0.82], [0.18, 0.7], [0.4, 0.66], // tenant D (10-12)
    [0.7, 0.68], // gateway (13)
  ];
  const LINKS: [number, number][] = [
    [1, 2], [2, 3], [4, 5], [5, 6], [7, 8], [8, 9], [10, 11], [11, 12], // inside each tenant
    [0, 1], [0, 4], [0, 7], [0, 10], // tenant hubs to core
    [0, 13], [13, 7], // gateway
  ];
  const CLUSTERS = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]];

  const GRID = 24;
  const PACKETS = 7;
  const TAU = Math.PI * 2;

  type Geo = { a: number; b: number; ax: number; ay: number; bx: number; by: number; cx: number; cy: number };
  type Packet = { e: number; fwd: boolean; t: number; v: number };
  type Palette = { grid: string; edge: string; halo: string; accent: string; ink: string; muted: string };

  const adj: number[][] = SITES.map(() => []);
  LINKS.forEach(([a, b], i) => {
    adj[a].push(i);
    adj[b].push(i);
  });

  let wrap: HTMLDivElement | undefined = $state();
  let canvas: HTMLCanvasElement | undefined = $state();
  let ready = $state(false);

  let ctx: CanvasRenderingContext2D | null = null;
  let w = 0;
  let h = 0;
  let pts: { x: number; y: number }[] = [];
  let geo: Geo[] = [];
  let packets: Packet[] = [];
  let palette: Palette = { grid: '', edge: '', halo: '', accent: '', ink: '', muted: '' };
  let pointer: { x: number; y: number } | null = null;
  let onScreen = true;
  let reduced = false;
  let rafId = 0;
  let last = 0;

  function readPalette() {
    const s = getComputedStyle(document.documentElement);
    const get = (name: string) => s.getPropertyValue(name).trim();
    palette = {
      grid: get('--rule-strong'),
      edge: get('--rule-strong'),
      halo: get('--rule'),
      accent: get('--accent'),
      ink: get('--ink'),
      muted: get('--muted'),
    };
  }

  function layout() {
    pts = SITES.map(([u, v]) => ({ x: u * w, y: v * h }));
    geo = LINKS.map(([a, b], i) => {
      const A = pts[a];
      const B = pts[b];
      const mx = (A.x + B.x) / 2;
      const my = (A.y + B.y) / 2;
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      // Bend each edge a little to one side, alternating, so the map reads as woven rather than a grid.
      const k = (i % 2 ? 1 : -1) * 0.18;
      return { a, b, ax: A.x, ay: A.y, bx: B.x, by: B.y, cx: mx - dy * k, cy: my + dx * k };
    });
  }

  function bezier(g: Geo, t: number) {
    const u = 1 - t;
    return {
      x: u * u * g.ax + 2 * u * t * g.cx + t * t * g.bx,
      y: u * u * g.ay + 2 * u * t * g.cy + t * t * g.by,
    };
  }

  // Closeness of the pointer to an edge, 0..1, sampled along the curve.
  function edgeGlow(g: Geo, px: number, py: number) {
    let best = Infinity;
    for (let s = 0; s <= 12; s++) {
      const p = bezier(g, s / 12);
      best = Math.min(best, Math.hypot(p.x - px, p.y - py));
    }
    return Math.max(0, 1 - best / 90);
  }

  function step(dt: number) {
    for (const p of packets) {
      p.t += p.v * dt;
      if (p.t < 1) continue;
      // Arrived: pick the next edge out of this node, avoiding an immediate bounce back.
      const g = geo[p.e];
      const dest = p.fwd ? g.b : g.a;
      const options = adj[dest];
      let next = options[Math.floor(Math.random() * options.length)];
      if (options.length > 1 && next === p.e) next = options[(options.indexOf(next) + 1) % options.length];
      p.e = next;
      p.fwd = geo[next].a === dest;
      p.t = 0;
    }
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    // Faint dot grid.
    ctx.fillStyle = palette.grid;
    ctx.globalAlpha = 0.6;
    for (let x = GRID / 2; x < w; x += GRID) {
      for (let y = GRID / 2; y < h; y += GRID) ctx.fillRect(x - 0.7, y - 0.7, 1.4, 1.4);
    }

    // Tenant boundaries, as dashed halos.
    ctx.strokeStyle = palette.halo;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.8;
    ctx.setLineDash([2, 4]);
    for (const group of CLUSTERS) {
      const cx = group.reduce((s, i) => s + pts[i].x, 0) / group.length;
      const cy = group.reduce((s, i) => s + pts[i].y, 0) / group.length;
      const r = Math.max(...group.map((i) => Math.hypot(pts[i].x - cx, pts[i].y - cy))) + 14;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Edges.
    ctx.strokeStyle = palette.edge;
    ctx.globalAlpha = 0.7;
    for (const g of geo) {
      ctx.beginPath();
      ctx.moveTo(g.ax, g.ay);
      ctx.quadraticCurveTo(g.cx, g.cy, g.bx, g.by);
      ctx.stroke();
    }
    if (pointer) {
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 1.4;
      for (const g of geo) {
        const glow = edgeGlow(g, pointer.x, pointer.y);
        if (glow < 0.02) continue;
        ctx.globalAlpha = glow * 0.45;
        ctx.beginPath();
        ctx.moveTo(g.ax, g.ay);
        ctx.quadraticCurveTo(g.cx, g.cy, g.bx, g.by);
        ctx.stroke();
      }
    }

    // Nodes.
    pts.forEach((p, i) => {
      const near = pointer ? Math.max(0, 1 - Math.hypot(p.x - pointer.x, p.y - pointer.y) / 120) : 0;
      const base = i === 0 ? 4 : i === 13 ? 3 : 2.4;
      if (i === 0) {
        ctx!.strokeStyle = palette.edge;
        ctx!.lineWidth = 1;
        ctx!.globalAlpha = 0.9;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 9, 0, TAU);
        ctx!.stroke();
        ctx!.fillStyle = palette.ink;
        ctx!.globalAlpha = 0.5;
      } else {
        ctx!.fillStyle = palette.muted;
        ctx!.globalAlpha = 0.7;
      }
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, base, 0, TAU);
      ctx!.fill();
      if (near > 0) {
        ctx!.fillStyle = palette.ink;
        ctx!.globalAlpha = 0.15 + 0.6 * near;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, base + 1.6 * near, 0, TAU);
        ctx!.fill();
      }
    });

    // Packets: requests moving along the edges.
    ctx.fillStyle = palette.accent;
    ctx.globalAlpha = 0.9;
    for (const p of packets) {
      const g = geo[p.e];
      const q = bezier(g, p.fwd ? p.t : 1 - p.t);
      ctx.beginPath();
      ctx.arc(q.x, q.y, 1, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function resize() {
    if (!wrap || !canvas || !ctx) return;
    w = wrap.clientWidth;
    h = wrap.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout();
    draw();
  }

  function running() {
    return onScreen && !document.hidden && !reduced;
  }

  function sync() {
    if (running()) {
      if (!rafId) {
        last = 0;
        rafId = requestAnimationFrame(frame);
      }
    } else if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function frame(now: number) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    step(dt);
    draw();
    rafId = requestAnimationFrame(frame);
  }

  function onMove(e: PointerEvent) {
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (!rafId) draw();
  }

  function onLeave() {
    pointer = null;
    if (!rafId) draw();
  }

  onMount(() => {
    const el = wrap;
    const cv = canvas;
    if (!el || !cv) return;
    ctx = cv.getContext('2d');
    if (!ctx) return; // the SVG fallback stays visible

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(pointer: fine)');
    reduced = motion.matches;

    readPalette();
    packets = Array.from({ length: PACKETS }, () => ({
      e: Math.floor(Math.random() * LINKS.length),
      fwd: Math.random() < 0.5,
      t: Math.random(),
      v: 0.06 + Math.random() * 0.05,
    }));
    resize();
    ready = true;

    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    io.observe(el);

    const mo = new MutationObserver(() => {
      readPalette();
      draw();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const onVisibility = () => sync();
    document.addEventListener('visibilitychange', onVisibility);

    const onMotion = () => {
      reduced = motion.matches;
      sync();
      draw();
    };
    motion.addEventListener('change', onMotion);

    if (fine.matches) {
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);
    }

    sync();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', onMotion);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  });
</script>

<div class="map" bind:this={wrap} aria-hidden="true">
  <!-- Static dot grid for SSR and before hydration. The canvas draws the same grid, then this fades out. -->
  <svg class="fallback" class:done={ready} width="100%" height="100%" focusable="false">
    <defs>
      <pattern id="banner-dots" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
        <circle cx={GRID / 2} cy={GRID / 2} r="0.7" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#banner-dots)" />
  </svg>
  <canvas bind:this={canvas} class:ready></canvas>
</div>

<style>
  .map { position: relative; width: 100%; height: 100%; overflow: hidden; }
  .fallback,
  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }
  .fallback { opacity: 0.6; transition: opacity 0.6s var(--ease); }
  .fallback.done { opacity: 0; }
  .fallback circle { fill: var(--rule-strong); }
  canvas { opacity: 0; transition: opacity 0.6s var(--ease); }
  canvas.ready { opacity: 1; }
</style>
