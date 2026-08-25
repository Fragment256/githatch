#!/usr/bin/env node
// Blocks commits containing known code-execution/obfuscation primitives
// (eval, new Function, createRequire, giant unbroken string blobs) — the
// exact pattern used by the malicious eslint.config.js payload in #46.
import { readFileSync } from 'fs'

const PATTERNS = [
  { name: 'eval(...) call', regex: /\beval\s*\(/ },
  { name: 'new Function(...) constructor', regex: /\bnew\s+Function\s*\(/ },
  { name: 'createRequire(...) call', regex: /\bcreateRequire\s*\(/ },
  {
    name: 'long unbroken string literal (possible obfuscated payload)',
    regex: /["'`][^"'`\s]{300,}["'`]/,
  },
]

export function scanContent(content) {
  return PATTERNS.filter(({ regex }) => regex.test(content)).map(({ name }) => name)
}

// This scanner's own source and tests intentionally contain the pattern
// text (as regex literals / test fixtures), so they're exempt from self-scan.
const SELF_EXEMPT = [
  'scripts/scan-suspicious-patterns.mjs',
  'scripts/scan-suspicious-patterns.test.mjs',
]

function main() {
  const files = process.argv
    .slice(2)
    .filter((file) => !SELF_EXEMPT.some((exempt) => file.endsWith(exempt)))
  let hasViolations = false

  for (const file of files) {
    const content = readFileSync(file, 'utf-8')
    const violations = scanContent(content)
    if (violations.length > 0) {
      hasViolations = true
      console.error(`\n✖ ${file}`)
      for (const violation of violations) {
        console.error(`  - ${violation}`)
      }
    }
  }

  if (hasViolations) {
    console.error(
      '\nSuspicious code pattern(s) detected. If this is a false positive, review carefully before bypassing.\n',
    )
    process.exit(1)
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main()
}
