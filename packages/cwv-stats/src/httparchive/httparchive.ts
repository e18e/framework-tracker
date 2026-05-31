import * as z from 'zod'
import { frameworks } from '../frameworks/frameworks.ts'

const httpArchiveDeviceSchema = z.object({
  good_number: z.number(),
  tested: z.number(),
})

const httpArchiveCWVSchema = z.enum([
  'overall',
  'LCP',
  'CLS',
  'FID',
  'FCP',
  'TTFB',
  'INP',
])

export type HTTPArchiveCWV = z.infer<typeof httpArchiveCWVSchema>

const httpArchiveVitalSchema = z.object({
  name: httpArchiveCWVSchema,
  desktop: httpArchiveDeviceSchema,
  mobile: httpArchiveDeviceSchema,
})

const httpArchiveCWVSnapshot = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  technology: z.enum(frameworks),
  vitals: z.array(httpArchiveVitalSchema),
})

export type HTTPArchiveCWVSnapshot = z.infer<typeof httpArchiveCWVSnapshot>

export const cwvResponseSchema = z.array(httpArchiveCWVSnapshot)
