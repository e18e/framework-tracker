import { type Framework, frameworks } from '../frameworks/frameworks.ts'
import {
  type HTTPArchiveCWV,
  type HTTPArchiveCWVSnapshot,
  cwvResponseSchema,
} from '../httparchive/httparchive.ts'

// httparchive allows us to pull FID but does not include any metrics at this current time so we can ignore it.
type FrameworkCWV = {
  id: string,
  framework: Framework
  date: string
} & {
  [cwv in Lowercase<Exclude<HTTPArchiveCWV, 'FID'>>]: {
    mobile: number
    desktop: number
  }
}

export async function getLatestFrameworksCWV(): Promise<Array<FrameworkCWV>> {
  console.info(`Running LCP Query for frameworks: [${frameworks.join(',')}]`)

  const cwv = await getHttpArchiveCWV()
  console.info('Successfully retrieved cwv from httparchive')

  const latestFrameworkCWV = getLatestCWVForFrameworks(cwv)
  if (!validateAllCWVIsSameDate(latestFrameworkCWV)) {
    throw Error('CWV should all have the same date')
  }

  return buildFrameworkCWV(latestFrameworkCWV)
}

async function getHttpArchiveCWV() {
  const baseUrl = 'https://cdn.httparchive.org/v1/cwv'
  const queryString = frameworks.map(buildFrameworkQueryParam).join('&')
  const url = `${baseUrl}?${queryString}&geo=ALL&rank=ALL`

  const response = await fetch(url)
  if (!response.ok) {
    throw Error(`Failed to get httparchive cwv ${response.status}`)
  }

  const data = cwvResponseSchema.parse(await response.json())

  return data
}

function buildFrameworkQueryParam(framework: Framework) {
  return `technology=${framework.replace(" ", "+")}`
}

function getLatestCWVForFrameworks(frameworksCWV: HTTPArchiveCWVSnapshot[]) {
  const latestStats = new Map<Framework, HTTPArchiveCWVSnapshot>()

  frameworksCWV.forEach((cwv) => {
    const framework = cwv.technology
    const curStat = latestStats.get(framework)
    if (!curStat || new Date(cwv.date) > new Date(curStat.date)) {
      latestStats.set(framework, cwv)
    }
  })

  return [...latestStats.values()]
}

function validateAllCWVIsSameDate(
  latestFrameworkCWV: HTTPArchiveCWVSnapshot[],
) {
  return new Set(latestFrameworkCWV.map((cwv) => cwv.date)).values.length <= 1
}

function buildFrameworkCWV(latestFrameworkCWV: HTTPArchiveCWVSnapshot[]) {
  const frameworkVitals = latestFrameworkCWV.map((stat) => ({
    id: stat.technology.toLowerCase().replace(".", "-"),
    framework: stat.technology,
    date: stat.date,
    overall: getCWV('overall', stat),
    lcp: getCWV('LCP', stat),
    cls: getCWV('CLS', stat),
    fcp: getCWV('FCP', stat),
    ttfb: getCWV('TTFB', stat),
    inp: getCWV('INP', stat),
  }))

  return frameworkVitals
}

function getCWV(cwv: HTTPArchiveCWV, stat: HTTPArchiveCWVSnapshot) {
  const vital = stat.vitals.find((v) => v.name === cwv)
  if (!vital) {
    throw Error(
      `${stat.technology} for date ${stat.date} stat should have a ${vital} cwv`,
    )
  }

  const vitalMobile = vital.mobile ?? {
    tested: 0,
    good_number: 0
  }

  const vitalDesktop = vital.desktop ?? {
    tested: 0,
    good_number: 0
  }


  const hasMobileVital = vitalMobile.tested > 0
  const hasDesktopVital = vitalDesktop.tested > 0

  return {
    mobile: hasMobileVital ? vitalMobile.good_number / vitalMobile.tested : 0,
    desktop: hasDesktopVital
      ? vitalDesktop.good_number / vitalDesktop.tested
      : 0,
  }
}
