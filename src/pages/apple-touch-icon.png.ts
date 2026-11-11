import type { APIRoute } from 'astro';
import { renderPng, squareIcon } from '../lib/og';

export const GET: APIRoute = async () => {
  const png = await renderPng(squareIcon(180, 90), 180, 180);
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
