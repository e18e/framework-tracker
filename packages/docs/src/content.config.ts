import { defineCollection } from 'astro:content'
import { file, glob } from 'astro/loaders'
import { docsLoader } from '@astrojs/starlight/loaders'
import { docsSchema } from '@astrojs/starlight/schema'
import { z } from 'astro/zod'
import { frameworks } from '@framework-tracker/results/frameworks'

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

const frameworkSlugs = new Set(
  frameworks.flatMap((framework) =>
    framework.starter
      ? [framework.starter.package.replace(/^starter-/, '')]
      : [],
  ),
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
  cwv: cwvCollection,
  codeComparison: codeComparisonCollection,
}
