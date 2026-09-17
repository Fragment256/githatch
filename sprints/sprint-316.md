# Sprint 316 log — day 3 Explore audit (cycle 105)

**Date:** 2026-09-17
**Sprint:** 316 (day 3 of cycle 105 — Explore audit)
**Status:** 3 MEDIUM/LOW bugs fixed. 607/607 (+3).

## Baseline checks

- `format:check`: clean
- `type-check`: clean
- `lint` (--max-warnings=0): clean
- `test`: 607/607 ✓ (pre-fix: 604/604)

## Bugs fixed

All three in `TaskList.tsx` — symmetric missing `toggling`/`triggering` guards in `TaskRow`.

### BUG 1 — MEDIUM: Run now not disabled during toggle in-flight (line 606)

**Before:** `disabled={triggering || !enabled || polling || deleting}`
**After:** `disabled={triggering || !enabled || polling || deleting || toggling}`

Concrete failure: clicking Run now while `disableWorkflow` is still in-flight races the toggle — either GitHub rejects the dispatch (disable wins first) or `setEnabled(false)` fires while polling is active, leaving `enabled=false` + `polling=true` simultaneously.

### BUG 2 — MEDIUM: Pause/Resume not disabled during trigger in-flight (line 598)

**Before:** `disabled={toggling || deleting}`
**After:** `disabled={toggling || deleting || triggering}`

Concrete failure: clicking Pause during an in-flight `triggerWorkflow` call either disables the workflow before the run dispatches (run executes against a task the UI shows as paused) or `setEnabled(false)` fires after polling has already started.

### BUG 3 — LOW: Delete not disabled during toggle in-flight (line 613)

**Before:** `disabled={triggering || polling || deleting}`
**After:** `disabled={triggering || polling || deleting || toggling}`

Concrete failure: concurrent `deleteWorkflowFile` + `disableWorkflow`/`enableWorkflow` race on the same workflow resource. ConfirmDialog provides a natural delay so severity is lower, but the race is real.

## Commits

- `7a5304f` — fix: add missing toggling guard to Run now, Pause/Resume, and delete buttons (3 regression tests, RED→GREEN)

## Notes

3 regression tests added (RED→GREEN). All 24 files audited. No false positives from known-list. Dry streak resets to 0.

**Next sprint:** 317 (day 1 — baseline, cycle 106).
