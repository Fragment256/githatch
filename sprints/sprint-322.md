# Sprint 322 — Day 3 Explore audit, cycle 107

Date: 2026-09-17
Cycle: 107
Day: 3

## Baseline

- format:check: PASS
- lint: PASS (0 warnings)
- type-check: PASS
- tests: 607/607 PASS (pre-fix)

## Explore audit

Full review of all 34 non-test source files. 2 MEDIUM bugs fixed.

### BUG 1 — MEDIUM: `canPreviewCron` does not filter hour/minute range expressions

**File:** `src/lib/cronLabel.ts` line 149
**Before:** No filter for `-` ranges in hour/minute fields.
**After:** `if (hour.includes('-') || minute.includes('-')) return false`

`isValidCronField` accepts range patterns like `0-6` as valid cron. `canPreviewCron` filtered commas and `*/N` patterns but not `-` ranges. `nextCronRun` hits the `!/^\d+$/.test(hour)` guard at line 67 and returns null for any hour/minute range. Result: `canPreviewCron('0 0-6 * * *')` returned `true` while `nextCronRuns` returned `[]`, causing `SchedulePreview` to display a misleading empty-preview message for valid cron expressions.

1 regression test (RED→GREEN).

### BUG 2 — MEDIUM: `handleTrigger` reads stale React state to set `prevRunIdRef.current`

**File:** `src/components/TaskList.tsx` line 473
**Before:** `prevRunIdRef.current = lastRun?.id ?? null` — reads stale React closure.
**After:** `prevRunIdRef.current = latestRunIdRef.current` — reads a ref that is always current.

Race window: initial fetch microtask sets `prevRunIdRef.current = 100`, then React queues a re-render (macrotask). If the user clicks Run Now between these two steps, `handleTrigger` reads `lastRun = null` (stale closure) and overwrites `prevRunIdRef.current = null`. Polling then finds the pre-existing run (id=100 ≠ null) and treats it as the newly triggered run, potentially fetching and displaying output from the wrong execution.

Fix: introduced `latestRunIdRef` — a ref (never stale) that mirrors the latest known `run.id` from the initial fetch and polling effect. `handleTrigger` snapshots `latestRunIdRef.current` instead of `lastRun?.id`. `latestRunIdRef` is also updated in the polling effect when a new run is first detected, ensuring subsequent triggers get the correct baseline without relying on React state.

1 regression test (RED→GREEN).

### Dismissed (3 LOWs)

- **TaskList.tsx line 572 (LOW):** Edit/Duplicate buttons enabled during polling — user can navigate away, abandoning polling silently. UX issue, no data corruption. Dismissed: navigation is an intentional affordance; Sprint 316 already added the symmetric toggling guards on Run Now and Pause.
- **workflows.ts line 292 (LOW):** Lexicographic ISO date comparison fragile against API format changes. Dismissed: GitHub's API has been consistent for years; adding a format-normalization step would add complexity for a theoretical future risk.
- **cronLabel.ts line 67 (LOW):** `nextCronRun` returns null for ranges — root cause of BUG 1, already fixed by fixing `canPreviewCron`.

## Commits

- `d55f791` — fix: sprint 322 — canPreviewCron hour/minute ranges (MEDIUM), handleTrigger stale prevRunIdRef (MEDIUM)

## Notes

2 regression tests added (RED→GREEN). 609/609 post-fix. Dry streak resets to 0.

**Next sprint:** 323 (day 1 — baseline, cycle 108).
