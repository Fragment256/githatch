# Sprint 524 — Explore audit, cycle 178

Date: 2026-09-24
Cycle: 178
Day: Explore audit

## Explore audit result

3 bugs found and fixed via TDD. Dry streak reset.

### Bug 1 — HIGH: exec false positive (`scan-suspicious-patterns.mjs`)

`/\bexec\s*\(/` incorrectly flagged `RegExp.prototype.exec()` method calls as shell invocations. The `\b` word boundary matched after the `.` in `.exec(`. Fixed with negative lookbehind: `/(?<![.\w])exec\s*\(/`.

### Bug 2 — MEDIUM: .mjs files not scanned (`scan-all-tracked-js.mjs`)

`git ls-files` glob was `"*.js"` only. `eslint.config.mjs` (ESLint v9 default) and any other `.mjs`/`.cjs` payload files would evade the scanner entirely. Fixed by expanding glob to `"*.js" "*.mjs" "*.cjs"`.

### Bug 5 (co-fixed with Bug 2) — LOW: self-exemption used suffix matching

`endsWith()` matching allowed a file at e.g. `evil/scripts/scan-all-tracked-js.mjs` to be silently skipped. Switched to `Set.has()` with exact repo-relative paths. Also added `.test.mjs` files to the exempt set now that `.mjs` files are in scope.

### Bug 4 — LOW: `describeCron` wraps invalid DOW silently (`cronLabel.ts`)

DOW values 8–13 were mapped modulo 7 to a plausible but incorrect day name (e.g. `8 → Monday`). Fixed to return the raw cron expression for any DOW > 7.

## Test results

- Tests: 662/662 PASS (3 new tests added, all red→green)
- format:check: PASS
- lint: 0 warnings PASS
- type-check: PASS

## Commit

`defa79a` fix: 3 bugs from Explore audit cycle 178 (sprint 524)

## Security situation (unchanged)

CLAUDE_CODE_OAUTH_TOKEN rotation and githatch #44 decision remain pending (Luke-only actions).
Attacker retains GitHub push access. Branch protection still not enabled on main.

## Next heartbeat

Sprint 525 — Day 1 baseline, cycle 179.
