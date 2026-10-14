import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const categories = ['algorithm', 'system-design'] as const;

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    category: z.enum(categories),
    tags: z.array(z.string().min(1)).default([]),
    date: z.coerce.date(),
    featured: z.boolean().default(false),
  }),
});

export const collections = { notes };