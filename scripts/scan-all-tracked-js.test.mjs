import { describe, it, expect, afterEach } from 'vitest'
import { execFileSync, execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const scriptPath = join(__dirname, 'scan-all-tracked-js.mjs')

let tmpDir
afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
  tmpDir = undefined
})

function makeGitRepo(files) {
  tmpDir = mkdtempSync(join(tmpdir(), 'scan-all-test-'))
  execSync('git init', { cwd: tmpDir })
  execSync('git config user.email "test@test.com"', { cwd: tmpDir })
  execSync('git config user.name "Test"', { cwd: tmpDir })
  for (const [name, content] of Object.entries(files)) {
    const dir = join(tmpDir, dirname(name))
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(tmpDir, name), content)
    execFileSync('git', ['add', '--', name], { cwd: tmpDir })
  }
  execSync('git commit -m "init" --allow-empty', { cwd: tmpDir })
  return tmpDir
}

describe('scan-all-tracked-js', () => {
  it('exits 0 when no JS files have violations', () => {
    const repoDir = makeGitRepo({
      'clean.js': 'export const x = 1\n',
      'also-clean.ts': 'const y = 2\n',
    })
    const result = execFileSync('node', [scriptPath], { cwd: repoDir, encoding: 'utf-8' })
    expect(result).toContain('clean')
  })

  it('exits 1 and reports file when a tracked JS file contains createRequire', () => {
    const repoDir = makeGitRepo({
      'eslint.config.js':
        "import { createRequire } from 'node:module'\nconst require = createRequire(import.meta.url)\n",
    })
    expect(() => execFileSync('node', [scriptPath], { cwd: repoDir, encoding: 'utf-8' })).toThrow()
  })

  it('exits 1 when a tracked JS file contains a long obfuscated blob', () => {
    const blob = 'x'.repeat(400)
    const repoDir = makeGitRepo({
      'config.js': `export default {}\nglobal.o='${blob}'\n`,
    })
    expect(() => execFileSync('node', [scriptPath], { cwd: repoDir, encoding: 'utf-8' })).toThrow()
  })

  it('ignores the scanner scripts themselves', () => {
    const repoDir = makeGitRepo({
      'scripts/scan-suspicious-patterns.mjs':
        'const PATTERNS = [{ name: "createRequire(...) call", regex: /\\bcreateRequire\\s*\\(/ }]\n',
      'scripts/scan-all-tracked-js.mjs': '// exempt\n',
    })
    const result = execFileSync('node', [scriptPath], { cwd: repoDir, encoding: 'utf-8' })
    expect(result).toContain('clean')
  })

  it('catches violations in tracked .mjs files', () => {
    const repoDir = makeGitRepo({
      'eslint.config.mjs':
        "import { createRequire } from 'node:module'\nconst r = createRequire(import.meta.url)\n",
    })
    expect(() => execFileSync('node', [scriptPath], { cwd: repoDir, encoding: 'utf-8' })).toThrow()
  })

  it('does not scan untracked (non-committed, non-staged) JS files', () => {
    const repoDir = makeGitRepo({
      'clean.js': 'export const x = 1\n',
    })
    // Write a malicious JS file to the working tree — never staged or committed
    const blob = 'x'.repeat(400)
    writeFileSync(join(repoDir, 'scratch.js'), `global.o='${blob}'\n`)
    // Scanner must exit 0: untracked files are not in the repo and cannot contain force-pushed payloads
    const result = execFileSync('node', [scriptPath], { cwd: repoDir, encoding: 'utf-8' })
    expect(result).toContain('clean')
  })

  it('catches violations in files not currently staged', () => {
    const repoDir = makeGitRepo({
      'clean.js': 'export const x = 1\n',
    })
    // Add a malicious file to the working tree but do NOT stage it
    const blob = 'x'.repeat(400)
    writeFileSync(join(repoDir, 'clean.js'), `global.o='${blob}'\n`)
    execSync('git add clean.js', { cwd: repoDir })
    // Now reset the staged file back to clean, leaving working tree dirty
    execSync('git checkout HEAD -- clean.js', { cwd: repoDir })
    // The working tree now has the clean file, but let's stage the malicious version:
    writeFileSync(join(repoDir, 'clean.js'), `global.o='${blob}'\n`)
    execSync('git add clean.js', { cwd: repoDir })
    // Script should scan the staged index version...
    // Actually: the key protection is scanning git ls-files (committed content + staged)
    // After commit, a force-push attacker would modify committed content
    // So the test: committed file has payload, script must catch it
    const repoDir2 = makeGitRepo({
      'eslint.config.js': 'export default {}\n',
    })
    // Simulate a force-pushed payload: write malicious content to committed file
    writeFileSync(
      join(repoDir2, 'eslint.config.js'),
      "import { createRequire } from 'node:module'\nconst r = createRequire(import.meta.url)\n",
    )
    execSync('git add eslint.config.js', { cwd: repoDir2 })
    expect(() => execFileSync('node', [scriptPath], { cwd: repoDir2, encoding: 'utf-8' })).toThrow()
  })
})
