# Sprint 337 — Explore audit, cycle 112

Date: 2026-09-17
Cycle: 112
Day: 3

## Baseline

- format:check: PASS
- lint: 0 warnings
- type-check: PASS
- tests: 618/618 PASS

## Explore audit — 3 bugs fixed

Commit: `ebcccee`

### Bug 1 — MEDIUM: TaskList.tsx Edit/Duplicate/Pause/Resume missing `|| polling`

Edit, Duplicate, and Pause/Resume buttons were guarded against `deleting || toggling || triggering` but not `polling`. Run and Delete already included `|| polling`. During active run output polling (started by handleTrigger), clicking Edit or Duplicate navigates away from TaskList, silently dropping the polling interval and the in-flight outputFetchRequestId; clicking Toggle races against the active poll.

Fix: add `|| polling` to disabled on all three buttons.

### Bug 2 — MEDIUM: No editLoading state during handleEditTask/handleDuplicateTask fetch

handleEditTask and handleDuplicateTask awaited a GitHub API call (`fetchFileContent`) but produced no loading state — Edit and Duplicate buttons remained fully enabled during the in-flight request. Rapid double-click fired two concurrent requests; clicking Edit on task A then immediately Edit on task B before A resolved sent two API calls and silently cancelled A's result via editLoadRequestId.current (no visual feedback).

Fix: added `editLoading` state, set true before await and cleared in finally. Passed as new prop to TaskList → TaskRow, added `|| editLoading` to Edit and Duplicate disabled. Updated App.test.tsx to test the new invariant (buttons disabled during load) rather than the old two-concurrent-click scenario.

### Bug 3 — MEDIUM: TemplatePicker not disabled during save (TaskForm key reset)

In the new-task view, TemplatePicker had no `disabled` prop. While `saving` was true (commit-to-repo in-flight), clicking a TemplatePicker button called `setSelectedTemplate(t)`, which changed the `key` on TaskForm, unmounting and remounting it — losing the form state mid-save, resetting the double-submit guard, and showing the wrong template's config when the save errored.

Fix: added `disabled?: boolean` prop to TemplatePicker (with `disabled:opacity-50` style on all three buttons), passed `disabled={saving}` from App.tsx — matching the Back button treatment on the same screen.

## Next heartbeat

Sprint 338 — day 1 baseline, cycle 113.
