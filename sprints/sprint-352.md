# Sprint 352 — Day 3 Explore audit, cycle 118

Date: 2026-09-17
Cycle: 118
Day: 3

## Baseline

- format:check: PASS
- lint: 0 warnings PASS
- type-check: PASS
- tests: 622/622 PASS

No drift from sprint 351.

## Explore Audit

Full read of all 34 source files (hooks, lib, components, App.tsx, main.tsx).

**Luke's fix commit `30b74d2` reviewed and confirmed correct:**

- `useAuth.ts`: try/catch around `buildAuthUrl` in `login()` — correct
- `TaskForm.tsx`: `submittingRef.current = false` reset in `handleSubmit` before `setPending` — correctly handles the case where `onSubmit` returns early without setting `loading=true`

**No new correctness bugs found.** 16 candidates examined and dismissed:

- `useAuth.ts`: login() does not reset error state before redirect — intentional (page navigates away on success)
- `useTasks.ts`: optimistic task merge on stale request — guarded by requestId correctly
- `TaskRow`: `lastRun.id === prevRunIdRef.current` in JSX using ref — correct, ref set synchronously before `polling=true` state update
- `TaskRow` polling: stale `run.id === prevRunIdRef.current` check — uses `latestRunIdRef` (sprint 322 fix) correctly
- `RunHistoryPanel`: cleanup-only `useEffect` for `outputRequestId` — correct pattern
- `ActivityPanel`: `taskRequestId` shared across concurrent fetches — intentional (all share same request set)
- `ActivityPanel`: `runsThisWeekTruncated` heuristic — intentional approximation, not a bug
- `useRepo`: potential infinite loop on `setActiveRepo` in effect — analyzed, convergent (terminates after one update)
- `workflows.ts`: `patchScheduleInYaml` regex `\non:[\s\S]*?\n+permissions:` — correct for standard YAML files
- `workflows.ts`: `since` filter date comparison as string — correct for ISO 8601 format
- `github.ts`: `btoa(unescape(encodeURIComponent(yaml)))` — standard UTF-8 base64 pattern, correct
- `github.ts`: `getPRCounts` with `per_page=1` Link header trick — handles 0 and 1 PR cases correctly
- `App.tsx`: `editLoadRequestId` shared across `handleEditTask`, `handleDuplicateTask`, `handleEditFormSubmit`, `handleTaskFormSubmit` — intentional (prevents concurrent edit/save operations)
- `App.tsx`: rename rollback logic — correctly reverses new file creation on old file delete failure
- `App.tsx`: `loadTasks()` before `addTask()` ordering — comment explains React 18 batching rationale, correct
- `TaskForm.tsx`: `submittingRef.current` reset happens in `handleSubmit` (form resubmit path) not `handleBackToEdit` — intentional; user must re-submit form to clear guard, preventing accidental double-commit from back-button alone

All prior fixes (sprints 301, 304, 307, 316, 319, 322, 325, 328, 331, 332, 337, 338, 341, 347, 349) stable. Dry streak extends.

## Notes

622/622 stable. Audit dry.

## Next heartbeat

Sprint 353 — cycle 119, day 1 baseline.
