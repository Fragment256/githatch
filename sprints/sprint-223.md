# Sprint 223 log — Explore audit

**Date:** 2026-09-11
**Sprint:** 223 (day 3 of cycle 75 — Explore audit)
**Status:** 4 bugs fixed. 570/570 tests passing (+1 new test).

## Baseline checks

- `format:check`: clean
- `type-check`: clean
- `lint` (--max-warnings=0): clean
- `test`: 570/570

## Bugs found and fixed

| #   | Severity | File                               | Summary                                                                                             |
| --- | -------- | ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | HIGH     | `src/hooks/useTasks.ts`            | `setTasks(result)` in `load()` overwrote optimistic tasks during GitHub eventual-consistency window |
| 2   | MEDIUM   | `src/components/TaskList.tsx`      | `onRefresh()` called without `isMountedRef` guard in `handleDelete` after await                     |
| 3   | MEDIUM   | `src/hooks/useRepo.ts`             | `setActiveRepo` recreated every render, creating stale closure in `useEffect` deps                  |
| 4   | MEDIUM   | `src/components/ActivityPanel.tsx` | `tasks` array reference change re-triggered full workflow-run re-fetch on every render              |

**Not fixed (false positive):**

- Bug 2 from audit (TaskList `enabled` sync): `useEffect([task.enabled])` only fires on VALUE change, not object reference change — no actual regression path exists.

## Fix detail

1. **useTasks HIGH**: Changed `setTasks(result)` to a functional updater that preserves any optimistic task whose slug is absent from the server response. When GitHub propagates the new file, the server result includes the slug and the optimistic entry is silently dropped. Added two regression tests.

2. **TaskList handleDelete MEDIUM**: Added `if (isMountedRef.current)` guard before `onRefresh()` call, consistent with all other post-await callbacks in the function.

3. **useRepo MEDIUM**: Wrapped `setActiveRepo` in `useCallback([])` to stabilise the reference; added it to the deps arrays of both `useEffect` hooks.

4. **ActivityPanel MEDIUM**: Derived a stable `taskKeys` string (slugs + workflowIds joined) via `useMemo`. The task-fetching effect now depends on `taskKeys` instead of the `tasks` array reference. Tasks are accessed via `tasksRef.current` inside the effect to avoid stale closures.

## Commit

`2b0b350` — fix: sprint 223 Explore audit — 4 correctness bugs (570/570)

**Next sprint:** 224 (day 1 baseline, new cycle).
