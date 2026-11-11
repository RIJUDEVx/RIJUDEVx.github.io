// Shared behaviour for every nav variant: the links, which section is on screen,
// scroll direction, and a "fluid hover" highlight that glides between items
// (after Fluid Functionalism: one highlight per list, springs not durations,
// a fresh pointer entry fades in where it lands instead of sliding across).
import { Spring } from 'svelte/motion';
import { profile } from '../data/site';

export const navItems = [
  { id: 'work', label: 'Work', href: '/#work' },
  { id: 'experience', label: 'Experience', href: '/#experience' },
  { id: 'pipeline', label: 'Playground', href: '/#pipeline' },
  { id: 'contact', label: 'Contact', href: '/#contact' },
] as const;

export const handle = profile.handle;

const sectionLabel: Record<string, string> = {
  top: 'Home', about: 'About', ask: 'Before you hire me', experience: 'Experience', work: 'Projects',
  pipeline: 'Playground', activity: 'Activity', education: 'Education', skills: 'Skills', contact: 'Contact',
};

export const reducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Which home section is in view, how far down the page we are, and scroll direction. */
export function createPageState() {
  const state = $state({
    path: '/',
    active: 'top',
    label: 'Home',
    progress: 0,
    scrolled: false,
    hidden: false, // true while scrolling down past the fold
  });

  let lastY = 0;
  let io: IntersectionObserver | null = null;

  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    state.progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    state.scrolled = y > 8;
    const delta = y - lastY;
    if (Math.abs(delta) > 6) state.hidden = delta > 0 && y > 320;
    lastY = y;
  }

  function watchSections() {
    io?.disconnect();
    state.path = location.pathname;
    if (state.path !== '/') {
      state.active = '';
      state.label = document.querySelector('h1')?.textContent?.trim() ?? '';
      return;
    }
    state.active = 'top';
    state.label = 'Home';
    const visible = new Map<string, number>();
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        // The section nearest the top band wins.
        let best = 'top', bestTop = Infinity;
        for (const [id, ratio] of visible) {
          if (!ratio) continue;
          const top = Math.abs(document.getElementById(id)!.getBoundingClientRect().top);
          if (top < bestTop) { bestTop = top; best = id; }
        }
        state.active = best;
        state.label = sectionLabel[best] ?? 'Home';
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.01, 0.5] },
    );
    document.querySelectorAll('main section[id]').forEach((s) => io!.observe(s));
  }

  function start() {
    lastY = window.scrollY;
    onScroll();
    watchSections();
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('astro:page-load', watchSections);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('astro:page-load', watchSections);
      io?.disconnect();
    };
  }

  return { state, start };
}

/**
 * Fluid hover for a horizontal strip of links. Use:
 *   const fh = createFluidHover();
 *   <div use:fh.container> <span class="hl" style={fh.style}/> <a use:fh.item> ...
 */
export function createFluidHover(opts: { axis?: 'x' | 'y' } = {}) {
  const x = new Spring(0, { stiffness: 0.32, damping: 0.86 });
  const y = new Spring(0, { stiffness: 0.32, damping: 0.86 });
  const w = new Spring(0, { stiffness: 0.32, damping: 0.86 });
  const h = new Spring(0, { stiffness: 0.32, damping: 0.86 });
  const ui = $state({ visible: false, fresh: true });

  let root: HTMLElement | null = null;

  function moveTo(el: HTMLElement, instant: boolean) {
    if (!root) return;
    const r = root.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    const o = { instant: instant || reducedMotion() };
    x.set(b.left - r.left, o);
    y.set(b.top - r.top, o);
    w.set(b.width, o);
    h.set(b.height, o);
  }

  function container(node: HTMLElement) {
    root = node;
    const enter = () => { ui.fresh = true; };
    const leave = () => { ui.visible = false; };
    node.addEventListener('pointerenter', enter);
    node.addEventListener('pointerleave', leave);
    return { destroy() { node.removeEventListener('pointerenter', enter); node.removeEventListener('pointerleave', leave); } };
  }

  function item(node: HTMLElement) {
    const over = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      moveTo(node, ui.fresh || !ui.visible);
      ui.fresh = false;
      ui.visible = true;
    };
    const focus = () => { if (node.matches(':focus-visible')) { moveTo(node, !ui.visible); ui.visible = true; } };
    const blur = () => { ui.visible = false; };
    node.addEventListener('pointerover', over);
    node.addEventListener('focus', focus);
    node.addEventListener('blur', blur);
    return { destroy() { node.removeEventListener('pointerover', over); node.removeEventListener('focus', focus); node.removeEventListener('blur', blur); } };
  }

  return {
    container,
    item,
    ui,
    get style() {
      return `transform: translate3d(${x.current}px, ${y.current}px, 0); width: ${w.current}px; height: ${h.current}px; opacity: ${ui.visible ? 1 : 0};`;
    },
    _axis: opts.axis ?? 'x',
  };
}

/** A sliding indicator that follows the active link (spring, not a duration). */
export function createIndicator() {
  const x = new Spring(0, { stiffness: 0.18, damping: 0.8 });
  const w = new Spring(0, { stiffness: 0.18, damping: 0.8 });
  const ui = $state({ shown: false });
  let first = true;
  function track(root: HTMLElement | undefined, el: HTMLElement | null | undefined) {
    if (!root || !el) { ui.shown = false; return; }
    const r = root.getBoundingClientRect(), b = el.getBoundingClientRect();
    const o = { instant: first || reducedMotion() };
    x.set(b.left - r.left, o);
    w.set(b.width, o);
    first = false;
    ui.shown = true;
  }
  return {
    track,
    ui,
    get style() { return `transform: translateX(${x.current}px); width: ${w.current}px; opacity: ${ui.shown ? 1 : 0};`; },
  };
}
