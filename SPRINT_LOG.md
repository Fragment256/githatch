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
