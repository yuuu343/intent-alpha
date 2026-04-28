import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    company: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    hypothesis: z.string(),
    confidence: z.enum(['low', 'medium', 'high']),
    horizon: z.string().default('12-18 months'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const companies = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/data/companies' }),
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    website: z.string().url(),
    ats: z.enum(['greenhouse', 'lever', 'workday']),
    atsIdentifier: z.string(),
    description: z.string(),
    sector: z.string().optional(),
    headquarters: z.string().optional(),
  }),
});

export const collections = { articles, companies };
