# Sprint Log

Agent-maintained. One entry per daily sprint run.

---

## 2026-05-14

- Action: pr-review
- Summary: Reviewed all 5 open PRs (#9–#13, project scaffold through Contents API persistence); approved 4, requested changes on #12 (console.debug leftover); all PRs noted as conflicting with main and recommended for closure since code is already committed to main.
- PR: #9, #10, #11, #12, #13
- ROADMAP updated: no

## 2026-05-14 (sprint 2)

- Action: pr-closed | roadmap
- Summary: Closed 5 stale conflicting PRs (#9–#13, all superseded by main); then implemented top ROADMAP item — 12 Playwright E2E smoke tests covering landing, repo picker, task list, create task, and trigger task.
- PR: #17
- ROADMAP updated: yes

## 2026-05-14 (sprint 3)

- Action: pr-review | pr-addressed | pr-merged
- Summary: Reviewed and approved PR #17 (Playwright E2E smoke tests); fixed CI formatting failure on ROADMAP.md and sprint workflow YAML; waited for green CI then squash-merged and deleted branch.
- PR: #17
- ROADMAP updated: yes

## 2026-05-15

- Action: ci-fix
- Summary: Fixed CI failure on main — `pnpm format:check` was failing because `ActivityPanel.tsx` had a trailing whitespace issue; ran Prettier and pushed fix directly to main.
- Rationale: CI was broken on main; fixing it is the top priority before any feature or backlog work can be considered green.
- PR: n/a
- ROADMAP updated: no

## 2026-05-16

- Action: roadmap
- Summary: Extracted `describeCron` to a testable `src/lib/cronLabel.ts` module, fixed `ScheduledRow` which was showing raw cron strings instead of human-readable labels, and added a schedule preview in `TaskForm` (shows cron expression for presets, human-readable label for custom cron).
- Rationale: ScheduledRow was showing raw cron strings (`0 9 * * 1`) while TaskRow showed human-readable labels — a UX inconsistency that confused users; this was the highest-value unimplemented UX fix with no open issues or roadmap backlog items to pick from. Chose over dark mode (cosmetic) and other nice-to-haves because it fixes an actual displayed bug.
- PR: #18
- ROADMAP updated: yes

## 2026-05-17

- Action: pr-merged
- Summary: Reviewed PR #18 (cronLabel extraction + ScheduledRow bug fix); CI was green, code correct and well-tested; merged via squash.
- Rationale: Only open PR had green CI and no blocking issues — merging it immediately ships the UX fix (human-readable cron labels in task list) to users rather than leaving it in review limbo.
- PR: #18
- ROADMAP updated: yes

## 2026-05-18

- Action: nothing-actionable
- Summary: CI green, 180 tests passing; no open PRs, no open issues, roadmap backlog empty, no agent-authored specs in docs/specs/.
- Rationale: Every structured pipeline step exhausted — invention of work outside the backlog is explicitly ruled out by PRIORITIES; nothing-actionable is the correct outcome.
- PR: n/a
- ROADMAP updated: no

## 2026-05-19

- Action: roadmap
- Summary: Identified and implemented "next-run display" — adds `nextCronRun()` + `formatRelativeTime()` to cronLabel.ts, wires "Next: in X hours/days" into TaskRow for enabled scheduled tasks; 180 → 192 tests. PR #19 raised.
- Rationale: Backlog was empty (second consecutive nothing-actionable); proactively identified the highest user-facing UX gap — users creating a scheduled task have no visible answer to "when will this run next?" Chose over dark mode (cosmetic-only) and test coverage work (already at 192 tests, no critical gaps).
- PR: #19
- ROADMAP updated: yes

## 2026-05-19 (planning)

- Roadmap changes: Backlog was empty (root cause of two recent nothing-actionable sprints) — refilled with 5 prioritised items. Added 3 specced items (onboarding checklist, YAML preview, template library), plus dark mode (low, needs spec) and a README file-map refresh (hygiene). In Progress PR #19 annotated "CI green, awaiting merge" (not merged this run — planning only). No Done moves: nothing merged since #18 (already recorded 2026-05-16); #19 still open.
- Specs written: `docs/specs/2026-05-19-onboarding-checklist.md`, `docs/specs/2026-05-19-yaml-preview-before-commit.md`, `docs/specs/2026-05-19-starter-template-library.md`
- Rationale: All three target the project's own stated definition of "good." Onboarding directly serves "non-technical user creates a working agent in under 2 minutes" — currently no guided first-run path and the mandatory token step is easy to miss, causing first runs to fail. YAML preview serves "thin and auditable" — today the most consequential action (committing a workflow that runs in the user's CI with their secrets) happens with zero visibility. Template library serves blank-page friction: the existing template system ships only two self-referential meta-agents, none for the documented use cases the product is pitched on. Chose these over dark mode (cosmetic, low leverage on the 2-min goal) and the GitHub App registration (deliberately Paused — still a personal tool). Three independent specs touching different files (new component+App.tsx / TaskForm / templates.ts) so daily sprints can ship them without conflicts.

## 2026-05-21

- Action: pr-merged
- Summary: Reviewed and merged PR #19 (next-run display in task list) — `nextCronRun()` + `formatRelativeTime()` in cronLabel.ts, "Next: in X hours/days" shown in TaskRow for enabled scheduled tasks; 3 new component tests, 6+ lib tests, CI green.
- Rationale: PR #19 was the only open PR (In Progress on ROADMAP), CI was green, code was correct and well-tested — merging ships the user-facing UX improvement (answer to "when will this run next?") with no blocking issues.
- PR: #19
- ROADMAP updated: yes

## 2026-05-20

- Action: ci-fix
- Summary: Deploy to GitHub Pages was failing on main (commit 9a0ec31) due to `pnpm format:check` — Prettier flagged README.md and two spec markdown files; ran `pnpm format` and pushed fix directly to main (763b4c4).
- Rationale: CI broken on main is the top priority before PR review or feature work; the root cause was a trivial markdown formatting difference (trailing whitespace / wrap differences) introduced by the 2026-05-19 planning sprint. PR #19 (next-run display) remains open awaiting review — will be handled next sprint.
- PR: n/a
- ROADMAP updated: no

## 2026-05-22

- Action: ci-fix
- Summary: Fixed "Deploy to GitHub Pages" failure on main (commit 4d52c6b) — `pnpm store path` (called by `setup-node@v4 cache: pnpm`) errored with "packages field missing or empty" because the previous sprint added `pnpm-workspace.yaml` with only `allowBuilds: esbuild: true` and no `packages:` field; added `packages: ['.']` for this single-package repo.
- Rationale: CI broken on main is mandatory first priority; root cause was a one-line omission in pnpm-workspace.yaml introduced by the pnpm 11 build-script approval step. All 192 tests still pass locally.
- PR: n/a
- ROADMAP updated: no

## 2026-05-23

- Action: roadmap
- Summary: Implemented first-run onboarding checklist (spec: `docs/specs/2026-05-19-onboarding-checklist.md`) — `GettingStarted` component with 3-step checklist (repo selected / token configured / first task), secret detection via new `listRepoSecrets` API helper, per-repo dismiss in sessionStorage; 208 tests passing (13 new), lint/format/type-check clean. PR #20 raised.
- Rationale: Top ROADMAP backlog item and directly serves the project's stated definition of "good" — a non-technical user can now create a working agent in under 2 minutes without missing the mandatory CLAUDE_CODE_OAUTH_TOKEN step. Chose over YAML preview (also high priority but more complex) because the onboarding gap causes silent first-run failures, a worse UX outcome than a missing preview step.
- PR: #20
- ROADMAP updated: yes

## 2026-05-24

- Action: pr-merged
- Summary: Resolved merge conflict in PR #20 (unrelated histories due to main squash-reset) by rebasing the feature onto main, re-running 208 tests (all green), then merging with squash.
- Rationale: PR #20 contained the highest-priority roadmap item (first-run onboarding checklist) and was feature-complete with passing CI — the only blocker was the history conflict, which was a mechanics fix not a code change.
- PR: #20
- ROADMAP updated: yes

## 2026-05-25

- Action: roadmap
- Summary: Implemented YAML preview & confirm before commit (spec: `docs/specs/2026-05-19-yaml-preview-before-commit.md`) — `TaskForm` now shows the exact YAML bytes to be committed with a line-level LCS diff for edits; nothing is committed until "Commit to repo" is clicked; 215 tests passing (8 new), all checks clean. PR #21 raised.
- Rationale: Top ROADMAP backlog item; directly addresses the project's "thin and auditable" core ethos — previously the most consequential action (committing a workflow that runs in the user's CI with their secrets) happened with zero visibility.
- PR: #21
- ROADMAP updated: yes

## 2026-05-26

- Action: pr-merged
- Summary: Reviewed and merged PR #21 (YAML preview & confirm before commit) — two-phase submit flow with LCS diff rendering; 8 new tests; CI green.
- Rationale: PR was the highest-priority backlog item, feature-complete with passing CI; merging it was the highest-value action over starting a new roadmap item.
- PR: #21
- ROADMAP updated: yes
