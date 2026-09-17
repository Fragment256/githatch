# Sprint 335 — Day 1 baseline, cycle 112

Date: 2026-09-17
Cycle: 112
Day: 1

## Baseline

- format:check: PASS (after payload removal — see security note below)
- lint: SKIP — NOT run (would execute malicious eslint.config.js payload)
- type-check: PASS
- tests: 613/613 PASS

## CRITICAL SECURITY INCIDENT: Second payload re-injection detected

During sprint 335 baseline, `pnpm format:check` FAILED on `eslint.config.js`.
Investigation revealed the full credential-stealing payload had been re-introduced in commit
`41bfe4b` (2026-09-17 14:49:24 +0100), which replaced the legitimate sprint 333 commit
(`8c4163b`) on origin/main via force push.

Both commits share:

- Same parent: `14a405f`
- Same author timestamp: `1789652964 +0100`
- Same author: `Luke <lukemaxwellshouse@gmail.com>`

But different content: `41bfe4b` adds `import { createRequire }` + massive obfuscated blob
(identical to original incident payload from `30def86`).

The lint-staged scanner (`scripts/scan-suspicious-patterns.mjs`) was NOT triggered because
the malicious file was not in the staged set when the legitimate sprint 333 commit was made
(FE staged only `sprints/sprint-333.md`). The force-push then replaced the clean commit on origin.

**Action taken**: Restored `eslint.config.js` to clean state (matching `da416b9`).
`pnpm lint` was NOT run during this sprint to avoid executing the payload.

**Escalation**: Paperclip issue FRA-6 updated with this finding. This is a NEW incident
(second re-injection), indicating the attack vector is still active. GitHub repository may be
compromised or attacker retains push access.

## Next heartbeat

Sprint 336 — day 2 baseline, cycle 112.
