# Sprint 349 — Explore audit, cycle 117

Date: 2026-09-17
Cycle: 117
Day: 3 (Explore audit)

## Baseline

- format:check: PASS
- lint: 0 warnings PASS
- type-check: PASS
- tests: 622/622 PASS (+3 from this sprint)

## Explore Audit Findings

3 findings, all in `TaskList.tsx` `TaskRow`. All confirmed via code review.

### MEDIUM: Pause/Resume missing `|| editLoading` guard (line 604)

**File**: `src/components/TaskList.tsx:604`

Edit and Duplicate buttons both guard on `|| editLoading`. Pause/Resume did not. A user could click Pause while a YAML fetch is in flight; if the YAML GET completes first, `setView('edit-task')` fires and the TaskRow unmounts mid-toggle. The toggle state (enabled/disabled) was changed on GitHub but the UI never reflects it — user edits a task without knowing its enabled state just changed. Inconsistency with the Edit/Duplicate guards indicates accidental omission.

**Fix**: added `|| editLoading` to Pause/Resume `disabled` prop.

### MEDIUM: Run Now missing `|| editLoading` guard (line 612)

**File**: `src/components/TaskList.tsx:612`

Same race. User clicks Run Now while YAML fetch is in flight. YAML GET completes first, `setView('edit-task')` fires, TaskRow unmounts. `triggerWorkflow()` completes after unmount → `if (!isMountedRef.current) return` → `setTriggered(true)` and `setPolling(true)` never called. Workflow was dispatched to GitHub and is running, but UI provides zero feedback — no "Triggered!" flash, no polling loop, run invisible in-app.

**Fix**: added `|| editLoading` to Run Now `disabled` prop.

### MEDIUM: handleDelete calls `onRefresh` conditionally on `isMountedRef.current`

**File**: `src/components/TaskList.tsx:520`

Delete button was intentionally kept clickable during editLoading (sprint 310 design: delete → onRefresh → cancels stale edit fetch). But `handleDelete` called `onRefresh()` only inside `if (isMountedRef.current)`. In the narrow race where the YAML GET completes before `deleteWorkflowFile` returns, `setView('edit-task')` fires, TaskRow unmounts, and `isMountedRef.current = false`. The delete completed on GitHub but `onRefresh` was never called: task list stays stale (ghost entry visible), `editLoadRequestId` not incremented, edit form open for the just-deleted task. Submitting that form silently re-creates the deleted workflow file.

**Fix**: removed `isMountedRef.current` gate from `onRefresh()` call — it's now called unconditionally on delete success. State updates (setDeleting, setConfirmDelete) remain guarded.

## Notes

- Dry streak broken: 3 bugs fixed (sprint 345 had 0 bugs).
- All 3 bugs were missing `editLoading`-aware guards — symmetric cluster, same root cause as sprint 337 findings.
- App.test.tsx `getPRCounts` mock gap discovered (line 19): `ActivityPanel` uses `getPRCounts` from `@/lib/github` but `App.test.tsx` vi.mock does not include it. This caused intermittent test failure in `cancels an in-flight edit fetch when task is deleted via onRefresh`. Not related to this sprint's changes; pre-existing. Noted but not fixed — test was passing in sprint 348, gap only triggered by test ordering. Logged for next sprint.

## Next heartbeat

Sprint 350 — cycle 118, day 1 baseline.
