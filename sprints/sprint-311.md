# Sprint 311 log — Explore audit (cycle 104)

**Date:** 2026-09-17
**Sprint:** 311 (day 1 of cycle 104 — Explore audit)
**Status:** 5 bugs fixed (1 MEDIUM, 4 LOW). 603/603 (unchanged — no new tests needed for pagination fix).

## Baseline checks

- `format:check`: clean
- `type-check`: clean
- `lint` (--max-warnings=0): clean
- `test`: 603/603 ✓

## Explore audit findings

### MEDIUM: `workflows.ts` — `fetchRunOutput` misses output on page 2+ for busy repos

**Files**: `src/lib/workflows.ts`  
**Bug**: `fetchRunOutput` made a single `per_page=100` request for `pull_request`, `new_issue`, and `issue_comment` output types. The GitHub `since` parameter filters by `updated_at` (not `created_at`), so pre-existing items that were recently touched could fill the first 100 results before the bot's newly created item appeared. If the target item landed on page 2+, the function silently returned `null` — surfacing as "No output found for this run" even when output existed. Rare on small repos, realistic on busy ones with >100 issues/comments.  
**Fix**: Added `parseNextUrl` helper; replaced single-fetch with `while (url && !item)` Link-header pagination loop in all three output-type branches. Loop exits on first match (no over-fetching).  
**Test**: Existing mock responses updated to include `headers: { get: () => null }` (18 occurrences) so the pagination path resolves cleanly. No new tests needed — existing URL-param tests now exercise the full pagination loop.

### LOW: `TaskList.tsx` — Pause/Resume button not disabled during delete

**File**: `src/components/TaskList.tsx` line 598  
**Bug**: Pause/Resume `disabled={toggling}` omitted `|| deleting`. When `ConfirmDialog` confirmed deletion and `deleting` became `true`, assistive technology and headless test runners could still reach and activate the toggle button, firing `disableWorkflow`/`enableWorkflow` against a task already being deleted. Some browser/AT combinations bypass modal focus trapping for background focusable elements.  
**Fix**: Changed to `disabled={toggling || deleting}`.

### LOW: `TaskList.tsx` — Delete button not disabled during delete

**File**: `src/components/TaskList.tsx` line 613  
**Bug**: Delete button `disabled={triggering || polling}` omitted `|| deleting`. Inconsistent with Edit/Duplicate buttons which correctly include `deleting`. While the modal traps pointer clicks, AT and headless runners could re-trigger `setConfirmDelete(true)` or call `deleteWorkflowFile` twice.  
**Fix**: Changed to `disabled={triggering || polling || deleting}`.

### LOW: `ActivityPanel.tsx` — stale task display name after YAML rename

**File**: `src/components/ActivityPanel.tsx`  
**Bug**: `taskActivity` state was initialized from `tasksRef.current` only when `taskKeys` (slug:workflowId string) changed. If a task's YAML display name was edited on GitHub without changing its slug or workflowId, `taskKeys` stayed stable, the init effect didn't re-run, and `a.task.displayName` remained frozen at the old value. Sparklines showed stale names until the next slug/workflowId change.  
**Fix**: Added `displayNameBySlug` `useMemo` over the live `tasks` prop; render uses `displayNameBySlug.get(task.slug) ?? task.displayName` so the displayed name is always live.

### LOW: `TaskList.tsx` — `handleLastRunChange` recreated on every render

**File**: `src/components/TaskList.tsx` line 707  
**Bug**: `handleLastRunChange` was an inline arrow function (not `useCallback`). Each `setLastRuns` call re-rendered `TaskList`, creating a new `handleLastRunChange` reference, which propagated as a changed prop to all N `TaskRow` children, triggering full re-renders of all rows. With N tasks each polling on an 8-second interval, this produced O(N²) renders per polling cycle.  
**Fix**: Wrapped with `useCallback(() => setLastRuns(prev => ...), [])`. Functional updater captures no external state, so deps stay empty.

## Notes

Dry streak resets to 0 (5 bugs found and fixed).

**Next sprint:** 312 (day 2 — baseline, cycle 104).
