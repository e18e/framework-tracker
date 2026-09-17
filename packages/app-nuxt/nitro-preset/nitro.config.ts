import { fileURLToPath } from 'node:url'

export default {
  extends: 'node-server',
  entry: fileURLToPath(new URL('./entry.ts', import.meta.url)),
}
