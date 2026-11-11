import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { workMarkdown } from '../../lib/markdown';

export const getStaticPaths: GetStaticPaths = async () => {
  const all = await getCollection('work');
  return all.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
};

export const GET: APIRoute = ({ props, site }) => {
  const entry = (props as { entry: CollectionEntry<'work'> }).entry;
  const origin = (site ?? new URL('https://rijudevx.github.io/')).origin;
  return new Response(workMarkdown(origin, entry), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
