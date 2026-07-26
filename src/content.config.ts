import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const spaces = z.enum(['article', 'nonsense', 'jazz', 'anime', 'coffee'])

const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    publishedAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    space: spaces,
    series: z.string().optional(),
    tags: z.array(z.string()).default([]),
    lang: z.enum(['zh-CN', 'en', 'mixed']).default('mixed'),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    cover: z.string().optional(),
    legacyPath: z.string().optional(),
    related: z.array(z.string()).default([]),
  }),
})

export const collections = { posts }
