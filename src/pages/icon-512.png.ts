import type { APIRoute } from 'astro';
import { renderPng, squareIcon } from '../lib/og';

export const GET: APIRoute = async () => {
  const png = await renderPng(squareIcon(512, 256), 512, 512);
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
