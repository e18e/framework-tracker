import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { buildClient, buildServer } from '@nifrajs/web/build'

const root = import.meta.dir
const routesDir = join(root, 'routes')
const outDir = join(root, '.nifra-node')
const workDir = join(root, '.nifra-node-work')
const serverManifest = join(root, 'server-manifest.ts')

rmSync(outDir, { recursive: true, force: true })
rmSync(workDir, { recursive: true, force: true })
rmSync(serverManifest, { force: true })
mkdirSync(join(outDir, 'assets'), { recursive: true })

try {
  const client = await buildClient({
    routesDir,
    outDir: join(outDir, 'assets'),
    clientModule: '@nifrajs/web-react/client',
    conditions: ['bun', 'browser'],
    define: { 'process.env.NODE_ENV': '"production"' },
    publicDir: false,
  })

  const { worker } = await buildServer({
    routesDir,
    serverEntry: join(root, 'server-entry.ts'),
    outDir: workDir,
    target: 'node',
    client,
    root,
  })

  cpSync(worker, join(outDir, 'server.js'))
} finally {
  rmSync(workDir, { recursive: true, force: true })
  rmSync(serverManifest, { force: true })
}

console.log(`Nifra benchmark output: ${outDir}`)
