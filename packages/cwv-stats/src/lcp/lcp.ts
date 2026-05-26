import { type Framework, frameworks } from '../frameworks/frameworks.ts'
import * as z from 'zod'

const deviceStatsSchema = z.object({
  good_number: z.number(),
  tested: z.number(),
})

const vitalSchema = z.object({
  name: z.enum(['overall', 'LCP', 'CLS', 'FID', 'FCP', 'TTFB', 'INP']),
  desktop: deviceStatsSchema,
  mobile: deviceStatsSchema,
})

const cwvStatSchema = 
  z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), 
    technology: z.enum(frameworks),
    vitals: z.array(vitalSchema),
  })


type CWVStat = z.infer<typeof cwvStatSchema>

const cwvResponseSchema = z.array(cwvStatSchema)


type FrameworkStat = {
  framework: Framework
  date: string
} & {
  [cwv in Framework]: {
    mobile: number
    desktop: number
  }
}

export async function getFrameworksLCP(
  frameworkList: Array<Framework>,
): Promise<Array<FrameworkStat>> {
  console.info(`Running LCP Query for frameworks: [${frameworks.join(',')}]`)

  const url = new URL("https://cdn.httparchive.org/v1/cwv")
  frameworks.forEach(framework => url.searchParams.append("technology", framework))
  url.searchParams.append("geo", "ALL")
  url.searchParams.append("rank", "ALL")

  const response = await fetch(url)
  const data = cwvResponseSchema.parse(await response.json())

  const stats = new Map<Framework, CWVStat>()
  data.forEach(cwv => {
    const framework = cwv.technology
    const curStat = stats.get(framework)
    if (!curStat || new Date(cwv.date) > new Date(curStat.date)) {
      stats.set(framework, cwv)
    }
  })

  // TODO finish other vitals
  return [...stats.values()].map(stat => {
    const overall = stat.vitals.find(v => v.name === "overall")
    if (!overall) {
      throw Error(`${stat.technology} for date ${stat.date} stat should have overall cwv`)
    }
    return {
      framework: stat.technology,
      date: stat.date,
      overall: {
        mobile: overall.mobile.good_number / overall.mobile.tested,
        desktop: overall.desktop.good_number / overall.desktop.tested
      },
      lcp: {},
      cls: {},
      fid: {},
      fcp: {},
      ttfb: {},
      inp: {},
    }
  })
}
