import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { homeMarkdown, sortWork, workMarkdown } from '../lib/markdown';

export const GET: APIRoute = async ({ site }) => {
  const origin = (site ?? new URL('https://rijudevx.github.io/')).origin;
  const work = sortWork(await getCollection('work'));
  const parts = [homeMarkdown(origin, work), ...work.map((w) => workMarkdown(origin, w))];
  return new Response(parts.join('\n---\n\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
