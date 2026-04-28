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
    archived: z.boolean().default(false),
    provId: z.string().optional(),
    cycle: z.string().optional(),
    signalCount: z.number().int().optional(),
    totalPostings: z.number().int().optional(),
  }),
});

const companies = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/data/companies' }),
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    website: z.string().url(),
    ats: z.enum(['greenhouse', 'lever', 'workday', 'ashby', 'smartrecruiters', 'custom']),
    atsIdentifier: z.string().optional(),
    workday: z.object({
      host: z.string(),
      tenant: z.string(),
      site: z.string(),
    }).optional(),
    customNote: z.string().optional(),
    description: z.string(),
    sector: z.string().optional(),
    headquarters: z.string().optional(),
    aiRelevance: z.enum(['ai_native', 'ai_infra', 'ai_adjacent', 'non_ai']).default('ai_adjacent'),
  }),
});

export const collections = { articles, companies };
