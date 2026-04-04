/**
 * Serve a SvelteKit app built with adapter-node.
 *
 * The adapter-node build produces a self-contained server at build/index.js
 * that reads PORT from the environment automatically.
 *
 * Usage: node sveltekit.ts <app-dir>
 */
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseAppDir } from './common.ts'

const appDir = parseAppDir()

await import(pathToFileURL(join(appDir, 'build', 'index.js')).href)
