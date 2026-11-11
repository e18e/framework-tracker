import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const appDir = fileURLToPath(new URL('../', import.meta.url))
const binary = process.platform === 'win32' ? 'app-webui.exe' : 'app-webui'
const child = spawn(
  fileURLToPath(new URL(`../dist/${binary}`, import.meta.url)),
  {
    cwd: appDir,
    stdio: 'inherit',
  },
)
child.once('error', (error) => {
  console.error(error)
  process.exitCode = 1
})
child.once('exit', (code, signal) => {
  process.exitCode = signal ? 1 : (code ?? 1)
})
process.once('SIGINT', () => child.kill('SIGINT'))
process.once('SIGTERM', () => child.kill('SIGTERM'))
