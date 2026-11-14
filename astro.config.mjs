// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://rijudevx.github.io',
  integrations: [svelte(), sitemap({ filter: (page) => !/\/v1\/?$/.test(page) && !page.includes('/writing/') })],
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  // Name the browsers so the CSS minifier keeps both backdrop-filter and the -webkit- form
  // older iOS Safari needs. Without targets it kept only one, and Chrome lost the blur.
  vite: { build: { cssTarget: ['chrome107', 'safari15', 'firefox104'] } },
});