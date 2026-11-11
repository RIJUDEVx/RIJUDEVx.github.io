import type { APIRoute } from 'astro';
import { renderPng, squareIcon } from '../lib/og';

export const GET: APIRoute = async () => {
  const png = await renderPng(squareIcon(192, 96), 192, 192);
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
