import type { APIRoute } from 'astro';
import { renderPng, roundedIcon } from '../lib/og';

export const GET: APIRoute = async () => {
  const png = await renderPng(roundedIcon(32, 16), 32, 32);
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
