import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const MAX_DIFF_LINES = 500
const COMMENT_MARKER = '<!-- stats-preview-comment -->'

async function main() {
  const frameworkNames = process.argv.slice(2)

  if (frameworkNames.length === 0) {
    console.error(
      'Usage: generate:preview-comment <framework-name> [framework-name...]',
    )
    process.exit(1)
  }

  const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf-8',
  }).trim()

  const fullDiff = execFileSync('git', ['diff', '--', 'packages/'], {
    cwd: repoRoot,
    encoding: 'utf-8',
  })

  const diffLines = fullDiff.trimEnd().split('\n').filter(Boolean)
  const truncated = diffLines.length > MAX_DIFF_LINES
  const diffSlice = diffLines.slice(0, MAX_DIFF_LINES).join('\n')

  const frameworkDisplay = frameworkNames.map((n) => `\`${n}\``).join(', ')

  const lines: string[] = [
    COMMENT_MARKER,
    '',
    `## Stats Preview: ${frameworkDisplay}`,
    '',
    `Stats were measured on this PR branch for ${frameworkDisplay}. Below is the diff against the base branch.`,
    '',
    '<details>',
    '<summary>View stats diff</summary>',
    '',
  ]

  if (!diffSlice) {
    lines.push('No stats changes detected.')
  } else {
    lines.push('```diff')
    lines.push(diffSlice)
    lines.push('```')
    if (truncated) {
      lines.push('')
      lines.push(
        `_(Diff truncated at ${MAX_DIFF_LINES} lines — ${diffLines.length} total lines)_`,
      )
    }
  }

  lines.push('')
  lines.push('</details>')

  const outputPath = join(repoRoot, 'comment.md')
  writeFileSync(outputPath, lines.join('\n'))
  console.info(`✓ Comment written to ${outputPath}`)
}

main().catch((error) => {
  console.error('Failed to generate preview comment:', error)
  process.exit(1)
})
