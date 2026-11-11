import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { renderPng, workCard } from '../../../lib/og';

export async function getStaticPaths() {
  const entries = await getCollection('work');
  return entries.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}

export const GET: APIRoute = async ({ props }) => {
  const { entry } = props as { entry: CollectionEntry<'work'> };
  const png = await renderPng(workCard(entry.data), 1200, 630);
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
