# Sprint 310 log — Explore audit (cycle 103)

**Date:** 2026-09-17
**Sprint:** 310 (day 3 of cycle 103 — Explore audit)
**Status:** 3 bugs fixed (1 MEDIUM, 2 LOW). 603/603 (+3).

## Baseline checks

- `format:check`: clean
- `type-check`: clean
- `lint` (--max-warnings=0): clean
- `test`: 603/603 ✓ (up from 600 after fixes)

## Explore audit findings

### MEDIUM: `UserMenu.tsx` + `App.tsx` — logout not blocked during in-flight save

**Files**: `src/components/UserMenu.tsx`, `src/App.tsx`  
**Bug**: `UserMenu` had no `disabled` prop. The logout button was always clickable, including while `saving=true`. Clicking logout called `++editLoadRequestId.current`, which invalidated the save handler's id guard. In a rename scenario where `upsertWorkflowFile` succeeded but both `deleteWorkflowFile` (old slug) and the rollback `deleteWorkflowFile` (new slug) also failed, the catch block's `id === editLoadRequestId.current` check evaluated to `false` after the logout increment, silently swallowing the critical "both files now exist" error. Both the old-slug and new-slug workflows remained active in the repo with no user notification.  
**Fix**: Added `disabled?: boolean` prop to `UserMenu`; passed `disabled={saving}` from `App.tsx`. Logout button cannot be clicked during in-flight save.  
**Test**: 1 regression test (updated existing test to reflect new invariant: logout is blocked during save, save completes normally, loadTasks/addTask called).

### LOW: `TaskForm.tsx` — "← Edit" button not disabled during loading

**File**: `src/components/TaskForm.tsx` line 304  
**Bug**: In the YAML preview screen, the "Commit to repo" button had `disabled={loading}`, but the "← Edit" button had no `disabled` attribute. After clicking "Commit to repo" (`loading` becomes `true`), the user could still click "← Edit" to navigate back to the form, change values (provider, model, prompt, output destination), wait for loading to reset to `false`, and submit again — generating a different YAML and committing a second time. The version the user approved in the preview step was committed first, then a second commit with potentially different YAML overwrote it.  
**Fix**: Added `disabled={loading}` to the "← Edit" button.  
**Test**: 1 regression test (RED→GREEN).

### LOW: `App.tsx` — `onRefresh` prop not cancelling in-flight edit fetch

**File**: `src/App.tsx` line ~437 (`onRefresh` passed to `TaskList`)  
**Bug**: `onRefresh` (called by `TaskList` after a successful delete) only called `loadTasks()`, but did not increment `editLoadRequestId.current`. If the user clicked Edit on a task and then immediately deleted the same task (race possible on slow connections), the in-flight `handleEditTask` fetch could resolve after the delete completed. The `id === editLoadRequestId.current` guard still passed (delete never invalidated the id), so `setView('edit-task')` and `setEditingTask(task)` fired — opening an edit form for a task that was just deleted. Submitting the form would silently re-create the deleted workflow file in the repo.  
**Fix**: Changed `onRefresh` from `onRefresh={loadTasks}` to `onRefresh={() => { ++editLoadRequestId.current; loadTasks() }}`.  
**Test**: 1 regression test (RED→GREEN).

## Dismissed

No additional dismissals this sprint beyond those from sprint 307.

## Notes

Dry streak resets to 0 (3 bugs found and fixed).

**Next sprint:** 311 (day 1 — baseline, cycle 104).
