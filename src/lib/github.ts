// Build-time GitHub contributions, fetched once per build and shared.
// GitHub's own contributions fragment includes private contributions when the
// profile shows them; the third-party API is only a fallback.
export interface Day { date: string; count: number; level: number }
export interface Contributions { total: number; days: Day[] }

const cache = new Map<string, Promise<Contributions | null>>();

async function fromGitHub(user: string, signal: AbortSignal): Promise<Contributions | null> {
  const res = await fetch(`https://github.com/users/${encodeURIComponent(user)}/contributions`, { signal, headers: { Accept: 'text/html' } });
  if (!res.ok) return null;
  const html = await res.text();
  const counts = new Map<string, number>();
  for (const m of html.matchAll(/for="([^"]+)"[^>]*>(\d+|No) contributions? on/g)) counts.set(m[1], m[2] === 'No' ? 0 : Number(m[2]));
  const days: Day[] = [];
  for (const m of html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"\s+id="([^"]+)"[^>]*data-level="(\d)"/g)) {
    days.push({ date: m[1], count: counts.get(m[2]) ?? 0, level: Number(m[3]) });
  }
  if (!days.length) return null;
  days.sort((a, b) => a.date.localeCompare(b.date));
  return { total: days.reduce((n, d) => n + d.count, 0), days };
}

async function fromApi(user: string, signal: AbortSignal): Promise<Contributions | null> {
  const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(user)}?y=last`, { signal });
  if (!res.ok) return null;
  const json = await res.json() as { total?: { lastYear?: number }; contributions?: Day[] };
  if (!json.contributions?.length) return null;
  return { total: json.total?.lastYear ?? 0, days: json.contributions };
}

export function getContributions(user: string): Promise<Contributions | null> {
  if (!cache.has(user)) {
    cache.set(user, (async () => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      try { return (await fromGitHub(user, ctrl.signal)) ?? (await fromApi(user, ctrl.signal)); }
      catch (e) { console.warn(`GitHub contributions unavailable for ${user}:`, e); return null; }
      finally { clearTimeout(t); }
    })());
  }
  return cache.get(user)!;
}
