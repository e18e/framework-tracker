import {
  devtimeContentSchema,
  runtimeContentSchema,
  runtimeVersionsContentSchema,
} from './lib/result-content'
import { defineCollection } from 'astro:content'
import { file, glob } from 'astro/loaders'
import { docsLoader } from '@astrojs/starlight/loaders'
import { docsSchema } from '@astrojs/starlight/schema'
import { z } from 'astro/zod'
import { readdirSync } from 'node:fs'

const devtimeCollection = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/devtime' }),
  schema: devtimeContentSchema,
})

const devtimeVersionsCollection = defineCollection({
  loader: glob({
    pattern: '**/*.json',
    base: './src/content/devtime/versions',
  }),
  schema: devtimeContentSchema,
})

const runtimeCollection = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/runtime' }),
  schema: runtimeContentSchema,
})

const runtimeVersionsCollection = defineCollection({
  loader: glob({
    pattern: '**/*.json',
    base: './src/content/runtime/versions',
  }),
  schema: runtimeVersionsContentSchema,
})

const cwvCollection = defineCollection({
  loader: file('src/content/cwv/cwv-stats.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    package: z.string(),
    date: z.string(),
    overall: z.object({
      mobile: z.number(),
      desktop: z.number(),
    }),
    lcp: z.object({
      mobile: z.number(),
      desktop: z.number(),
    }),
    cls: z.object({
      mobile: z.number(),
      desktop: z.number(),
    }),
    fcp: z.object({
      mobile: z.number(),
      desktop: z.number(),
    }),
    ttfb: z.object({
      mobile: z.number(),
      desktop: z.number(),
    }),
    inp: z.object({
      mobile: z.number(),
      desktop: z.number(),
    }),
  }),
})

// Derived from the devtime filenames rather than hardcoded, so adding a
// framework does not silently break every code comparison example.
const frameworkSlugs = new Set(
  readdirSync(new URL('./content/devtime', import.meta.url))
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace(/^starter-/, '').replace(/\.json$/, '')),
)

const codeComparisonCollection = defineCollection({
  loader: glob({
    pattern: '**/*',
    base: './src/content/code-comparison',
    generateId: ({ entry }) => {
      const slug = /^[^/]+\/([^/]+)\.md$/.exec(entry)?.[1]
      if (slug == null || !frameworkSlugs.has(slug)) {
        throw new Error(
          `Invalid code comparison file "${entry}". Expected <example>/<framework>.md where <framework> is one of: ${[...frameworkSlugs].join(', ')}.`,
        )
      }
      return entry.replace(/\.md$/, '')
    },
  }),
  schema: z.object({ docs: z.url().optional() }).strict(),
})

const docsCollection: ReturnType<typeof defineCollection> = defineCollection({
  loader: docsLoader(),
  schema: docsSchema(),
})

export const collections = {
  docs: docsCollection,
  devtime: devtimeCollection,
  devtimeVersions: devtimeVersionsCollection,
  runtime: runtimeCollection,
  runtimeVersions: runtimeVersionsCollection,
  cwv: cwvCollection,
  codeComparison: codeComparisonCollection,
}
