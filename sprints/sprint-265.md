# Sprint 265 log — Explore audit

**Date:** 2026-09-12
**Sprint:** 265 (day 3 of cycle 88 — Explore audit)
**Status:** 2 findings fixed. 585/585 tests passing (+3 new).

## Baseline checks

- `format:check`: clean
- `type-check`: clean
- `lint` (--max-warnings=0): clean
- `test`: 585/585 ✓

## Explore audit findings

Audit scope: `yamlGenerator.ts`, `scan-suspicious-patterns.mjs`, `scan-suspicious-patterns.test.mjs`, `.github/workflows/*`.

### Finding 1 — SHA drift (MEDIUM)

**File:** `src/lib/yamlGenerator.ts:2`

`CLAUDE_CODE_ACTION_REF` was pinned to `9d7150bc8a3dae8149739a88019d192b579ad90c` (set 2026-08-16, PR #49). The sprint workflow files (`.github/workflows/githatch-senior-engineer-daily-sprint.yml:24`, `githatch-sprint-planning.yml:21`) were updated to `833fb0f8c9f6686b33d963a8bae0a94f4936ab2a` on 2026-08-31 (PR #47, "claude-code-action@v1 moved again since re-resolution") but `yamlGenerator.ts` was not kept in sync.

Both are full 40-char SHAs (no supply-chain risk from mutable tags), but every user-created task was running a different action version than the built-in sprint workflows.

**Fix:** Updated `CLAUDE_CODE_ACTION_REF` to `833fb0f8c9f6686b33d963a8bae0a94f4936ab2a`.

### Finding 2 — Scanner coverage gap (LOW)

**File:** `scripts/scan-suspicious-patterns.mjs:7-15`

The scanner covered `eval()`, `new Function()`, `createRequire()`, and long unbroken strings — the patterns from incident #46. Missing from the PATTERNS array:

- `dangerouslySetInnerHTML` — React-specific XSS vector
- `exec(` — bare `child_process.exec()` call pattern

Neither pattern existed in any current source file, but both are listed in the security review checklist and the scanner is positioned as the safety net for future commits.

**Fix:** Added both patterns to PATTERNS. Verified `\bexec\s*\(` does not false-positive on `execFileSync()` or `execSync()`. Added 3 regression tests.

## Commit

`6e556e9` — "fix: sprint 265 Explore audit — SHA drift + scanner gap"

**Next sprint:** 266 (day 1 — baseline, cycle 89).
