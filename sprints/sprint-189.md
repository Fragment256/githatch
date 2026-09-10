# Sprint 189 log — day 2 baseline + bug fix

**Date:** 2026-09-10
**Sprint:** 189 (day 2 of cycle 64)
**Status:** 1 LOW bug fixed. 561/561 tests passing.

## Baseline checks

- `format:check`: clean
- `type-check`: clean
- `lint` (--max-warnings=0): clean (after fix)
- `test`: 561/561

## Bug fixed

**LOW `useRepo.ts`:** `activeRepo` missing from `useEffect` dependency array (line 43).

Sprint 187 Explore audit added a `useEffect` to validate `activeRepo` against the resolved repo list:

```ts
useEffect(() => {
  if (!reposQuery.data || !activeRepo) return
  const accessible = reposQuery.data.some((r) => r.full_name === activeRepo.full_name)
  if (!accessible) setActiveRepo(null)
}, [reposQuery.data]) // ← activeRepo missing
```

ESLint `react-hooks/exhaustive-deps` flagged it during sprint 189 baseline lint. The stale closure means: if `activeRepo` changes while `reposQuery.data` is unchanged (e.g. user picks a different repo while the list is cached), the validation does not re-run. Fix: add `activeRepo` to the dependency array. Adding it is safe — when `setActiveRepo(null)` fires, `activeRepo` becomes null, the effect re-runs and returns early on `!activeRepo`.

This warning was present since sprint 187 but was not surfaced in sprint 188 baseline (likely a lint runner issue in that heartbeat). Caught and fixed in sprint 189.

## Comparison with recent Explore audits

| Sprint | Day | Bugs fixed              |
| ------ | --- | ----------------------- |
| 175    | 3   | 3 bugs                  |
| 178    | 3   | 1 HIGH, 1 MEDIUM, 1 LOW |
| 181    | 3   | clean                   |
| 184    | 3   | clean                   |
| 187    | 3   | 2 bugs                  |
| 189    | 2   | 1 LOW (lint warning)    |

**Next sprint:** 190 (day 3 — Explore audit due).
