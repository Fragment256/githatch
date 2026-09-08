## Sprint 144 — 2026-09-08 (day 2 of cycle)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 542/542. No drift from sprint 143. Unscoped Explore audit reserved for day 3 (sprint 145).

---

## Sprint 143 — 2026-09-08 (day 1 of new cycle after sprint 142 bug-fix)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 542/542. No drift from sprint 142. Unscoped Explore audit reserved for day 3 (sprint 145).

---

## Sprint 142 — 2026-09-08 (day 3 Explore audit — 2 bugs fixed)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 541/541.
**Bugs found:** 2 fixed.
**Tests after:** 542/542 (+1)

### Fixes

1. **MEDIUM** `TaskList.tsx` — poll success path missing `setTriggerError(null)`. A transient network failure during polling set the error; the next successful poll left the stale message on-screen alongside the completed-run indicators. Fix: `setTriggerError(null)` at the top of the `.then()` handler. 1 regression test (RED→GREEN).

2. **LOW** `App.tsx` — `← Back` button not disabled while `saving` is true. Clicking Back mid-save called `setSaveError(null)` immediately; if the in-flight PUT then failed, `setSaveError` fired with `view` already changed, silently dropping the error. Fix: `disabled={saving}` + `disabled:opacity-40 disabled:cursor-not-allowed` on the button.

---

## Sprint 141 — 2026-09-08 (day 2 of cycle)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 541/541. No drift from sprint 140. Unscoped Explore audit reserved for day 3 (sprint 142).

---

## Sprint 140 — 2026-09-08 (day 1 of new cycle after sprint 139 bug-fix)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 541/541. No drift from sprint 139. Unscoped Explore audit reserved for day 3 (sprint 142).

---

## Sprint 139 — 2026-09-08 (day 3 Explore audit — 2 bugs fixed)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 539/539.
**Bugs found:** 2 fixed.
**Tests after:** 541/541 (+2)

### Fixes

**MEDIUM — App.tsx: handleTaskFormSubmit did not reload tasks after new-task submit**

- Symptom: New task added optimistically with `workflowId: undefined`, causing all action buttons permanently disabled. No `loadTasks()` call in success branch so the stub entry was never replaced with the real one from the API.
- Fix: Call `loadTasks()` in the success branch of `handleTaskFormSubmit` (the edit flow already did this on both paths).
- Test: regression test (RED→GREEN).

**LOW — App.tsx: prevRunIdRef.current unset before initial getWorkflowRuns resolved**

- Symptom: Clicking "Run now" before the initial run fetch completed left `prevRunIdRef.current` at `null`. The poller guard (`run.id === prevRunIdRef.current`) never matched null, so any pre-existing completed run was treated as newly triggered and `fetchRunOutput` was called on it spuriously.
- Fix: Initialise `prevRunIdRef.current` inside the initial fetch `.then()` so the baseline is set regardless of whether the user clicks Run first.
- Test: 1 regression test (RED→GREEN).

### Dry streak

Resets to 0 (2 bugs found and fixed). Next: sprint 140 baseline (day 1 of new cycle).

---

## Sprint 138 — 2026-09-08 (day 2 of cycle)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 539/539. No drift from sprint 137. Unscoped Explore audit reserved for day 3 (sprint 139).

---

## Sprint 137 — 2026-09-08 (day 1 of new cycle after sprint 136 bug-fix)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 539/539. No drift from sprint 136. Unscoped Explore audit reserved for day 3 (sprint 139).

---

## Sprint 136 — 2026-09-08 (day 3 Explore audit — 1 MEDIUM bug fixed)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 538/538.
**Bugs found:** 1 MEDIUM fixed.
**Tests after:** 539/539 (+1)

### Fix

**MEDIUM — useAuth.ts: code-exchange path always cleared token on transient `getAuthenticatedUser` failure**

- File: `src/hooks/useAuth.ts:52–80`
- Symptom: OAuth code exchange succeeds, token stored, but `getAuthenticatedUser` returns a transient error (503, network timeout). The single `.catch()` at the end of the chain unconditionally called `clearToken()` and set `token: null`. Since the auth code in the URL was already consumed by `replaceState`, the user had to click Login again and re-authorize from scratch — even though the token itself was valid. Sprint 130 fixed the stored-token path (lines 70–85) to only clear on 401; the code-exchange path was not given the same treatment.
- Fix: Move `getAuthenticatedUser` into a nested `try/catch` inside the `.then()`. On 401 → `clearToken()` + null token. On transient error → keep token, show "Could not reach GitHub" error. The outer `.catch()` now only fires if `exchangeCodeForToken` itself throws, which still clears the (non-existent) token.
- Test: `useAuth.test.ts` — updated 401-after-storeToken test to use 401 error; added new test verifying transient `Failed to fetch` keeps token and does not call `clearToken`. RED → GREEN.

### Dry streak

Resets to 0 (bug found and fixed this sprint). Next: sprint 137 baseline (day 1 of new cycle).

---

## Sprint 135 — 2026-09-08 (day 2 of new cycle)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 538/538. No drift from sprint 134. Unscoped Explore audit scheduled for sprint 136 (day 3, next heartbeat).

## Sprint 134 — 2026-09-08 (day 1 of new cycle after sprint 133 dry audit)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 538/538. No drift from sprint 133. Unscoped Explore audit reserved for day 3 (sprint 136).

## Sprint 133 — 2026-09-08 (day 3 Explore audit — dry)

**Audit:** Unscoped Explore audit ran per precedent. Full baseline first: format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 538/538. Reviewed all source files: `src/lib/` (auth.ts, cronLabel.ts, github.ts, secrets.ts, tools.ts, workflows.ts, yamlGenerator.ts), all hooks (useAuth.ts, useRepo.ts, useTasks.ts, useTheme.ts), and all components (ActivityPanel, AgentConfig, ConfirmDialog, GettingStarted, RepoPicker, SecretsView, TaskForm, TaskList/TaskRow/RunHistoryPanel, TemplatePicker, TokenSetup, ToolsPanel). No correctness bugs found. All previously acknowledged LOW items confirmed unchanged (ToolCard check-error install-button, auth.ts `!data.id` falsy check, sessionStorage use in auth/GettingStarted, fetchRunOutput 100-item cap). Dry streak begins.

## Sprint 132 — 2026-09-07 (day 2 of new cycle after sprint 130 bug-fixes)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 538/538. No drift from sprint 131. Unscoped Explore audit scheduled for sprint 133 (day 3, next heartbeat).

## Sprint 131 — 2026-09-07 (day 1 of new cycle after sprint 130 bug-fixes)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 538/538. No drift from sprint 130. Unscoped Explore audit reserved for day 3 (sprint 133).

## Sprint 130 — 2026-09-07 (day 3 Explore audit — 3 bugs fixed)

**Audit:** Unscoped Explore audit ran per precedent. Full baseline first: format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 533/533. Explore surfaced 4 findings; 3 confirmed real bugs fixed via TDD. (1) MEDIUM: `cronLabel.ts` — `parseInt('0-5',10)===0` false-positive in `nextCronRun`, `canPreviewCron`, and `describeCron` caused minute-range expressions like `'0-5 */2 * * *'` to mislabel as "Every 2 hours" and produce wrong next-run previews. Fix: strict string equality `(minute==='0'||minute==='00')` in all 3 sites. (2) HIGH: `TaskList.tsx` polling `.catch(()=>{})` swallowed all API errors during run monitoring — rate-limit/network failures showed generic timeout after 5 min with no real error. Fix: surface via `setTriggerError`. (3) MEDIUM: `useAuth.ts` cleared stored token on any `getAuthenticatedUser` failure including transient network errors, silently logging users out during GitHub outages. Fix: only clear token when error message contains '401'. (4) Acknowledged LOW: `AgentConfig.tsx` missing `token` in reset effect deps — latent trap but inert in current app since token changes always clear `activeRepo`. Not fixed (current app behavior correct). 538/538 tests (up from 533). Commit `0e28c11` pushed. Dry streak resets to 0.

## Sprint 129 — 2026-09-07 (day 2 of new cycle after sprint 127 bug-fixes)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 533/533. No drift from sprint 128. Unscoped Explore audit scheduled for sprint 130 (day 3, next heartbeat).

## Sprint 114 — 2026-09-07 (day 2 of new cycle)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 524/524. No drift from sprint 113. Unscoped Explore audit scheduled for sprint 115 (day 3, next heartbeat).

## Sprint 113 — 2026-09-07 (day 1 of new cycle after sprint 112 bug-fixes)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 524/524. No drift from sprint 112. Unscoped Explore audit reserved for day 3 (sprint 115).

## Sprint 112 — 2026-09-07 (Explore audit — day 3 of new cycle, 3 bugs fixed)

**Audit:** Unscoped Explore audit ran per precedent. Full baseline first: format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 517/517. Explore surfaced 3 findings; all 3 confirmed real bugs fixed via TDD. (1) MEDIUM: `isValidCron` rejected valid GitHub Actions crons like `0 */4 * * 1-5` — preview restrictions conflated with validity. Fix: separate `canPreviewCron()` from `isValidCron()`; `SchedulePreview` uses 3-way guard (invalid → error, valid-but-not-previewable → notice, valid → next runs). `customCronInvalid` now correctly allows weekday interval schedules. (2) LOW-MEDIUM: `fetchRunOutput` rejection silently swallowed in auto-display path after successful triggered run (`.catch(() => {})`). Fix: surface error via `setTriggerError`. (3) LOW: `polling` stuck at `true` when `task.workflowId` transitions to `undefined` during polling; Queued badge permanent, Run now permanently disabled. Fix: `setPolling(false)` when workflowId disappears while polling is active. 524/524 tests (up from 517). Commit `3fdf79b` pushed.

## Sprint 105 — 2026-09-07 (day 2 of dry streak)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 513/513. No drift from sprint 104. Unscoped Explore audit scheduled for sprint 106 (day 3, next heartbeat).

## Sprint 104 — 2026-09-07 (day 1 of new dry streak after sprint 103 dry)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 513/513. No drift from sprint 103. Unscoped Explore audit reserved for day 3 (sprint 106).

## Sprint 103 — 2026-09-07 (Explore audit — day 3 of new cycle, dry)

**Audit:** Unscoped Explore audit ran per precedent. Full baseline first: format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 513/513. Reviewed all source files: `src/lib/` (github.ts, workflows.ts, yamlGenerator.ts, cronLabel.ts, utils.ts, auth.ts, secrets.ts, tools.ts), all hooks (useAuth.ts, useRepo.ts, useTasks.ts, useTheme.ts), and all components (ActivityPanel, AgentConfig, GettingStarted, RepoPicker, SecretsView, TaskForm, TaskList/TaskRow, TemplatePicker, TokenSetup, ToolsPanel, App.tsx). No correctness bugs found. Previous fixes (repo-switch stale state, ToolCard error reset, TaskRow slug key, isValidCron, RequestId guards throughout) all hold. Dry streak begins.

## Sprint 102 — 2026-09-07 (day 2 of new cycle after sprint 100 bugs)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 513/513. No drift from sprint 101. Unscoped Explore audit scheduled for sprint 103 (day 3, next heartbeat).

## Sprint 101 — 2026-09-07 (day 1 of new cycle after sprint 100 bugs)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 513/513. No drift from sprint 100. Unscoped Explore audit reserved for day 3 (sprint 103).

## Sprint 100 — 2026-09-07 (Explore audit — day 3 of new cycle, 3 bugs fixed)

**Audit:** Unscoped Explore audit ran per precedent. Full baseline first: format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 508/508. Explore surfaced 5 findings; 3 confirmed real bugs fixed via TDD. (1) MEDIUM: `ToolCard` useEffect did not call `setError(null)` on repo switch — install error from Repo A persisted on Repo B's card. Fix: add `setError(null)` alongside the existing resets. 1 regression test. (2) MEDIUM: `TaskRow` keyed by `task.slug` — when Repo B contains a task with the same slug as Repo A, React reuses the component; `lastRun`, `polling`, `prevRunIdRef`, `triggeredOutput`, `triggerError`, `toggleError`, `deleteError` all carried over from old repo. Fix: change key to `${owner}/${repo}/${task.slug}` to force remount on repo switch. 1 regression test. (3) LOW: `isValidCron` accepted `*/N` hour with a specific DOW (e.g. `0 */4 * * 1-5`), but `nextCronRun` returns `null` for this pattern — UI showed a next-run preview that would never fire. Fix: add `if (hour.startsWith('*/') && dow !== '*') return false`. 1 regression test. 513/513 passing (up from 508). Dry streak resets to 0. Commit `e55a5d6`.

## Sprint 99 — 2026-09-07 (day 2 of new cycle after sprint 97 bugs)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 508/508. No drift from sprint 98. Unscoped Explore audit scheduled for sprint 100 (day 3, next heartbeat).

## Sprint 98 — 2026-09-07 (day 1 of new cycle after sprint 97 bugs)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 508/508. No drift from sprint 97. Unscoped Explore audit reserved for day 3 (sprint 100).

## Sprint 97 — 2026-09-07 (Explore audit — day 3 of new cycle, 2 bugs fixed)

**Audit:** Unscoped Explore audit ran per precedent. Full baseline first: format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 505/505. Explore surfaced 6 findings; 2 fixed via TDD: (1) MEDIUM: `TokenSetup` "Update" path — `SecretsView` shows an "Update" button when a secret is already set, but clicking it opened `TokenSetup` which immediately short-circuited to "X is already set on this repo. Continue." because `checkSecretExists` returned `true`. The update form was unreachable. Fix: `forceSetup?: boolean` prop on `TokenSetup`; when `true`, `exists && !forceSetup` evaluates false so phase goes to `'setup'` instead of `'not-needed'`. `SecretsView` sets `forceSetup` via `configuringIsUpdate` state, toggled true only when the button label was "Update" (status was 'set'). 2 regression tests. (2) LOW: `handleTaskFormSubmit` called `addTask(...)` for an optimistic update, then immediately called `loadTasks()` which begins with `setTasks([])`, erasing the speculative add and causing a visible blank flash. Fix: remove `loadTasks()` from the success path; `addTask` alone provides an accurate optimistic update (slug, name, schedule, path, enabled are all known; `workflowId: undefined` is correct — no run has occurred yet). Remaining 4 findings LOW deferred. 508/508 passing (up from 505). Dry streak resets to 0. Commit `7ae56fe`.

## Sprint 96 — 2026-09-07 (day 2 of new cycle after sprint 94 bugs)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 505/505. No drift from sprint 95. Unscoped Explore audit scheduled for sprint 97 (day 3, next heartbeat).

## Sprint 95 — 2026-09-07 (day 1 of new cycle after sprint 94 bugs)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 505/505. No drift from sprint 94. Unscoped Explore audit reserved for day 3 (sprint 97).

## Sprint 94 — 2026-09-07 (Explore audit — day 3 of new cycle, 2 bugs fixed)

**Audit:** Unscoped Explore audit ran per precedent. Full baseline first: format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 503/503. Explore surfaced 7 findings; 2 fixed via TDD: (1) HIGH: `ToolsPanel` `handleInstall` `finally` block unguarded — on repo switch mid-install, `setInstalling(false)` fired unconditionally even when a newer install was in-flight for the new repo, prematurely clearing the spinner and leaving the Install button stuck as disabled. Fix: reset `installing` in `useEffect` on dep change + guard `finally` with `if (id === requestIdRef.current)`. 1 regression test. (2) MEDIUM: `TaskList` `handleDelete` success path missing `setDeleting(false)` / `setConfirmDelete(false)` — relied on `onRefresh()` to unmount `TaskRow`; if refresh was slow or returned the deleted file transiently, ConfirmDialog stayed open in "Deleting…" with both buttons disabled, no way to cancel. Fix: `finally` block always resets. 1 regression test. Remaining 5 findings LOW/LOW-MEDIUM deferred. 505/505 passing (up from 503). Dry streak resets to 0. Commits `cc30f5b` + `7a47713`.

## Sprint 93 — 2026-09-07 (day 2 of new cycle after sprint 91 bugs)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 503/503. No drift from sprint 92. Unscoped Explore audit scheduled for sprint 94 (day 3).

## Sprint 81 — 2026-09-06 (day 2 of dry streak)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 494/494. No drift from sprint 80. Unscoped Explore audit scheduled for sprint 82 (day 3).

## Sprint 80 — 2026-09-06 (day 1 of new cycle after dry Explore audit)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 494/494. No drift from sprint 79. Unscoped Explore audit reserved for day 3 (sprint 82).

## Sprint 79 — 2026-09-06 (day 3 of dry streak — Explore audit dry)

**Audit:** Unscoped Explore audit ran per precedent. Full baseline: format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 494/494. Reviewed all source files in `src/lib/` (github.ts, workflows.ts, yamlGenerator.ts, cronLabel.ts, utils.ts, auth.ts, secrets.ts, tools.ts, templates.ts, config.ts), all components (ActivityPanel, AgentConfig, GettingStarted, RepoPicker, SecretsView, TaskForm, TaskList, TemplatePicker, TokenSetup, ToolsPanel), all hooks (useAuth, useRepo, useTasks, useTheme), and App.tsx. No correctness bugs found. Dry streak continues at 3.

## Sprint 78 — 2026-09-06 (day 2 of dry streak)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 494/494. No drift from sprint 77. Unscoped Explore audit scheduled for sprint 79 (next sprint, day 3).

## Sprint 77 — 2026-09-06 (day 1 of new dry streak)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 494/494. No drift from sprint 76. Unscoped Explore audit reserved for day 3 (sprint 79).

## Sprint 76 — 2026-09-06 (Explore audit → 3 bugs fixed, dry streak resets to 0)

**Audit:** Unscoped Explore audit ran per precedent. Full baseline first: format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 491/491. Explore surfaced 3 real bugs, all fixed via TDD. (1) HIGH: `listGithatchTasks` included `githatch-tool-*.yml` files in the task list — tool files match `githatch-*.yml` filter, causing installed tools to appear as ghost tasks in TaskList, marking "Create your first task" as complete on GettingStarted, and allowing users to accidentally delete tool workflow files. Fix: add `!f.name.startsWith('githatch-tool-')` to the filename filter. 1 regression test added. (2) MEDIUM: `lastRuns` state in `TaskList` not cleared on repo switch — when switching to a repo that has a task with the same slug as a failed task in the previous repo, the stale `lastRuns` entry kept the failure banner visible during the in-flight fetch window. Fix: `useEffect(() => setLastRuns({}), [owner, repo])`. 1 regression test added. (3) MEDIUM: `handleEditFormSubmit` rollback on rename failure was best-effort (`.catch(() => {})`): if both the delete of the old file and the rollback delete of the new file failed, both files silently survived in the repo and `loadTasks()` was never called, leaving the UI showing the pre-rename task list. Fix: track rollback failure explicitly and throw a descriptive error naming both slugs; call `loadTasks()` in the catch block so the UI reflects actual repo state. 1 regression test added. 494/494 passing (up from 491). Dry streak resets to 0. Commit `58a5dc7`.

## Sprint 75 — 2026-09-06 (day 2 of dry streak)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 491/491. No drift from sprint 74. Unscoped Explore audit scheduled for sprint 76 (next sprint, day 3).

## Sprint 74 — 2026-09-06 (day 1 of new dry streak)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 491/491. No drift from sprint 73. Unscoped Explore audit reserved for day 3 (sprint 76).

## Sprint 73 — 2026-09-06 (Explore audit → 3 bugs fixed, dry streak resets to 0)

**Audit:** Unscoped Explore audit ran per precedent. Full baseline first: format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 490/490. Explore surfaced 3 real correctness bugs, all fixed via TDD. (1) MEDIUM: `getWorkflowRuns` ignored `defaultBranch` param — fetch URL had no `branch` query param, so all-branch runs were returned instead of branch-filtered results. Fix: append `&branch=${encodeURIComponent(branch)}` to the fetch URL. (2) MEDIUM: `ActivityPanel` `runsThisWeek` capped at the fetched page size (max 100) for high-frequency tasks — when the page didn't cover 7 full days the count was wrong without indication. Fix: detect truncation (page full and oldest run is within the week) and render `count+` instead of a confident number. (3) MEDIUM: `useAuth` left a stale token in `sessionStorage` when `getAuthenticatedUser` failed after `storeToken` succeeded — subsequent page loads re-authenticated with a bad token silently. Fix: call `clearToken()` before setting error state in the failure branch. 1 regression test added for stale-token scenario. 491/491 passing (up from 490). Dry streak resets to 0. Commit `9c9303d`.

## Sprint 72 — 2026-09-06 (day 2 of dry streak)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 490/490. No drift from sprint 71. Unscoped Explore audit scheduled for sprint 73 (day 3).

## Sprint 71 — 2026-09-06 (day 1 of new dry streak)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 490/490. No drift from sprint 70. Unscoped Explore audit reserved for day 3 (sprint 73).

## Sprint 70 — 2026-09-06 (Explore audit → 3 bugs fixed, dry streak resets to 0)

**Audit:** Unscoped Explore audit ran per precedent. Full baseline first: format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 489/489. Explore surfaced 3 real correctness bugs, all fixed via TDD. (1) MEDIUM: `TaskList` failed-task banner denominator used `filteredLastRuns.length` (only tasks that had already reported back) instead of `filteredTasks.length` — banner showed "1 of 1 failed" instead of "1 of 10" while other task fetches were still in-flight. Fix: denominator now uses the full filtered task count. (2) MEDIUM: `ActivityPanel` "Total runs" stat tile summed `a.runs.length` capped at the 100-per-task perPage limit — tasks with >100 lifetime runs were silently undercounted. Fix: use `total_count` from the GitHub API response (exposed via new `WorkflowRunsResult` return type). (3) MEDIUM: `fetchRepoAgentConfig` treated any non-ok HTTP response (403 SAML SSO, 401, 500) the same as 404 — agent config files appeared "Not found" even when an auth error blocked access. Fix: throw `"GitHub API error: {status}"` for non-404 errors. 1 regression test added. 490/490 passing (up from 489). Dry streak resets to 0. Commit `8525203`.

## Sprint 69 — 2026-09-06 (day 2 of dry streak)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 489/489. No drift from sprint 68. Unscoped Explore audit scheduled for sprint 70 (day 3).

## Sprint 68 — 2026-09-06 (day 1 of new dry streak)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 489/489. No drift from sprint 67. Unscoped Explore audit reserved for day 3 (sprint 70).

## Sprint 67 — 2026-09-06 (Explore audit → 2 bugs fixed, dry streak resets to 0)

**Audit:** Unscoped Explore audit ran per precedent. Full baseline first: format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 487/487. Explore surfaced 5 findings; 2 confirmed real MEDIUM correctness bugs fixed via TDD. (1) MEDIUM: `ActivityPanel` "Runs this week" and "Total runs" stat tiles showed confident (wrong) numbers when any task workflow fetch errored — `runs.length=0` for errored tasks silently pulled totals down, and the loading guard did not check `a.error`. Fix: extend the loading guard to include `taskActivity.some((a) => a.error !== null)` so tiles show `…` instead of a misleading count. (2) MEDIUM: `TaskRow` initial last-run fetch used `.catch(() => {})` without calling `onLastRunChange` — errored tasks were absent from `lastRuns` entirely, understating the failure banner denominator ("1 of 1 tasks failed last run" instead of "1 of 2" when one task's fetch failed). Fix: call `onLastRunChangeRef.current(task.slug, null)` in the catch so all tasks are counted in the denominator. Remaining 3 from Explore acknowledged and skipped: direction=asc tension in `fetchRunOutput` (already-known sprint-51/64 tradeoff, intentionally left as asc), `storeToken` before user verification (correct behavior for transient failures — token preserved for next-page-load retry), `fetchRunOutput` returns null on empty page-1 on very busy repos (known capacity limit). 489/489 passing (up from 487). Dry streak resets to 0. Commit `8107a75`.

## Sprint 66 — 2026-09-06 (day 2 of dry streak)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 487/487. No drift from sprint 65. Unscoped Explore audit reserved for day 3 (sprint 67).

## Sprint 65 — 2026-09-06 (day 1 of new dry streak)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 487/487. No drift from sprint 64. Unscoped Explore audit reserved for day 3 (sprint 67).

## Sprint 64 — 2026-09-06 (Explore audit → 3 bugs fixed, dry streak resets to 0)

**Audit:** Unscoped Explore audit. Baseline first: format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 486/486. Explore surfaced 3 real MEDIUM correctness bugs, all fixed via TDD. (1) MEDIUM: `useTasks.load()` did not clear tasks on call — stale tasks from previous repo visible during fetch, causing `GettingStarted` onboarding CTA to show wrong state on repo switch. Fix: `setTasks([])` at top of `load()`. 1 regression test added. (2) MEDIUM: `handleEditFormSubmit` non-atomic rename — if `deleteWorkflowFile` failed after `upsertWorkflowFile` succeeded, both old and new workflow files survived in the repo; subsequent `loadTasks()` never fired; user was shown save error but the new file remained. Fix: try/catch around the delete; on delete failure, call `deleteWorkflowFile` on the newly created file as a rollback before re-throwing. (3) MEDIUM: `fetchRunOutput` used `direction=desc` for all three output types (pull_request, new_issue, issue_comment) — when two runs overlapped, the NEWER run's PR/issue/comment was returned for the OLDER run's output request. Fix: `direction=asc` in all three branches; 3 existing tests updated to assert the correct direction. 487/487 passing (up from 486). Dry streak resets to 0.

## Sprint 63 — 2026-09-06 (day 3 of dry streak → 2 bugs fixed)

**Audit:** Unscoped Explore audit ran per precedent. Full baseline first: format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 486/486. Explore surfaced 5 findings; 2 confirmed real bugs fixed via TDD. (1) MEDIUM: `deleteWorkflowFile` threw on 404 GET during a rename — when the old file was already externally deleted, the new file had been written successfully but `handleEditFormSubmit` caught the throw, set "Workflow file not found" error, and left the user on the edit view. Fix: return early on 404 (file already gone is a no-op). Updated existing test that expected a throw. (2) MEDIUM defensive: `secretStatus` not reset eagerly in repo-switch and logout handlers — for one render cycle after switching repos, `GettingStarted` could show stale status from the previous repo. Fix: add `setSecretStatus('loading')` to `onSelect` (RepoPicker), "Switch repo" button handler, and logout handler, batching the reset with the repo change. Remaining 3 acknowledged: LOW directory-listing truncation at 1000+ workflow files (Contents API silently truncates, no `truncated` field), LOW `fetchRunOutput` 100-item cap (no pagination on issue/PR search), LOW unmount guard on poll-loop `fetchRunOutput`. 486/486 passing. Dry streak resets to 0.

## Sprint 62 — 2026-09-06 (day 2 of dry streak)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 486/486. No drift from sprint 61. Unscoped Explore audit scheduled for sprint 63 (day 3).

## Sprint 61 — 2026-09-06 (day 1 of new cycle)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 486/486. No drift from sprint 60. Unscoped Explore audit reserved for day 3 (sprint 63).

## Sprint 60 — 2026-09-06 (day 3 of dry streak → 2 bugs fixed)

**Audit:** Unscoped Explore audit ran per precedent. Full baseline first: format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 482/482. Explore surfaced 3 findings; 2 confirmed real bugs fixed via TDD. (1) HIGH: `fetchRunOutput` returned `null` on non-OK HTTP responses (401/403/500) in all three output-type branches (pull_request, new_issue, issue_comment) — callers treated null as "output not yet found" and showed "No output found" on real API failures. Fix: throw `Error` with status code so catch handlers show the actual error. (2) MEDIUM: `ActivityPanel` catch block zeroed out `prCounts`/`commits`/`prs` on API failure — showed "Open PRs: 0" / "Merged PRs: 0" when API calls failed, falsely implying zero activity. Fix: add `repoError` state; catch sets error message instead of zeros; renders error text in PR/commits sections. 4 regression tests added (3 for fetchRunOutput non-OK branches, 1 for ActivityPanel error state). 486/486 passing (up from 482). Dry streak resets to 0. Commit `29e7444` pushed to Fragment256/githatch.

## Sprint 59 — 2026-09-06 (day 2 of dry streak)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 482/482. No drift from sprint 58. Unscoped Explore audit scheduled for sprint 60 (day 3).

## Sprint 58 — 2026-09-06 (day 1 of new cycle)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 482/482. No drift from sprint 57. Unscoped Explore audit reserved for day 3 (sprint 60).

## Sprint 57 — 2026-09-06 (day 3 of dry streak — Explore audit dry)

**Audit:** Unscoped Explore audit ran per precedent. Full baseline: format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 482/482. Reviewed all source files in `src/lib/` (github.ts, workflows.ts, yamlGenerator.ts, cronLabel.ts, utils.ts, auth.ts, secrets.ts, tools.ts) and all components (ActivityPanel, ToolsPanel, TaskForm, TaskList, AgentConfig, GettingStarted). No correctness bugs found. Dry streak continues.

## Sprint 56 — 2026-09-06 (day 2 of dry streak)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 482/482. No drift. Unscoped Explore audit scheduled for sprint 57 (day 3).

## Sprint 50 — 2026-09-06 (day 2 of dry streak)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 476/476. No drift. Unscoped Explore audit scheduled for sprint 51 (day 3).

## Sprint 49 — 2026-09-06 (day 1 of dry streak)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 476/476. No drift. Unscoped Explore audit reserved for day 3.

## Sprint 48 — 2026-09-06 (day 3 of dry streak → bug fixes)

**Audit:** Unscoped Explore audit ran per precedent. Full baseline first: format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 470/470. Explore surfaced 3 findings; 2 confirmed real bugs fixed via TDD. (1) MEDIUM: `checkToolInstalled` returned `false` for 403/500 — same silent-misidentification pattern as `checkSecretExists` (sprint 39). Fix: throw on non-404 errors. (2) MEDIUM: ActivityPanel "Open PRs" / "Merged PRs" stat tiles counted from the 20 most-recently-updated PRs only — factually wrong on repos with more PRs. Fix: new `getPRCounts` using per_page=1 + Link-header last-page trick for exact open count, and GitHub search API for exact merged count. 6 regression tests added. 476/476 passing. Dry streak resets to 0.

## Sprint 47 — 2026-09-06 (day 2 of dry streak)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 470/470. No drift. Unscoped Explore audit scheduled for sprint 48 (day 3).

## Sprint 46 — 2026-09-06 (day 1 of dry streak)

**Baseline:** format:check clean, lint 0 warnings (--max-warnings=0), type-check clean, test 470/470. No drift. Unscoped Explore audit reserved for day 3.
