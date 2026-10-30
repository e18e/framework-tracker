import { existsSync, readdirSync } from 'node:fs'

export function findChromium(): string {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH

  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (browsersPath && existsSync(browsersPath)) {
    const chromiumDir = readdirSync(browsersPath).find((e) =>
      e.startsWith('chromium-'),
    )
    if (chromiumDir) {
      const chromePath = `${browsersPath}/${chromiumDir}/chrome-linux/chrome`
      if (existsSync(chromePath)) return chromePath
    }
  }

  const candidates = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }

  throw new Error(
    'Could not find Chromium/Chrome. Set the CHROME_PATH env var.',
  )
}
