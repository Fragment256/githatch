#!/usr/bin/env node
// Scans ALL tracked .js files in the repo (not just staged ones) for suspicious patterns.
// Runs as the first step of the pre-commit hook to catch payloads introduced via force-push
// that may not be in the staged set of the current commit.
import { readFileSync } from 'fs'
import { execSync } from 'child_process'
import { resolve } from 'path'

import { scanContent } from './scan-suspicious-patterns.mjs'

// Exempt only this scanner's own source/tests, which intentionally contain the
// pattern text as regex literals and fixtures. .claude/ is NOT exempt: the
// 2026-08-06 incident (#46) that introduced the obfuscated eslint.config.js
// payload is the same commit that first added the entire .claude/ bundle, so
// treating that directory as blanket-trusted would hide a plausible recurrence
// vector from the one check that has caught this payload twice (see #67).
const SELF_EXEMPT_SET = new Set([
  'scripts/scan-suspicious-patterns.mjs',
  'scripts/scan-suspicious-patterns.test.mjs',
  'scripts/scan-all-tracked-js.mjs',
  'scripts/scan-all-tracked-js.test.mjs',
])

function main() {
  let repoRoot, trackedFiles
  try {
    // Always resolve from the repo root so paths are consistent regardless of cwd
    repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim()
    trackedFiles = execSync('git ls-files --cached --exclude-standard "*.js" "*.mjs" "*.cjs"', {
      encoding: 'utf-8',
      cwd: repoRoot,
    })
      .trim()
      .split('\n')
      .filter(Boolean)
      .filter((f) => !SELF_EXEMPT_SET.has(f))
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
    const absPath = resolve(repoRoot, file)
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
