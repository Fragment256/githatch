# Sprint 335 — Day 1 baseline, cycle 112

Date: 2026-09-17
Cycle: 112
Day: 1

## Baseline

- format:check: PASS (after payload removal — see security incident below)
- lint: SKIP — NOT run (would have executed malicious eslint.config.js payload)
- type-check: PASS
- tests: 618/618 PASS (+5 from new scanner regression tests — commits below)

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

## Actions taken this sprint

1. **Payload removal** (commit `6634725`): Restored `eslint.config.js` to clean state matching
   `da416b9`. Committed with `--no-verify` (justified: avoids executing the active payload).
   `pnpm lint` NOT run for same reason.

2. **New Paperclip issue** (`46fe26c6`): Created critical issue documenting the second incident.
   Control-plane comment to FRA-6 blocked by cross-issue write restriction (timer run, FRA-6
   unassigned) — new issue used as durable record instead.

3. **Scanner gap fix** (commits `6c9b810`, `1c6d26c`): Added `scripts/scan-all-tracked-js.mjs`
   as first step in `.husky/pre-commit`. It scans all tracked `.js` files using `git ls-files`
   on every local commit, not just staged files. A force-pushed payload in `eslint.config.js`
   will now block the NEXT local commit even if the file wasn't staged. 5 TDD tests (RED→GREEN).

## Key implication

**The attacker retains active GitHub push access.** Token rotation and access audit are
confirmed necessary — not precautionary.

## Required human actions (see Paperclip issue 46fe26c6)

1. Check github.com/Fragment256/githatch/settings/access — collaborators, deploy keys, OAuth apps
2. Audit github.com/settings/keys and github.com/settings/tokens — revoke unfamiliar
3. Enable branch protection on main to prevent force-pushes
4. Check GitHub account for unauthorized active sessions
5. ROTATE CLAUDE_CODE_OAUTH_TOKEN

## Next heartbeat

Sprint 336 — day 2 baseline, cycle 112.
