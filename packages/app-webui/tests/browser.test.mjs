import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import { after, before, test } from 'node:test'
import puppeteer from 'puppeteer-core'
import { startBenchmarkServer } from '../../stats-generator/src/benchmark-server.ts'
import { verifySSRLoadTable } from '../../stats-generator/src/ssrLoad/verify-table.ts'

let browser
let stopServer
let origin
const errors = []

before(async () => {
  const reservation = createServer()
  await new Promise((resolve) => reservation.listen(0, '127.0.0.1', resolve))
  const { port } = reservation.address()
  await new Promise((resolve) => reservation.close(resolve))
  origin = `http://127.0.0.1:${port}`
  stopServer = await startBenchmarkServer(
    { package: 'app-webui', serveBinary: 'app-webui' },
    { host: '127.0.0.1', port, readinessPath: '/server-side-rendered' },
  )
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
})

after(async () => {
  try {
    await browser?.close()
  } finally {
    stopServer?.()
  }
})

test('native HTTP output satisfies the shared load verifier', async () => {
  const response = await fetch(`${origin}/server-side-rendered`)
  assert.equal(response.status, 200)
  verifySSRLoadTable(await response.text())
})

for (const route of ['client-side-rendered', 'server-side-rendered']) {
  test(`${route} renders 1,000 UUID rows and navigates to the matching detail`, async () => {
    const page = await browser.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    try {
      await page.goto(`${origin}/${route}`)
      await page.waitForFunction(
        () => document.querySelectorAll('table tbody tr').length === 1000,
      )
      const { id, name, href } = await page.$eval(
        'table tbody tr:first-child',
        (row) => ({
          id: row.cells[0].textContent,
          name: row.cells[1].textContent,
          href: row.querySelector('a').getAttribute('href'),
        }),
      )
      const uuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/
      assert.match(id, uuid)
      assert.match(name, uuid)
      assert.equal(href, `/${route}/${id}`)
      await Promise.all([
        page.waitForNavigation(),
        page.click('table tbody tr:first-child a'),
      ])
      await page.waitForFunction(
        (expected) =>
          document.getElementById('detail-id')?.textContent === expected,
        {},
        id,
      )
      assert.equal(new URL(page.url()).pathname, `/${route}/${id}`)
      assert.deepEqual(errors, [])
    } finally {
      await page.close()
    }
  })
}

test('initial load uses shared CSS without browser JavaScript', async () => {
  const page = await browser.newPage()
  const scripts = []
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(request.url())
  })
  try {
    await page.goto(`${origin}/initial-load`, { waitUntil: 'networkidle0' })
    assert.equal(
      await page.$eval('h1', (el) => el.textContent),
      'Small steps. Faster experiences.',
    )
    assert.equal(
      await page.$$eval('.performance-card', (cards) => cards.length),
      3,
    )
    assert.equal(
      await page.$eval(
        '.performance-page',
        (el) => getComputedStyle(el).backgroundColor,
      ),
      'rgb(245, 247, 244)',
    )
    assert.deepEqual(scripts, [])
    const css = await fetch(`${origin}/assets/initial-load.css`, {
      headers: { 'Accept-Encoding': 'br' },
    })
    assert.equal(css.status, 200)
    assert.equal(css.headers.get('content-encoding'), 'br')
  } finally {
    await page.close()
  }
})
