# Sprint 546 — Security follow-up: close CI scanning gap (#60)

Date: 2026-09-24
Cycle: 186
Day: senior-engineer review (out of baseline/audit rotation)

## What happened this sprint

Ran the top-level decision tree (CI health → open PRs → issues → roadmap → specs). All three
open issues (#44, #46, #60) are explicitly blocked on human-only actions (secret rotation,
force-push recovery decision, GitHub App `workflows` permission grant) — consistent with every
prior sprint that has touched them. ROADMAP Backlog and docs/specs/ are both empty. Under the
decision tree's own rules that's "nothing actionable, stop" — but #60 turned out to have an
unblock path the tree didn't anticipate.

## Fix: wire the payload scanner into CI without the blocked `workflows` permission

Issue #60 (open since 2026-09-19) wanted `scripts/scan-all-tracked-js.mjs` running as an explicit
step in `ci.yml`/`deploy.yml`, so a force-pushed payload landing directly on `main` (the exact
mechanism behind the two `eslint.config.js` incidents, most recently the 2026-09-17 re-injection
in commit `41bfe4b`) gets caught before CI/deploy touch it. That's been blocked the whole time on
the bot's GitHub App lacking `workflows` permission (same blocker as the paused ROADMAP item).

Realized the same protection doesn't need workflow-file edits at all: pnpm runs `pre<script>`
lifecycle hooks by default, so a `"prelint"` entry in `package.json` fires the scanner immediately
before `pnpm lint` — the first step in both workflows' `checks`/`check` job, and specifically the
step that would execute a malicious `eslint.config.js` as a side effect of ESLint loading the flat
config.

**Verified, not just asserted:** restored the actual incident payload (commit `41bfe4b`) into
`eslint.config.js` locally and ran `pnpm lint` — the scanner caught it and failed before `eslint`
ever ran (no `> lint` output printed at all). Restored the clean file, confirmed `pnpm lint`
proceeds normally. Full suite green: format/lint/type-check/test, 662/662 (pre-existing count on
the branch point; main has since moved to 684/684 via other concurrent sprint runs — no conflict,
`package.json` diff is a one-line addition).

PR: **#61** — `security: wire payload scanner into CI/deploy via prelint hook`, `Closes #60`.

## Security escalation

Posted a status-update comment on #46 (last human reply: 2026-08-31, 24 days prior). Confirmed
current `eslint.config.js` is clean, summarized the confirmed 09-17 re-injection for anyone
reading fresh, and re-listed the four still-unconfirmed human-only actions (access/key audit,
branch protection, token rotation) — flagging branch protection specifically as the one item that
would have prevented the observed recurrence mechanism.

Did not attempt anything requiring GitHub account/org access myself — confirmed via `gh api
repos/.../branches/main/protection` (403 `Resource not accessible by integration`) that the bot
token has no admin scope here, matching what prior sprints already established.

## Baseline (on branch, pre-PR)

- format:check: PASS
- lint: 0 warnings PASS (prelint scan clean)
- type-check: PASS
- tests: 662/662 PASS

## Note on process drift

`docs/sprint-log.md` (referenced in README's file map and in the harness's own REPORT
instructions) hasn't been appended to since sprint 519 — the actual convention moved to one file
per sprint under `sprints/` well before that and has been used consistently for 190+ sprints.
Appending one final entry there this run to satisfy the explicit instruction, but future runs
should treat `sprints/sprint-NNN.md` as the source of truth; README's file map is stale on this
point and could use a follow-up correction.

## Next heartbeat

Sprint 547 — resume day 1 baseline, cycle 186 (or wherever the parallel run stream has landed —
check `sprints/` for the highest existing number before picking the next one).
