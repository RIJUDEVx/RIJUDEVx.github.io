import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { homeMarkdown } from '../lib/markdown';

export const GET: APIRoute = async ({ site }) => {
  const origin = (site ?? new URL('https://rijudevx.github.io/')).origin;
  const work = await getCollection('work');
  return new Response(homeMarkdown(origin, work), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
