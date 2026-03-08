import { type Framework, frameworks } from '../frameworks/frameworks.ts'
import { runQuery } from '../query-client/client.ts'
import * as z from 'zod'

const lcpSchema = z.object({
  framework: z.enum(frameworks),
  total_sites: z.number(),
  min_lcp: z.number(),
  p50_lcp: z.number(),
  p75_lcp: z.number(),
  p90_lcp: z.number(),
  p95_lcp: z.number(),
  p99_lcp: z.number(),
  max_lcp: z.number(),
})

type CoreWebVital = 'LCP'

type PercentileStatistics = {
  numericUnit: string
  p50: number
  p75: number
  p90: number
  p95: number
  p99: number
}

type FrameworkMetric = {
  framework: Framework
  coreWebVital: CoreWebVital
  numSitesMeasured: number
  stats: PercentileStatistics
}

export async function getFrameworksLCP(
  frameworks: Array<Framework>,
): Promise<Array<FrameworkMetric>> {
  console.info(`Running LCP Query for frameworks: [${frameworks.join(',')}]`)

  // We use APPROX_QUANTILES for better performance on large datasets
  // https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/approximate_aggregate_functions#approx_quantiles
  const query = `
          WITH framework_metrics AS (
            SELECT
              tech.technology AS framework,
              SAFE.FLOAT64(JSON_EXTRACT(lighthouse, '$.audits.largest-contentful-paint.numericValue')) AS lcp_ms
            FROM
              \`httparchive.latest.pages\`,
              UNNEST(technologies) AS tech
            WHERE
              client = 'desktop' AND
              LOWER(tech.technology) IN ('react', 'next.js')
          )
          SELECT
            UPPER(framework) AS framework,
            COUNT(lcp_ms) AS total_sites,
            MIN(lcp_ms) AS min_lcp,
            APPROX_QUANTILES(lcp_ms, 100)[OFFSET(50)] AS p50_lcp,
            APPROX_QUANTILES(lcp_ms, 100)[OFFSET(75)] AS p75_lcp,
            APPROX_QUANTILES(lcp_ms, 100)[OFFSET(90)] AS p90_lcp,
            APPROX_QUANTILES(lcp_ms, 100)[OFFSET(95)] AS p95_lcp,
            APPROX_QUANTILES(lcp_ms, 100)[OFFSET(99)] AS p99_lcp,
            MAX(lcp_ms) AS max_lcp
          FROM
            framework_metrics
          WHERE
            lcp_ms IS NOT NULL
          GROUP BY framework_metrics.framework
          `

  const rows = await runQuery(query)

  const metrics = rows.map((row) => lcpSchema.parse(row))

  return metrics.map((metric) => ({
    framework: metric.framework,
    coreWebVital: 'LCP',
    numSitesMeasured: metric.total_sites,
    stats: {
      numericUnit: 'ms',
      p50: metric.p50_lcp,
      p75: metric.p75_lcp,
      p90: metric.p90_lcp,
      p95: metric.p95_lcp,
      p99: metric.p99_lcp,
    },
  }))
}
