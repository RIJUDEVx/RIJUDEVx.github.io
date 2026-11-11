import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const writing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    date: z.string(),
    draft: z.boolean().default(true),
  }),
});

const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    area: z.string().default('Platform'),
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

export const collections = { work, writing };
