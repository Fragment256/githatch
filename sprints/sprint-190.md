# Sprint 190 log — day 3 Explore audit

**Date:** 2026-09-10
**Sprint:** 190 (day 3 of cycle 64)
**Status:** 4 bugs fixed. 561/561 tests passing.

## Baseline checks

- `format:check`: clean
- `type-check`: clean
- `lint` (--max-warnings=0): clean
- `test`: 561/561

## Bugs fixed

Root pattern: missing `useEffect` cleanup functions in components using the request-ID cancellation guard. The in-effect counter correctly guards against stale _concurrent_ requests, but without a cleanup function, unmounting does not invalidate the current request generation — any in-flight promise whose `id === ref.current` check passes will call `setState` on an already-destroyed component.

**MEDIUM `ActivityPanel.tsx` — task-runs effect (lines 72–112):**
No cleanup on the effect that fans out N parallel `getWorkflowRuns` calls. On unmount while fetches are in flight, all callbacks proceed and call `setTaskActivity` on the unmounted component. Under rapid Activity↔Tasks navigation this produces interleaved state updates that land on the wrong component instance.
Fix: `return () => { ++taskRequestId.current }` at end of effect.

**MEDIUM `ActivityPanel.tsx` — repo-activity effect (lines 114–140):**
No cleanup on the `Promise.all` over 3 GitHub API calls (`getRecentCommits`, `getRecentPRs`, `getPRCounts`). Same unmount race as above, affecting `setCommits`, `setPRs`, `setPRCounts`, `setRepoLoading`, `setRepoError`.
Fix: `return () => { ++repoRequestId.current }` at end of effect.

**LOW `TaskList.tsx` — RunHistoryPanel fetchRuns effect (lines 172–174):**
No cleanup on the single `getWorkflowRuns` call. If user opens history panel then immediately closes it while fetch is in flight, the stale response can overwrite fresh data from the next open.
Fix: `return () => { ++fetchRunsRequestId.current }` at end of effect.

**LOW `TokenSetup.tsx` — checkSecretExists effect (lines 88–99):**
No cleanup on the `checkSecretExists` call. Narrow window under slow network: if user clicks "Done" before the check returns, the delayed response sets `phase` on the unmounted component. React 18 discards the update silently in production but strict-mode double-invoke reveals the guard gap.
Fix: `return () => { ++requestIdRef.current }` at end of effect.

Note: `AgentConfig.tsx` has the same structural pattern but the `react-hooks/exhaustive-deps` lint rule did not fire for its cleanup (the rule behaves differently when `requestIdRef.current` is mutated inline via `(requestIdRef.current += 1)` in the effect body vs. read-then-use). Cleanup still added defensively; no eslint-disable comment needed.

## Comparison with recent Explore audits

| Sprint | Day | Bugs fixed                                                                 |
| ------ | --- | -------------------------------------------------------------------------- |
| 175    | 3   | 3 bugs (sessionStorage, setSaving race, yamlGenerator fallback)            |
| 178    | 3   | 3 bugs (HIGH useAuth cancellation, MEDIUM SecretsView, LOW github.ts null) |
| 181    | 3   | clean                                                                      |
| 184    | 3   | clean                                                                      |
| 187    | 3   | 2 bugs (useAuth, describeCron)                                             |
| 190    | 3   | 4 bugs (missing cleanup in ActivityPanel×2, TaskList, TokenSetup)          |

**Next sprint:** 191 (day 1 of new cycle).
