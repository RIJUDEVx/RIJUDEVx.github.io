import type { APIRoute } from 'astro';
import { homeCard, renderPng } from '../../lib/og';

export const GET: APIRoute = async () => {
  const png = await renderPng(homeCard(), 1200, 630);
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
