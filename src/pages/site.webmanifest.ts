import type { APIRoute } from 'astro';
import { profile } from '../data/site';

export const GET: APIRoute = () => {
  const manifest = {
    name: profile.name,
    short_name: profile.short,
    description: profile.tagline,
    start_url: '/',
    display: 'standalone',
    background_color: '#faf9f5',
    theme_color: '#141413',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  };
  return new Response(JSON.stringify(manifest, null, 2), { headers: { 'Content-Type': 'application/manifest+json' } });
};
