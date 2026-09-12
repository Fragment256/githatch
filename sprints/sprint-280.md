# Sprint 280 log — Day 3 Explore audit

**Date:** 2026-09-12
**Sprint:** 280 (day 3 of cycle 93 — Explore audit)
**Status:** 4 bugs fixed.

## Baseline checks

- `format:check`: clean
- `type-check`: clean
- `lint` (--max-warnings=0): clean
- `test`: 589/589 ✓ (+3)

## Explore audit findings

4 correctness bugs fixed via TDD:

**(1) MEDIUM — ConfirmDialog.tsx: loadingRef synced via useEffect (one-render lag)**

`loadingRef.current` updated in a `useEffect` — runs after paint, leaving a one-frame window where Escape could bypass the loading guard. Fix: inline assignment `loadingRef.current = loading` directly in render body. Standard React ref-sync pattern; no behavioral change in jsdom tests.

**(2) MEDIUM — App.tsx: saveError not cleared before YAML fetch**

`handleDuplicateTask` and `handleEditTask` called `setSaveError(null)` inside the `try` block, after the `await fetchFileContent(...)`. A prior error stayed visible in the tasks view for the entire fetch duration. Fix: move `setSaveError(null)` before the `await` in both handlers. 1 regression test (RED→GREEN).

**(3) MEDIUM — TaskList.tsx: trash button not disabled during triggering/polling**

The trash icon button had no `disabled` guard. All other action buttons (Edit, Duplicate, Pause, Run now) are guarded. A user could open the delete dialog while a trigger was in-flight, deleting the workflow file out from under a running job. Fix: `disabled={triggering || polling}` + `disabled:opacity-50`. 1 regression test (RED→GREEN).

**(4) LOW — App.tsx: saveError survives Tools/Activity tab switches**

Tools and Activity tab `onClick` handlers did not call `setSaveError(null)`. Switching away and back to Tasks caused the stale error banner to reappear. Fix: add `setSaveError(null)` to both tab handlers. 1 regression test (RED→GREEN).

3 false positives dismissed:

- TaskList prevRunIdRef race (very narrow window, React 18 silent no-op — previously dismissed)
- workflows.ts fetchRunOutput pagination cap (impractical — previously dismissed)
- useAuth.ts token before validation (no data integrity failure — previously dismissed)

Dry streak resets to 0.

**Next sprint:** 281 (day 1 — baseline, cycle 94).
