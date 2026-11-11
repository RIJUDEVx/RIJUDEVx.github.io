// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';

// https://astro.build/config
export default defineConfig({
  site: 'https://rijudevx.github.io',
  integrations: [svelte()],
  prefetch: { prefetchAll: true },
});