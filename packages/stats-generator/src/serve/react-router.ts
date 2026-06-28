import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { getPort, parseAppDir } from './common.ts'

const appDir = parseAppDir()
const PORT = getPort()
const buildPath = join(appDir, 'build', 'server', 'index.js')

const appRequire = createRequire(join(appDir, 'package.json'))
const servePackagePath = appRequire.resolve('@react-router/serve/package.json')
const serveBinPath = join(dirname(servePackagePath), 'bin.js')

const child = spawn(process.execPath, [serveBinPath, buildPath], {
  cwd: appDir,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(PORT),
  },
  stdio: 'inherit',
})

const shutdown = () => {
  child.kill('SIGTERM')
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
