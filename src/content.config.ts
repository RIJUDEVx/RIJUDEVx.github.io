import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    summary: z.string(),
    status: z.enum(['pilot', 'released', 'withdrawn', 'appexchange']),
    role: z.string(),
    years: z.string(),
    live: z.string().url().optional(),
    stack: z.array(z.string()),
    stats: z.array(z.object({ value: z.string(), label: z.string() })).default([]),
  }),
});

export const collections = { work };
