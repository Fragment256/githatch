# Sprint Log

Agent-maintained. One entry per daily sprint run.

---

## 2026-07-30

- Action: nothing-actionable
- Summary: CI green on main (only in-flight run was this sprint invocation itself). No open PRs, no open issues, ROADMAP Backlog empty, both Paused items still correctly blocked on human action. All 7 `docs/specs/` entries carry `status: done`. This is the third consecutive dry day (after 07-28, 07-29), matching this project's own precedent (07-01, 07-15, 07-25) for going beyond static queue checks — so dispatched a real investigation rather than logging a fourth bare entry. Spot-checked 3 specs (onboarding checklist, YAML preview/diff, searchable repo picker) directly against their components — all genuinely fully implemented, no stubs or partial pieces. Grepped `src/` for TODO/FIXME/HACK/XXX/`@ts-ignore`/`eslint-disable` — found only the 3 already-known, deliberately-deferred `react-hooks/exhaustive-deps` suppressions in `TaskList.tsx`/`ActivityPanel.tsx` (root-caused 07-25, still benign console noise only, no override condition met). Re-verified the ROADMAP Paused items are still genuinely blocked (Playwright `test:e2e` still not wired into `ci.yml`, `workflows` permission still ungranted) — not an oversight, still correctly tracked. Ran the full local baseline: `pnpm install --frozen-lockfile`, `format --check`/`lint`/`type-check` clean, `test` (384/384, 89.83% statement coverage — far above the 50% floor, no drift), `test:e2e` (13/13 Playwright, no drift), and `build` (clean, identical bundle shape). No new user-facing bug, spec gap, or automation oversight found.
- Rationale: Decision tree exhausted through all four steps with nothing actionable at any of them; per this project's own precedent, a 3-day dry streak warrants a direct codebase investigation, which was performed and surfaced nothing meeting the bar for standalone work (per the stated priority order: feature/UX, DX/automation, docs, coverage-if-critical, security-if-concrete) — so the disciplined call is to log a verified-clean state and stop, not manufacture scope.
- PR: n/a
- ROADMAP updated: no

## 2026-07-29

- Action: nothing-actionable
- Summary: CI green on main (only in-flight run was this sprint invocation itself). No open PRs, no open issues, ROADMAP Backlog empty, both Paused items still correctly blocked on human action (last re-verified 2026-07-26, unchanged since). All 7 `docs/specs/` entries carry `status: done` and map to completed ROADMAP Done rows. Yesterday (07-28) was already a dry day, making today day 2 of the streak — not yet the 3-consecutive-day trigger this project uses for deeper unscoped investigation — so followed the standard path. Ran the full local baseline for diligence: `pnpm install --frozen-lockfile`, `format --check`, `lint`, `type-check`, `test` (384/384 passing, identical count to 07-28 — no drift), and `build` (clean, same bundle shape/sizes).
- Rationale: Decision tree exhausted through all four steps (CI, PRs, issues, roadmap/specs) with nothing actionable at any of them; per this project's own precedent, deep unscoped investigation is reserved for a 3-day dry streak, and today is day two, so logging and stopping with a real verified baseline is the correct move over manufacturing scope.
- PR: n/a
- ROADMAP updated: no

## 2026-07-28

- Action: nothing-actionable
- Summary: CI green on main (only in-flight run was this sprint invocation itself). No open PRs, no open issues, ROADMAP Backlog empty, both Paused items still correctly blocked on human action (last re-verified 2026-07-26). All 7 `docs/specs/` entries carry `status: done` and map to completed ROADMAP Done rows. Yesterday (07-27) ended with an active PR merge, so this is only the first dry day, not the 3-consecutive-day streak this project treats as its own signal to go hunting for unscoped work — so followed the standard path. Ran the full local baseline: `pnpm install --frozen-lockfile`, `format --check`, `lint`, `type-check`, `test` (384/384 passing, unchanged from 07-27 — no drift), and `build` (clean, same bundle shape).
- Rationale: Decision tree exhausted through all four steps (CI, PRs, issues, roadmap/specs) with nothing actionable at any of them; per this project's own precedent, deep unscoped investigation is reserved for a 3-day dry streak, and today is day one, so logging and stopping with a real verified baseline is the correct move over manufacturing scope.
- PR: n/a
- ROADMAP updated: no

## 2026-07-27

- Action: pr-merged
- Summary: CI green on main. One open PR (#41, `fix: reject comma-separated cron hour/minute lists in custom schedule`, authored by claude[bot] on 2026-07-26) had no review yet — reviewed the diff against `cronLabel.ts`, confirmed the fix (requiring `hour`/`minute` to fully match `^\d+$` before `parseInt`) correctly closes the `parseInt('9,17', 10) === 9` footgun without touching the `*/N` fast paths, and that `isValidCron` inherits the fix transitively via `nextCronRun`. Checked out the branch and ran the full local baseline (`pnpm install --frozen-lockfile && pnpm format --check && pnpm lint && pnpm type-check && pnpm test --run`): all clean, 384/384 tests passing. Attempted `gh pr review --approve` but GitHub rejects self-approval since this bot account authored the PR; merged directly via `gh pr merge --squash --delete-branch` instead, since the fix was independently re-verified rather than rubber-stamped.
- Rationale: Per the decision tree, an open PR takes priority over issues/roadmap/specs; this PR was correct, well-tested (TDD with RED→GREEN tests for the exact bug), and had a clean CI baseline, so merging it unblocks the queue rather than leaving a verified-good fix idle.
- PR: #41
- ROADMAP updated: no

## 2026-07-26

- Action: roadmap
- Summary: CI green on main (only in-flight run was this sprint invocation itself). No open PRs, no open issues, ROADMAP Backlog empty, both Paused items still correctly blocked on human action — re-verified the `workflows` permission block directly by pushing a probe commit to a throwaway branch touching `ci.yml`; GitHub still rejects it ("refusing to allow a GitHub App to create or update workflow ... without `workflows` permission"), confirming that item is still genuinely blocked, then cleaned up the test branch (deleted locally, never reached the remote). This is day 4 of a dry queue (07-23 through 07-25 were also dry; 07-25 already did a deep investigation and found nothing new), so rather than re-run yesterday's exact checks, dispatched a fresh Explore pass over `src/components/`, `src/hooks/`, `src/lib/`, and `specs/githatch-v0.md`. It surfaced a real correctness bug: `cronLabel.ts`'s `nextCronRun`/`describeCron`/`isValidCron` used `parseInt(hour, 10)`/`parseInt(minute, 10)` without validating the field was a plain integer, so `parseInt('9,17', 10) === 9` let a custom cron like `0 9,17 * * *` (9 AM and 5 PM) pass validation and get described as "Daily at 9 AM UTC" — silently hiding the 5 PM run from the TaskForm's schedule preview, description, and next-run indicator (the GitHub Actions cron itself would still fire correctly at both times; only Githatch's own UI misrepresented it). Fixed via TDD: wrote 3 failing tests first (confirmed RED) across all three functions for `0 9,17 * * *` / `0,30 9 * * *`, then required the hour/minute fields to fully match `^\d+$` before parsing (confirmed GREEN). Full local baseline clean: `pnpm install --frozen-lockfile`, `format`, `lint`, `type-check`, `test` (384/384, up from 381), `build` — no drift. PR #41 raised.
- Rationale: Per this project's own precedent (07-01, 07-17), a multi-day dry streak with the decision tree exhausted warrants investigating the codebase directly for a real, scoped bug rather than re-logging or repeating a just-completed investigation verbatim; a correctness bug in the one custom-schedule field the presets don't cover meets the bar for standalone work, unlike the previously-deferred cosmetic `act()` warnings.
- PR: #41
- ROADMAP updated: no

## 2026-07-25

- Action: nothing-actionable
- Summary: CI green on main (only in-flight run was this sprint invocation itself). No open PRs, no open issues, ROADMAP Backlog empty, both Paused items still correctly blocked on human action. All 7 `docs/specs/` entries carry `status: done` and map to completed ROADMAP Done rows. This is the third consecutive dry day (after 07-23, 07-24), matching this project's own precedent (07-01, 07-15) for going beyond static queue checks — so did a real investigation rather than logging a third bare entry. Traced the recurring `act()` warnings (flagged 07-23/07-24) to their actual root cause: `ActivityPanel`, `TaskHistory`, and `TaskRow`'s initial-mount effect in `TaskList.tsx` all fire async fetches (`getWorkflowRuns`, `getRecentCommits`/`getRecentPRs`) with no unmount guard, so a fetch resolving after the owning view unmounts (e.g. switching tabs away from Activity before it loads) calls `setState` on an unmounted component — a real but low-impact issue (console-only no-op, not user-visible; the polling interval in `TaskRow` already clears correctly on unmount via its `return () => clearInterval(id)`). Also checked `handleDuplicateTask` in `App.tsx` for the same class of bug as the 07-15 slug-collision fix — confirmed the duplicate flow correctly re-enters the new-task form with `existingSlugs` validation, no gap there. Reviewed `TaskList`'s filter/failure-banner interaction (banner count survives filtering since `lastRuns` is keyed by slug and not cleared on filter) — correct. Found no new user-facing bug or feature gap. Ran the full local baseline: `pnpm install --frozen-lockfile` (corepack quirk, same as prior runs), `format`/`lint`/`type-check` clean, `test` (381/381, no drift), `test:e2e` (13/13 Playwright, no drift), and `build` (clean, same bundle shape). Leaving the `act()`-warning fix deferred per the same reasoning as 07-23/07-24: it's a benign console warning with no reproducible user-facing effect, and doesn't meet any of the stated override conditions for standalone hygiene work (not a coverage gap, not a security issue, hasn't caused a production bug) — will fix opportunistically the next time those three files are touched for a feature.
- Rationale: Decision tree exhausted through all four steps with nothing actionable at any of them; per this project's own precedent, a 3-day dry streak warrants investigating the codebase directly rather than re-logging, but the investigation surfaced only the already-known, already-deliberately-deferred warning (now with its root cause identified) rather than a new bug or gap meeting the bar for standalone work — so the disciplined call is to log and stop, not manufacture scope to look busy.
- PR: n/a
- ROADMAP updated: no

## 2026-07-24

- Action: nothing-actionable
- Summary: CI green on main (only in-flight run was this sprint invocation itself). No open PRs, no open issues, ROADMAP Backlog empty, both Paused items still correctly blocked on human action. All 7 `docs/specs/` entries carry `status: done` and map to completed ROADMAP Done rows (#20-23, #26, #37, #39). This is the second consecutive dry day (after 07-23), not yet the 3-day dry streak this project treats as its own signal to go hunting for unscoped work — so followed the standard path. Ran the full local baseline: `pnpm install --frozen-lockfile` (pnpm not preinstalled in this sandbox — same quirk as 07-13; activated via `corepack enable && corepack prepare pnpm@9 --activate`), `format` (all unchanged), `lint` (clean), `type-check` (clean), `test` (381/381 passing, identical count to 07-23 — no drift), and `build` (clean, same bundle shape). The `act()` warnings noted on 07-23 in `TaskList.test.tsx`/`App.test.tsx` are still present and still non-failing; leaving them per the same reasoning (opportunistic fix when those files are next touched for a feature, not standalone hygiene work).
- Rationale: Decision tree exhausted through all four steps with nothing actionable at any of them; per this project's own precedent (2026-07-15), the trigger for investigating the codebase directly on an empty queue is a 3-day dry streak, and today is only the second such day, so logging and stopping — with a real local verification pass, not just static queue checks — is the correct move rather than inventing scope.
- PR: n/a
- ROADMAP updated: no

## 2026-07-23

- Action: nothing-actionable
- Summary: CI green on main (only in-flight run was this sprint invocation itself). No open PRs, no open issues, ROADMAP Backlog empty, both Paused items still correctly blocked on human action. All 7 `docs/specs/` entries map to completed ROADMAP Done rows (#20-23, #26, #37, #39). This is only the first dry day after four consecutive active days (07-17 through 07-20), not the 3-day dry streak this project treats as its own signal to go hunting for unscoped work in the codebase — so followed the standard path instead. Ran the full local baseline for diligence: `pnpm install --frozen-lockfile`, `format`, `lint`, `type-check`, `test` (381/381 passing, unchanged from 07-20), and `build` — all clean, no drift. Noted but did not action: `pnpm test` now emits ~45 React `act()` warnings concentrated in `TaskList.test.tsx` and `App.test.tsx` (up from a single isolated `SecretsView.test.tsx` warning previously, which was already fixed on 07-16) — likely introduced by the task-filter work in PR #40. All tests still pass; this is noise, not a coverage gap or failure, so it doesn't meet the bar for standalone hygiene work, but worth fixing opportunistically the next time those files are touched for a feature.
- Rationale: Decision tree exhausted through all four steps with nothing actionable at any of them; per this project's own precedent (2026-07-15), the trigger for investigating the codebase directly on an empty queue is a 3-day dry streak, and today is only the first such day, so logging and stopping — with a real local verification pass, not just static queue checks — is the correct move rather than inventing scope.
- PR: n/a
- ROADMAP updated: no

## 2026-07-20

- Action: pr-merged
- Summary: CI green on main, no open issues. One open PR (#40, "task filter in TaskList") was already up from the previous sprint and had no review yet — reviewed it (filter logic correct, mirrors `RepoPicker` pattern, empty-state early return keeps the input hidden with zero tasks, 6 new tests covering visibility/filtering/case-insensitivity/no-match/clear), then verified locally: format, lint, type-check, and full suite (381/381) all clean. GitHub blocked a formal `--approve` review because the PR author and I share the `claude[bot]` identity (self-review not allowed), so I documented the review as a PR comment instead and merged directly. ROADMAP item moved from In Progress to Done (#40).
- Rationale: Per the decision tree, an existing open PR takes priority over starting new roadmap/issue work; it was already fully implemented and tested, so completing its review/merge cycle was the correct next step over picking up new work with the queue still open.
- PR: #40
- ROADMAP updated: yes

## 2026-07-19

- Action: roadmap
- Summary: CI green on main, no open PRs, no open issues. Implemented the sole ROADMAP Backlog item — a text filter above `TaskList` matching on `displayName`, mirroring the existing `RepoPicker` filter pattern (case-insensitive substring match, empty-state message when no tasks match, filtered count in the header). TDD: 6 new tests written first (confirmed RED), then implemented (confirmed GREEN). 381/381 tests passing, lint/type-check/format clean. PR #40 raised; ROADMAP item moved to In Progress pending merge.
- Rationale: Followed the decision tree in order — CI healthy, no PRs/issues to address, so the top (and only) ROADMAP Backlog item was next; this is a real user-facing DX gap (finding a task in a repo with a dozen+ scheduled agents) and was next in line regardless, consistent with the priority order favoring feature/DX work over hygiene tasks.
- PR: #40
- ROADMAP updated: yes

## 2026-07-15

- Action: issues
- Summary: CI green, no open PRs/issues, ROADMAP backlog empty, all specs shipped — but this was the third consecutive "nothing-actionable" day (07-12/13/14), so per project precedent (2026-07-01) investigated the codebase directly instead of logging a fourth dry entry. Found and fixed a real correctness/data-safety bug: `TaskForm`'s new-task submission had no check against existing tasks' slugs, so a name that slugifies to a collision (or an exact duplicate name) would silently overwrite the existing task's workflow file with zero warning, since the diff preview only renders in edit mode. Added an `existingSlugs` prop and a pre-submit collision check (2 new tests). Also fixed the long-standing `act()` warning in `SecretsView.test.tsx`, unaddressed across 8+ prior dry-run entries. 363/363 tests passing, build clean. PR #38 raised.
- Rationale: Per the priority order, a genuine user-facing correctness bug outranks DX/docs/test-coverage work; three consecutive dry sprints is this project's own documented signal to stop trusting static queue checks and verify the app/code directly rather than logging a fourth no-op.
- PR: #38
- ROADMAP updated: no

## 2026-07-14

- Action: nothing-actionable
- Summary: CI green on main (Deploy and daily-sprint workflows both last succeeded; `ci.yml` only triggers on PR/non-main push, so it correctly shows no runs against main). No open PRs, no open issues, ROADMAP Backlog empty, both Paused items still correctly blocked on human action (GitHub App registration, workflows permission grant). All 6 `docs/specs/` entries carry `status: done` and each maps to a shipped ROADMAP Done row. Ran the full local baseline for diligence, consistent with the last several dry-run entries: `pnpm install --frozen-lockfile`, `format`, `lint`, `type-check`, `test` (361/361 passing, no change from 2026-07-13), and `build` — all clean, no drift. The pre-existing non-failing `act()` warning in `SecretsView.test.tsx` is unchanged.
- Rationale: Decision tree exhausted through all four steps (CI, PRs, issues, roadmap/specs) with nothing actionable at any of them; per established precedent the correct move on a genuinely empty queue is to log and stop rather than invent unscoped work, while still running the real local suite (not just static queue checks) so any drift would be caught.
- PR: n/a
- ROADMAP updated: no

## 2026-07-13

- Action: nothing-actionable
- Summary: CI green on main (only run in progress was this sprint invocation itself). No open PRs, no open issues, ROADMAP Backlog empty, both Paused items still correctly blocked on human action. Checked all six `docs/specs/` entries against ROADMAP's Done table — every one (`onboarding-checklist`, `starter-template-library`, `yaml-preview-before-commit`, `dark-mode`, `schedule-local-preview`, `failure-summary-banner`) maps to a completed item (#20-23, #26, #37). Following this project's established precedent for dry runs (2026-07-06, 2026-07-08, 2026-07-09), ran the full local baseline rather than stopping at static checks: `pnpm install --frozen-lockfile`, `format`, `lint`, `type-check`, `test` (361 passing), and `build` — all clean, no drift. Note: `pnpm`/corepack were not preinstalled in this sandbox (`corepack prepare` failed to resolve a cached pnpm build); worked around by `npm install -g pnpm@9` directly — a sandbox-environment quirk, not a repo issue.
- Rationale: Decision tree exhausted through all four steps with nothing actionable at any of them; the local baseline run is verification/diligence consistent with prior sprint entries, not manufactured feature scope. The pre-existing `act()` warning in `SecretsView.test.tsx` is unchanged and still non-failing — left alone per the priority rule against standalone hygiene work absent a critical trigger.
- PR: n/a
- ROADMAP updated: no

## 2026-07-09

- Action: nothing-actionable
- Summary: CI green on main, no open PRs, no open issues, ROADMAP Backlog empty, both Paused items still correctly blocked on human action. Checked all five `docs/specs/` entries against source: every one is fully implemented (`GettingStarted.tsx`, the three new templates in `templates.ts`, `TaskForm.tsx`'s preview/"Commit to repo" step, `useTheme.ts` dark mode, `nextCronRuns` local-time preview), matching completed ROADMAP entries (#20-23, #26). Found a doc-consistency gap: only 2 of 5 specs carried `status`/`owner` frontmatter, despite all 5 being done — added matching frontmatter (`status: done`, `owner: claude[bot]`) to the other 3 so the spec directory accurately reflects state; this is metadata correction on already-shipped work, not new feature scope. Given the repeated dry state, ran the full local baseline per established precedent (2026-07-06, 2026-07-08): `pnpm install --frozen-lockfile`, `format`, `lint`, `type-check`, `test` (358 passing), and `build` — all clean, no drift.
- Rationale: Decision tree exhausted through all four steps with nothing actionable at any of them. The frontmatter fix is trivial, safe housekeeping (docs priority, no behavior change) rather than manufactured work, and running the verification suite on a dry run follows this project's own precedent rather than re-logging from static checks alone. The pre-existing `act()` warning in `SecretsView.test.tsx` is unchanged and still non-failing — left alone per the priority rule against standalone hygiene work absent a critical trigger.
- PR: n/a
- ROADMAP updated: no

## 2026-07-08

- Action: nothing-actionable
- Summary: CI green on main (the one historical "Deploy to GitHub Pages" failure was on an older commit, superseded by a later successful run on the current HEAD). No open PRs, no open issues, ROADMAP Backlog empty, and both Paused items still correctly blocked on human action (GitHub App registration, admin-granted `workflows` permission). Checked `docs/specs/` for any `owner: claude[bot]` spec not yet implemented — only two specs carry that frontmatter (`dark-mode`, `schedule-local-preview`) and both are `status: done`, matching completed ROADMAP entries; the other three specs predate the frontmatter convention but likewise match Done ROADMAP items (`GettingStarted.tsx`, the three new templates in `templates.ts`, `TaskForm.tsx`'s preview/"Commit to repo" step all present in source). Since the queues were genuinely empty, ran the full local baseline instead of stopping at a bare "nothing found": `pnpm install --frozen-lockfile`, `format`, `lint`, `type-check`, `test` (358 passing), and `build` — all clean, no drift. Skipped the Playwright E2E pass since it was already verified clean on 2026-07-06 with no source changes since.
- Rationale: Decision tree exhausted through all four steps with nothing actionable at any of them; per this project's own precedent (2026-07-06, 2026-07-01) a dry state is worth spending verification budget on running the real suite rather than mechanically re-logging from static checks alone — diligence, not new discovery work, so it stays within the decision tree's stop condition. Noted but did not action: `SecretsView.test.tsx` throws a React `act()` warning during the test run (pre-existing, non-failing) — leaving it alone per the priority rule against picking up standalone hygiene work absent a critical trigger.
- PR: n/a
- ROADMAP updated: no

## 2026-07-06

- Action: nothing-actionable
- Summary: CI green on main (Deploy + sprint workflows both last succeeded), no open PRs, no open issues, ROADMAP Backlog empty. Verified in source that all five `docs/specs/` items are genuinely implemented (`GettingStarted.tsx`, the three new templates in `templates.ts`, `TaskForm.tsx`'s preview/"Commit to repo" step, `useTheme.ts` dark mode, local-time schedule preview). Given two prior dry runs (2026-07-03, 2026-07-04) and the project's own precedent that repeated dry states warrant verifying the app directly rather than just trusting the queues, ran the full local suite instead of stopping at the static checks: `pnpm format:check`, `lint`, `type-check`, `test` (358 passing), `test:e2e` (all 12 Playwright tests passing — this suite still isn't wired into CI per the Paused roadmap item, so it's the only way to catch drift), and `pnpm build`. Everything passed clean — no drift this time, unlike 2026-07-01 which caught two real E2E regressions the same way.
- Rationale: The decision tree was exhausted through all four steps with nothing actionable at any of them; per the project's own established pattern (see 2026-07-01, 2026-06-22 entries) repeated dry states are worth spending the verification budget on running the real suite rather than mechanically re-logging "nothing actionable" from static checks alone — this is diligence, not new discovery work, so it stays within the decision tree's stop condition.
- PR: n/a
- ROADMAP updated: no

## 2026-07-04

- Action: nothing-actionable
- Summary: CI green on main (only in-flight run was this sprint invocation itself), no open PRs, no open issues, ROADMAP Backlog empty. Verified in source (not just trusted ROADMAP/spec frontmatter) that all five `docs/specs/` items are actually implemented: `GettingStarted.tsx` exists, `templates.ts` has the `weekly-status-digest` template, `TaskForm.tsx` has the `'preview'` view state and "Commit to repo" submit button, `useTheme.ts` exists for dark mode, and local-time schedule preview code is present in `TaskForm.tsx`/`TaskList.tsx`/`ActivityPanel.tsx`.
- Rationale: This is only the second consecutive dry day (2026-07-02 had a real PR merge in between), not the third-straight-dry-day signal that triggered manual app verification on 2026-07-01 — so no reason yet to deviate from the standard "log and stop" path; the queues are genuinely empty, not just unchecked.
- PR: n/a
- ROADMAP updated: no

## 2026-07-03

- Action: nothing-actionable
- Summary: CI green on main, no open PRs, no open issues, ROADMAP Backlog empty. Verified (not just trusted ROADMAP) that all five docs/specs/ items are actually implemented in source — `GettingStarted.tsx`, the weekly digest template in `templates.ts`, and the "Commit to repo" preview step in `TaskForm.tsx` all exist. The Playwright E2E-in-CI item remains correctly Paused (blocked on a human granting the bot's GitHub App `workflows` permission — unchanged since 2026-07-01).
- Rationale: Decision tree exhausted through all four steps with genuine verification at each. Unlike 2026-06-30 → 2026-07-01 (three straight dry days, which triggered manually running the app and finding real E2E drift), yesterday had substantive work (PR #36 merged), so this is a fresh dry state, not a stale-queue signal — no reason yet to deviate from the standard "log and stop" path.
- PR: n/a
- ROADMAP updated: no

## 2026-07-02

- Action: pr-merged
- Summary: PR #36 (E2E selector fixes for onboarding checklist + YAML preview drift) was open with no review, CI green, and mergeable. Reviewed the diff — minimal, correctly disambiguates the duplicate "+ New task" button with `.first()` and adds the missing "Commit to repo" click for the two-step submit flow — but could not use `gh pr review --approve` since the PR was authored by the same bot identity ("Can not approve your own pull request"). Merged directly since the change was already verified sound and CI-green.
- Rationale: Per the decision tree, an open PR takes priority over issues/roadmap/specs; a correct, CI-green, drift-fixing test PR sitting unmerged is higher-value to resolve than starting new discovery work.
- PR: #36
- ROADMAP updated: no

## 2026-07-01

- Action: roadmap
- Summary: CI green, no open PRs/issues, roadmap backlog empty, all specs done — third consecutive nothing-actionable state, so inspected the running app instead of logging again. Found that the 12-test Playwright E2E suite is never run in CI, and running it locally surfaced two real regressions from unnoticed feature drift: the onboarding checklist added a second "+ New task" button (strict-mode locator failures), and the YAML preview/confirm feature turned task creation into a two-step submit the test never clicked through. Fixed both (12/12 pass); PR #36 raised. Could not wire the suite into `ci.yml` myself — push was rejected because the bot's GitHub App installation lacks `workflows` permission — so the CI addition is documented in the PR body for a human to apply.
- Rationale: Per the project's own history (see 2026-06-22 entry), three straight nothing-actionable days is the signal to stop trusting the formal queues and verify the app directly; DX/automation (a test suite with zero effect) ranks above documentation or coverage work in the stated priority order, and the two bugs it caught are exactly the kind of regression E2E tests exist to prevent.
- PR: #36
- ROADMAP updated: yes

## 2026-06-30

- Action: nothing-actionable
- Summary: CI green, no open PRs, no open issues, roadmap backlog empty, all docs/specs/ implemented and marked done — same state as yesterday.
- Rationale: Decision tree exhausted through all four steps. No new items have been added to the backlog or issue tracker. The project's formal queues are dry; the next step is a human adding a new roadmap item or opening an issue.
- PR: n/a
- ROADMAP updated: no

---

## 2026-06-29

- Action: nothing-actionable
- Summary: CI green (358 tests, lint, type-check all clean), no open PRs, no open issues, roadmap backlog empty, all docs/specs/ implemented and marked done.
- Rationale: Decision tree exhausted through all five steps — no work in any tracked queue. The MVP feature set is complete (task list, inline output, auto-poll, prompt viewer, dark mode, templates, onboarding, YAML preview, schedule preview, run status badges, activity tab). Only Paused item is GitHub App registration, deliberately held for external-user launch.
- PR: n/a
- ROADMAP updated: no

---

## 2026-06-28

- Action: pr-merged
- Summary: Merged PR #35 which raised test coverage from 33% to 89% (75 new tests across 7 files covering App navigation, SecretsView, TemplatePicker, TokenSetup, useAuth, useRepo, and github API wrappers).
- Rationale: PR was bot-authored with green CI and had no reviewer; reviewed the diff, confirmed quality (module-boundary mocks, proper async patterns, behavioural assertions), merged directly since self-approval is blocked.
- PR: #35
- ROADMAP updated: no

---

## 2026-06-27

- Action: issues
- Summary: Added 75 tests across 5 new test files and 2 extended test files, raising line coverage from 32% to 89% and resolving coverage threshold failures.
- Rationale: Coverage was critically low (32.98% lines, 64.75% functions — both below the 80% threshold) and there was no feature work in the backlog; SecretsView, TokenSetup, useAuth, and useRepo had 0–9% coverage despite being core user flows.
- PR: #35
- ROADMAP updated: no

---

## 2026-06-26

- Action: pr-closed
- Summary: Fixed CI failure — `workflows.test.ts` fixture was missing the `prompt` field added to `GithatchTask` when PR #34 introduced the inline prompt viewer; added `prompt: ''` to the test fixture and pushed directly to main.
- Rationale: CI was broken on main blocking all deploys; this was a trivial one-line type-error fix with no other PRs or issues pending.
- PR: n/a
- ROADMAP updated: no

---

## 2026-06-25

- Action: pr-merged
- Summary: Reviewed and merged PR #34 — inline prompt viewer on task cards; a Prompt toggle button expands to show the agent's full prompt text, with YAML parsing that strips the delivery instruction suffix and handles both block-scalar and single-quoted formats.
- Rationale: Open PR with green CI was the highest-priority item per decision tree; the feature is correct, well-tested (4 UI tests + 2 parser tests), and directly advances the "thin and auditable" principle by letting users inspect the exact prompt before triggering a run.
- PR: #34
- ROADMAP updated: no

## 2026-06-24

- Action: roadmap
- Summary: Added inline prompt viewer to task cards — a Prompt toggle button expands to show the agent's full prompt text without entering the edit flow; zero extra API calls since the YAML is already fetched during listGithatchTasks; 6 new tests (283 total); PR #34 raised.
- Rationale: CI green, no open PRs or issues, roadmap backlog empty, all specs done — the prompt was already being parsed and discarded in GithatchTask; surfacing it directly serves the "Thin and auditable" principle (users can inspect what each agent is told to do before clicking Run now) without adding any new dependencies or API calls.
- PR: #34
- ROADMAP updated: no

## 2026-06-23

- Action: pr-merged
- Summary: Reviewed and merged PR #33 — inline run output extended to `pull_request` (queries issues API for bot-created PR since run start) and `file` (constructs deterministic blob/tree GitHub URL without an API call) output types.
- Rationale: Open PR with green CI was the highest-priority item per decision tree; the feature is correct, well-tested, and directly improves UX for the two most action-oriented output types.
- PR: #33
- ROADMAP updated: no

## 2026-06-22

- Action: roadmap
- Summary: Extended inline run output to all four trackable output types — pull_request now queries the issues API for a bot-created PR since the run started; file constructs a deterministic GitHub blob/tree URL without an API call; 5 new tests (277 total); PR #33 raised.
- Rationale: Third consecutive nothing-actionable sprint; rather than log again, inspected codebase and found the "auto-show output" feature (shipped June 18-19) covered only new_issue and issue_comment — pull_request and file were silently excluded. Extending to all types directly serves the "thin and auditable" principle and closes the feedback loop for the two most action-oriented output types.
- PR: #33
- ROADMAP updated: no

## 2026-06-21

- Action: nothing-actionable
- Summary: CI green, no open PRs, no open issues, roadmap backlog empty, all specs done — second consecutive sprint with no tracked work remaining.
- Rationale: Exhausted all decision-tree branches; the MVP feature set is complete and the only Paused item (GitHub App registration) is deliberately held for when the tool opens to external users.
- PR: n/a
- ROADMAP updated: no

## 2026-06-20

- Action: nothing-actionable
- Summary: CI green, no open PRs, no open issues, roadmap backlog empty, all claude[bot]-owned specs have status: done.
- Rationale: Exhausted all decision-tree branches; the project is fully caught up with no pending work in any tracked queue.
- PR: n/a
- ROADMAP updated: no

## 2026-06-19

- Action: pr-merged
- Summary: Reviewed and merged PR #32 — auto-show run output inline on task cards after a successful "Run now" trigger; new_issue/issue_comment types surface their created content immediately on poll completion, dismissible; 4 new tests; CI green.
- Rationale: Only open PR had green CI and mergeable status; merging an existing ready PR takes priority over starting new feature work per the decision tree. Self-approval blocked by GitHub so merged directly after confirming CI green and implementation correct.
- PR: #32
- ROADMAP updated: no

## 2026-06-18

- Action: roadmap
- Summary: Implemented auto-show of run output inline on the task card after a successful "Run now" trigger — for new_issue and issue_comment output types, the created issue or posted comment appears automatically when polling detects completion, dismissible with Close; 4 new tests, 272 total; PR #32 raised.
- Rationale: CI green, no open PRs or issues, roadmap backlog empty, all specs implemented — the "Run now" flow had a feedback gap where successful completion left no visible signal; users had to manually open History to see what the agent produced; auto-surfacing the output closes the loop without adding any new abstractions.
- PR: #32
- ROADMAP updated: no

## 2026-06-17

- Action: pr-merged
- Summary: Reviewed and merged PR #31 — auto-poll run status after manual trigger; "Queued" badge shows immediately after "Run now", polls every 8s until new run detected, transitions to Running/Failed via existing LastRunIndicator; 5 new tests, 268 total; CI green.
- Rationale: Open PR with green CI and correct implementation takes priority; self-approval blocked by GitHub so merged directly after manual review confirmed no logic flaws.
- PR: #31
- ROADMAP updated: no

## 2026-06-16

- Action: roadmap
- Summary: Implemented auto-poll of run status after manual trigger — task cards show a "Queued" badge immediately after "Run now" succeeds and poll every 8 s until the run is found, transitioning to Running/Failed via the existing LastRunIndicator; 5 new tests, 268 total; PR #31 raised.
- Rationale: CI green, no open PRs or issues, roadmap backlog empty, all specs implemented — the post-trigger UX gap (user clicks "Run now" and gets 3-second "Triggered!" then silence) was the clearest friction point against the "zero-friction UX" goal; auto-poll closes the feedback loop without adding any new dependencies.
- PR: #31
- ROADMAP updated: no

## 2026-06-15

- Action: pr-merged
- Summary: Reviewed and merged PR #30 — output destination label on task cards + ToolsPanel design alignment with monochrome system; CI green, all 263 tests passing.
- Rationale: Open PR with green CI takes priority; self-approval blocked by GitHub so merged directly after manual review confirmed correctness.
- PR: #30
- ROADMAP updated: no

## 2026-06-14

- Action: roadmap
- Summary: Added output destination labels to task cards (`→ New issue`, `→ Issue #42`, `→ Pull request`, `→ reports/weekly.md`) using already-fetched data — zero extra API calls; redesigned ToolsPanel to match app's sharp monochrome design system (removed jarring rounded/gray-\* inconsistency); 5 new tests, 263 total (↑ from 258); PR #30 raised.
- Rationale: CI green, no open PRs or issues, roadmap backlog empty, all specs implemented — output destination on cards is the highest UX value because users with multiple tasks have no way to distinguish where agents post results without clicking Edit on each; ToolsPanel design fix removes the only component using a completely different visual language from the rest of the app.
- PR: #30
- ROADMAP updated: no

## 2026-06-13

- Action: pr-merged
- Summary: Reviewed and merged PR #29 — duplicate task button and clickable run status badges; CI was green, code verified correct.
- Rationale: Only open PR had green CI and verified-correct implementation; merging a ready PR takes priority over starting new feature work.
- PR: #29
- ROADMAP updated: no

## 2026-06-12

- Action: roadmap
- Summary: Added "Duplicate" button to task rows (loads YAML, pre-populates New Task form with name " Copy" appended) and made LastRunIndicator badges clickable links to the GitHub Actions run URL; 4 new tests, 258 total (↑ from 254); PR #29 raised.
- Rationale: CI green, no open PRs or issues, roadmap backlog empty, all specs implemented — chose user-facing UX improvements from codebase inspection: duplicate reduces friction for creating task variations (was 7 clicks to re-enter config, now 1); clickable badge reduces "my agent failed" diagnostic flow from 3 clicks to 1, higher ROI than any test/docs work.
- PR: #29
- ROADMAP updated: no

## 2026-06-11

- Action: pr-merged
- Summary: Reviewed and merged PR #28 — adds 3 new templates (Release Notes Drafter, Open PR Nudge, Security Vulnerability Scan) to the starter template library, closing gaps around release workflow, PR lifecycle health, and supply chain security; 254 tests pass.
- Rationale: Only open PR had green CI and was mergeable; merging it over starting new feature work is the right order — never skip a ready PR.
- PR: #28
- ROADMAP updated: no

## 2026-06-10

- Action: issues
- Summary: Added 3 new workflow templates (Release Notes Drafter, Open PR Nudge, Security Vulnerability Scan) covering release workflow, PR health monitoring, and supply chain security — gaps not addressed by the existing 6 templates; 254 tests (↑ from 249); PR #28 raised.
- Rationale: CI green, no open PRs, no open issues, roadmap backlog empty, all claude[bot] specs implemented — highest-value user-facing improvement is more templates since they reduce time-to-first-agent for new users; chose release/PR/security because they are universal to every repo and not yet covered.
- PR: #28
- ROADMAP updated: no

## 2026-06-09

- Action: pr-merged
- Summary: Reviewed and merged PR #27 (last-run status badge + duplicate Scheduled section removal) — `LastRunIndicator` component silently fetches the most recent run on mount and shows a badge for Failed/Cancelled/Running states; duplicate "Scheduled" section and `ScheduledRow` component removed; 249 tests (all green), lint/format/type-check clean.
- Rationale: PR was the only open item; feature-complete, all checks green, correctly removes UX confusion (tasks appearing twice) and adds actionable visibility into failing agents without requiring manual History clicks.
- PR: #27
- ROADMAP updated: yes

## 2026-06-08

- Action: issues (roadmap item identified and implemented)
- Summary: Added last-run status badge (`Failed`/`Cancelled`/`Running`) to task cards via a silent background fetch on mount; removed the duplicate "Scheduled" section that rendered every scheduled task twice; 249 tests (↑ from 243); PR #27 raised.
- Rationale: No open issues, no open PRs, roadmap backlog empty, all five specs implemented — identified the highest user-facing value from codebase inspection: users have no way to see a failing agent without manually clicking History on every card, and scheduled tasks render twice causing confusion. Both problems are in the same component and fixable together.
- PR: #27
- ROADMAP updated: no

## 2026-06-07

- Action: pr-merged
- Summary: Reviewed and merged PR #26 (schedule local-time preview in TaskForm) — `nextCronRuns`/`isValidCron` added to cronLabel, `SchedulePreview` component shows next 3 UTC + local run times, invalid custom cron blocks submit; CI green, implementation correct.
- Rationale: PR was the only open item, CI green, code matched spec exactly — merging directly ships the timezone-confusion fix to users.
- PR: #26
- ROADMAP updated: yes

## 2026-06-06

- Action: roadmap
- Summary: Implemented schedule local-time preview in TaskForm — added `nextCronRuns`/`isValidCron` to cronLabel, added `SchedulePreview` component showing next 3 UTC (and local) run times, inline "Invalid cron expression" error with submit disabled.
- Rationale: Top backlog item with a ready spec; direct user-facing UX improvement preventing silent timezone confusion.
- PR: #26
- ROADMAP updated: yes

## 2026-06-05

- Action: pr-merged
- Summary: Merged PR #25 — fixes retired Opus 4.7 model ID, adds weekday schedule preset, clarifies UTC labels on all schedule presets.
- Rationale: PR was green, mergeable, no review required (self-authored bot PR); merging unblocks users who would have gotten broken workflow YAML from selecting the retired model.
- PR: #25
- ROADMAP updated: no

---

## 2026-06-04

- Action: roadmap (bug fix + spec)
- Summary: Fixed retired `claude-opus-4-7` model ID → `claude-opus-4-8` in PROVIDER_MODELS (would have generated broken YAML for any user selecting Opus); added "Daily 8am UTC (weekdays)" schedule preset and UTC suffix to all time-based presets to prevent timezone confusion; wrote new spec for schedule local-time preview + cron validator; refilled ROADMAP backlog. 235 tests passing (up from 233).
- Rationale: After three consecutive nothing-actionable runs, identified two concrete user-facing bugs: (1) retired model ID in the dropdown generates broken workflow YAML, (2) no weekday-only preset forces users to know cron syntax for the most common use case; both are higher-priority than any test/docs work. Spec written to re-seed the pipeline.
- PR: #25
- ROADMAP updated: yes

---

## 2026-06-03

- Action: nothing-actionable
- Summary: CI green, no open PRs, no open issues, ROADMAP backlog empty, all four agent-authored specs in docs/specs/ already implemented and marked Done.
- Rationale: Decision tree exhausted through all five steps — CI healthy, no PRs to review or merge, no issues to close, backlog empty, every spec in docs/specs/ confirmed implemented in ROADMAP Done list. Stopping as instructed rather than inventing scope.
- PR: n/a
- ROADMAP updated: no

---

## 2026-06-02

- Action: nothing-actionable
- Summary: CI green, no open PRs, no open issues, ROADMAP backlog empty, all four agent-authored specs already implemented and marked Done.
- Rationale: Decision tree exhausted — no pre-existing work to action; logging and stopping per instructions rather than inventing scope.
- PR: n/a
- ROADMAP updated: no

---

## 2026-06-01

- Action: pr-merged
- Summary: Reviewed and merged PR #24 (README file map refresh) — verified all 8 newly documented files exist with accurate descriptions; CI green, clean merge.
- Rationale: Only open PR; docs accuracy is hygiene that pays off for every future contributor — merging it immediately over starting new roadmap discovery work.
- PR: #24
- ROADMAP updated: no (already updated in PR)

---

## 2026-05-31

- Action: roadmap
- Summary: Updated README file map to add 8 files added since initial scaffold: ActivityPanel, ErrorBoundary, GettingStarted, SecretsView, TemplatePicker, cronLabel.ts, templates.ts, useTheme.ts.
- Rationale: Only Backlog item; README accuracy is hygiene that aids every contributor — chosen over discovery work as nothing else was actionable.
- PR: #24
- ROADMAP updated: yes

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

## 2026-05-27

- Action: roadmap
- Summary: Implemented starter template library — extended Template type to support inline config, added 4 new general-purpose templates (Weekly Status Digest, Stale Issue Triage, Dependency Update Digest, Docs Freshness Check), 12 new tests, all 227 tests pass.
- Rationale: Top backlog item with a complete spec; directly addresses the zero-friction 2-minute onboarding goal by giving new users real-world starter templates instead of a blank form.
- PR: #22
- ROADMAP updated: yes

## 2026-05-28

- Action: pr-merged
- Summary: Reviewed and merged PR #22 (starter template library) — discriminated union Template type, 4 new practical templates with appropriate schedules and output destinations, 12 tests, CI green; ROADMAP moved to Done.
- Rationale: PR #22 was the only open PR (In Progress on ROADMAP), CI was green across both check runs, code was correct and well-tested — merging ships real-use-case templates to users immediately.
- PR: #22
- ROADMAP updated: yes

## 2026-05-30

- Action: pr-merged
- Summary: Reviewed and merged PR #23 (dark mode via CSS variable inversion) — `useTheme` hook, Tailwind v4 class-based dark variant, symmetric gray scale inversion in `.dark`, sparkline SVG updated to `currentColor`; 6 tests, CI green; ROADMAP moved to Done.
- Rationale: PR #23 was the only open PR with green CI and no review — merging it immediately ships dark mode to users rather than leaving it awaiting next sprint.
- PR: #23
- ROADMAP updated: yes

## 2026-05-29

- Action: roadmap
- Summary: Implemented dark mode — Tailwind v4 CSS variable inversion (`--color-black ↔ --color-white` in `.dark`) flips the entire monochrome palette globally; header gets a Dark / Light toggle button; `Sparkline` SVG updated to `currentColor` + `--sparkline-empty` CSS token; `useTheme` hook with 6 tests; 233 total tests passing. PR #23 raised, spec written at `docs/specs/2026-05-29-dark-mode.md`.
- Rationale: Top ROADMAP backlog item (CI green, no open PRs or issues). Dark mode is user-facing and the monochrome design makes it an unusually elegant CSS-only implementation with zero per-component changes.
- PR: #23
- ROADMAP updated: yes

## 2026-07-05

- Action: nothing-actionable
- Summary: CI green on main, no open PRs, no open issues, ROADMAP Backlog empty, and all 5 specs in docs/specs/ are already implemented and shipped on main (verified GettingStarted.tsx, weekly-status-digest/stale-issue-triage/etc. templates, and TaskForm YAML preview flow all exist in code).
- Rationale: Followed decision tree strictly in order; every branch (CI, PRs, issues, roadmap, specs) came up empty, so per step 4 the correct action is to log and stop rather than invent unscoped work.
- PR: n/a
- ROADMAP updated: no

## 2026-07-07

- Action: nothing-actionable
- Summary: Deploy workflow's most recent run on main failed, but root-cause analysis showed `checks` and `build` jobs both succeeded — only the final `deploy-pages` step failed with GitHub's own transient "Deployment failed, try again later." error, unrelated to repo code; bot token lacks rerun/workflow_dispatch permission, but the next push to main (this sprint-log commit) will trigger a fresh deploy via the existing push trigger. No open PRs, no open issues, ROADMAP Backlog empty, and all 5 specs in docs/specs/ are already implemented and shipped (re-verified GettingStarted.tsx, templates.ts config field, TaskForm preview state). Test coverage is 89.34% (358/358 passing), well above the 50% critical threshold, so no standalone test/security work is justified either.
- Rationale: Followed decision tree strictly in order; the CI failure was infra-transient (not a code defect) and self-heals on next push, and every subsequent branch (PRs, issues, roadmap, specs) came up empty, so per step 4 the correct action is to log and stop rather than invent unscoped work.
- PR: n/a
- ROADMAP updated: no

## 2026-07-12

- Action: nothing-actionable
- Summary: CI green on main (senior-engineer-daily-sprint and Deploy workflows both last succeeded). No open PRs, no open issues, ROADMAP Backlog empty, both Paused items still correctly blocked on human action. All 6 `docs/specs/` entries carry `status: done` and match shipped code (most recently PR #37's failure summary banner, merged yesterday). Ran the full local baseline for diligence: `pnpm install --frozen-lockfile`, `format`, `lint`, `type-check`, `test` (361/361 passing, up from 358 after #37's banner tests), and `build` — all clean, no drift. The pre-existing non-failing `act()` warning in `SecretsView.test.tsx` is unchanged.
- Rationale: Decision tree exhausted through all four steps with nothing actionable at any of them; per recent precedent (2026-07-05, 2026-07-07, 2026-07-08, 2026-07-09) the correct move on a genuinely empty queue is to log and stop rather than invent unscoped feature work, while still spending the run on verifying the real suite (not just static queue checks) so drift would be caught if present.
- PR: n/a
- ROADMAP updated: no

## 2026-07-11

- Action: pr-merged
- Summary: Reviewed and merged PR #37 (failure summary banner in task list) — lifts `lastRun` state from `TaskRow` to `TaskList` via a ref-backed callback and renders an aggregate "N of M tasks failed last run" banner reusing the existing per-card failure condition; 3 new tests, CI green. Moved ROADMAP item to Done.
- Rationale: Only open PR, no review yet and CI green — reviewing and merging ships a small, well-scoped, already-tested feature gap (self-sourced last sprint) rather than leaving it idle; higher priority than sourcing new work while a ready PR sits open (step 1 precedes steps 2-4 in the decision tree).
- PR: #37
- ROADMAP updated: yes

## 2026-07-16

- Action: pr-merged
- Summary: Reviewed and merged PR #38 (prevent silent workflow overwrite on task-name collision) — `TaskForm` now blocks submission with an inline error when the computed slug matches an existing task's slug, closing a real data-loss gap where two same-slugged tasks could silently clobber each other's committed workflow file; also fixes a long-standing `act()` warning in `SecretsView.test.tsx`. CI green, 2 new tests, verified the edit-task flow is correctly unaffected (it intentionally reuses its own slug) and the duplicate-task flow benefits (forces a rename instead of clobbering the source task).
- Rationale: Step 1 of the decision tree (open PRs) precedes sourcing new work; this was the only open PR, already correct and tested, so shipping it outranks any DX/docs/test-coverage work per the stated priority order.
- PR: #38
- ROADMAP updated: no

## 2026-07-17

- Action: roadmap
- Summary: CI green, no open PRs/issues, ROADMAP Backlog empty, all 6 specs shipped. Rather than log another dry entry, reviewed the codebase directly (matching precedent from 2026-07-15) and found a genuine UX gap: `RepoPicker` is a native `<select>` listing every pushable repo with no search, even though `listPushableRepos` already paginates through the full list — a real friction point for org members against the README's "2-minute onboarding" goal, and the very first screen after login. Replaced it with a filterable combobox (type-to-filter, arrow keys, Enter/Escape), wrote a spec (`docs/specs/2026-07-17-searchable-repo-picker.md`), 11 new component tests, updated `App.test.tsx` and the Playwright smoke suite for the new semantics. 374/374 unit tests and 13/13 E2E tests passing, lint/type-check/build clean. Seeded ROADMAP Backlog with a follow-up item (task search/filter in TaskList) for a future sprint. PR #39 raised.
- Rationale: Feature/UX work outranks documentation or test-coverage work per the stated priority order, and a real, well-scoped gap was identified directly rather than inventing arbitrary work — consistent with how the same "backlog empty" situation was resolved on 2026-07-15.
- PR: #39
- ROADMAP updated: yes

## 2026-07-18

- Action: pr-merged
- Summary: Reviewed PR #39 (searchable repo picker, opened 2026-07-17) — GitHub blocked a formal `gh pr review` since the PR and I share the `claude[bot]` identity, so posted findings as a comment instead. Found and reproduced a real bug: `RepoPicker`'s `onBlur` only closed the dropdown without reverting `query`, so typing a filter and then blurring without selecting (click outside, tab away) left the "Active repository" input permanently stuck showing stray search text instead of the actual selected repo, with no recovery on refocus since the list would reopen filtered by the stale text. Fixed by having `onBlur` call the existing `revert()` (already used by Escape), added a regression test, ran the full local baseline (375/375 tests, lint/type-check/format clean), then merged #39 once CI was green. Moved ROADMAP item to Done.
- Rationale: Step 1 of the decision tree (open PRs) precedes sourcing new work; this was the only open PR, and finishing a genuine correctness bug found during review outranks starting new feature work with a known-broken PR left open.
- PR: #39
- ROADMAP updated: yes
