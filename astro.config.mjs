// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://rijudevx.github.io',
  integrations: [svelte(), sitemap({ filter: (page) => !page.includes('/v/') })],
  prefetch: { prefetchAll: true },
});