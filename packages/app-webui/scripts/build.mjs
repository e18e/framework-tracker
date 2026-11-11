import { spawnSync } from 'node:child_process'
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { build } from 'esbuild'

const appDir = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const cli = join(
  dirname(require.resolve('@microsoft/webui/ai.md')),
  'bin',
  'webui',
)
const dist = join(appDir, 'dist')

function run(command, args) {
  const result = spawnSync(command, args, { cwd: appDir, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} failed with ${result.signal ?? result.status}`)
  }
}

await rm(dist, { recursive: true, force: true })
await mkdir(join(dist, 'public'), { recursive: true })

for (const [name, source, entry] of [
  ['index', '.', 'page.html'],
  ['ssr', 'server-side-rendered', 'page.html'],
  ['throughput', 'ssr-throughput', 'page.html'],
  ['detail', 'server-side-rendered', 'detail.html'],
  ['initial', 'initial-load', 'page.html'],
  ['client', 'client-side-rendered', 'page.html'],
]) {
  run(cli, [
    'build',
    join('src', 'app', source),
    '--entry',
    entry,
    '--out',
    `dist/${name}`,
    '--dom',
    'light',
    ...(name === 'client' ? ['--plugin', 'webui'] : []),
  ])
}

await build({
  absWorkingDir: appDir,
  entryPoints: ['src/app/client-side-rendered/client.ts'],
  outfile: 'dist/public/client.js',
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  legalComments: 'eof',
  tsconfig: 'tsconfig.json',
})
await copyFile(
  join(appDir, '..', 'testdata', 'src', 'initial-load.css'),
  join(dist, 'public', 'initial-load.css'),
)
for (const name of ['client.js', 'initial-load.css']) {
  const asset = await readFile(join(dist, 'public', name))
  await writeFile(join(dist, 'public', `${name}.br`), brotliCompressSync(asset))
  await writeFile(join(dist, 'public', `${name}.gz`), gzipSync(asset))
}

if (!process.argv.includes('--templates-only')) {
  // Static musl output also runs in the benchmark's Debian Node container.
  const target =
    process.platform === 'linux' && process.arch === 'x64'
      ? 'x86_64-unknown-linux-musl'
      : undefined
  run('cargo', [
    'build',
    '--release',
    '--locked',
    ...(target ? ['--target', target] : []),
  ])
  const binary = process.platform === 'win32' ? 'app-webui.exe' : 'app-webui'
  await copyFile(
    join(appDir, 'target', ...(target ? [target] : []), 'release', binary),
    join(dist, binary),
  )
}
