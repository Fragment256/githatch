#!/usr/bin/env node
// Blocks commits containing known code-execution/obfuscation primitives
// (eval, new Function, createRequire, giant unbroken string blobs) — the
// exact pattern used by the malicious eslint.config.js payload in #46.
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const PATTERNS = [
  { name: 'eval(...) call', regex: /\beval\s*\(/ },
  { name: 'new Function(...) constructor', regex: /\bnew\s+Function\s*\(/ },
  { name: 'createRequire(...) call', regex: /\bcreateRequire\s*\(/ },
  {
    name: 'long unbroken string literal (possible obfuscated payload)',
    regex: /["'`][^"'`\s]{300,}["'`]/,
  },
  { name: 'dangerouslySetInnerHTML (XSS risk)', regex: /dangerouslySetInnerHTML/ },
  { name: 'exec(...) shell invocation', regex: /(?<![.\w])exec\s*\(/ },
  // Catches method-call form missed by the bare-exec pattern above (e.g. require('child_process').exec(...))
  { name: 'child_process.exec() shell invocation', regex: /\bchild_process\b.*\.exec\s*\(/ },
]

export function scanContent(content) {
  return PATTERNS.filter(({ regex }) => regex.test(content)).map(({ name }) => name)
}

// This scanner's own source and tests intentionally contain the pattern
// text (as regex literals / test fixtures), so they're exempt from self-scan.
// Use resolved absolute paths to prevent bypass via crafted paths that merely
// end with an exempt filename (e.g. /evil/scripts/scan-suspicious-patterns.mjs).
const __dirname = dirname(fileURLToPath(import.meta.url))
const SELF_EXEMPT_SET = new Set(
  [
    'scripts/scan-suspicious-patterns.mjs',
    'scripts/scan-suspicious-patterns.test.mjs',
    'scripts/scan-all-tracked-js.mjs',
    'scripts/scan-all-tracked-js.test.mjs',
  ].map((p) => resolve(__dirname, '..', p)),
)

function main() {
  const files = process.argv.slice(2).filter((file) => !SELF_EXEMPT_SET.has(resolve(file)))
  let hasViolations = false

  for (const file of files) {
    let content
    try {
      content = readFileSync(file, 'utf-8')
    } catch {
      continue
    }
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
