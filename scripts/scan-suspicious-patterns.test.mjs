import { describe, it, expect, afterEach } from 'vitest'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdtempSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { scanContent } from './scan-suspicious-patterns.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const scriptPath = join(__dirname, 'scan-suspicious-patterns.mjs')

let tmpDir
afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
  tmpDir = undefined
})

describe('scanContent', () => {
  it('flags eval calls', () => {
    expect(scanContent('eval("1+1")')).toContain('eval(...) call')
  })

  it('flags new Function constructor', () => {
    expect(scanContent('const f = new Function("return 1")')).toContain(
      'new Function(...) constructor',
    )
  })

  it('flags createRequire usage', () => {
    expect(
      scanContent("import { createRequire } from 'module'\ncreateRequire(import.meta.url)"),
    ).toContain('createRequire(...) call')
  })

  it('flags long unbroken string literals typical of obfuscated blobs', () => {
    const blob = 'x'.repeat(400)
    expect(scanContent(`const payload = "${blob}"`)).toContain(
      'long unbroken string literal (possible obfuscated payload)',
    )
  })

  it('does not flag normal application code', () => {
    const clean = `
      import js from '@eslint/js'
      export default function add(a, b) {
        return a + b
      }
    `
    expect(scanContent(clean)).toEqual([])
  })

  it('does not flag short, normal string literals', () => {
    expect(
      scanContent('const greeting = "hello world, this is a perfectly normal string"'),
    ).toEqual([])
  })

  it('returns multiple violations when several patterns match', () => {
    const violations = scanContent('eval(new Function("x")())')
    expect(violations).toContain('eval(...) call')
    expect(violations).toContain('new Function(...) constructor')
  })

  it('CLI exempts its own source file from self-scan (regression: it matches its own patterns)', () => {
    expect(() => execFileSync('node', [scriptPath, scriptPath], { stdio: 'pipe' })).not.toThrow()
  })

  it('CLI exits non-zero when scanning a file with a real violation', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'scan-test-'))
    const maliciousFile = join(tmpDir, 'malicious-sample.js')
    writeFileSync(
      maliciousFile,
      'const r = createRequire(import.meta.url)\neval(r("child_process"))\n',
    )

    expect(() => execFileSync('node', [scriptPath, maliciousFile], { stdio: 'pipe' })).toThrow()
  })
})
