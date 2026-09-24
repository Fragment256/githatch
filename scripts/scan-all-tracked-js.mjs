#!/usr/bin/env node
// Scans ALL tracked .js files in the repo (not just staged ones) for suspicious patterns.
// Runs as the first step of the pre-commit hook to catch payloads introduced via force-push
// that may not be in the staged set of the current commit.
import { readFileSync } from 'fs'
import { execSync } from 'child_process'
import { resolve } from 'path'

import { scanContent } from './scan-suspicious-patterns.mjs'

// Exempt this scanner itself and trusted tool directories (Claude Code skill bundles)
const SELF_EXEMPT_SET = new Set([
  'scripts/scan-suspicious-patterns.mjs',
  'scripts/scan-suspicious-patterns.test.mjs',
  'scripts/scan-all-tracked-js.mjs',
  'scripts/scan-all-tracked-js.test.mjs',
])
const SELF_EXEMPT_PREFIXES = [
  '.claude/', // Claude Code agent/skill scripts are trusted tooling, not project source
]

function main() {
  let trackedFiles
  try {
    trackedFiles = execSync('git ls-files --cached --exclude-standard "*.js" "*.mjs" "*.cjs"', {
      encoding: 'utf-8',
    })
      .trim()
      .split('\n')
      .filter(Boolean)
      .filter((f) => !SELF_EXEMPT_SET.has(f) && !SELF_EXEMPT_PREFIXES.some((p) => f.startsWith(p)))
  } catch {
    // Not in a git repo or git not available — skip silently
    process.exit(0)
  }

  if (trackedFiles.length === 0) {
    console.log('scan-all-tracked-js: clean (no tracked JS files to scan)')
    process.exit(0)
  }

  let hasViolations = false
  for (const file of trackedFiles) {
    const absPath = resolve(file)
    let content
    try {
      content = readFileSync(absPath, 'utf-8')
    } catch {
      continue
    }
    const violations = scanContent(content)
    if (violations.length > 0) {
      hasViolations = true
      console.error(`\n✖ ${file}`)
      for (const v of violations) {
        console.error(`  - ${v}`)
      }
    }
  }

  if (hasViolations) {
    console.error(
      '\nSuspicious pattern(s) in tracked JS file(s). Fix or add to SELF_EXEMPT if legitimate.\n',
    )
    process.exit(1)
  }

  console.log(`scan-all-tracked-js: clean (${trackedFiles.length} JS file(s) scanned)`)
}

main()
