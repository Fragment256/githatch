# Sprint 292 log — Day 3 Explore audit

**Date:** 2026-09-12
**Sprint:** 292 (day 3 of cycle 97 — Explore audit)
**Status:** 2 bugs fixed. 2 false positives / dismissed. 2 regression tests added.

## Baseline checks

- `format:check`: clean
- `type-check`: clean
- `lint` (--max-warnings=0): clean
- `test`: 594/594 ✓ (+2 regression tests)

## Bugs fixed

### MEDIUM — `TokenSetup.tsx:105` `handleSave` not guarded with `requestIdRef`

`handleSave` called `setPhase('done')` and `setPhase('error')` unconditionally after the async
`putRepoSecret` resolved. If `owner`/`repo`/`token` props changed while the PUT was in flight,
the effect cleanup incremented `requestIdRef.current` but `handleSave` did not check it — the
stale result would set `done` state on the component now showing a different repo in context.

Fix: capture `const saveId = ++requestIdRef.current` at the top of `handleSave` and guard both
`setPhase` branches with `if (saveId !== requestIdRef.current) return`.

Regression test added: `stale handleSave does not show done state after owner/repo changes mid-flight`.

### LOW — `ConfirmDialog.tsx:29` `useEffect` for `open=true` missing cleanup

The `useEffect` called `el.showModal()` when `open` became `true` but returned no cleanup
function. In React StrictMode's double-invocation sequence, the first effect opened the dialog;
the cleanup pass was a no-op so the dialog remained open; the second invocation called
`showModal()` again and threw `DOMException: The dialog is already open.`

Fix: add `return () => { if (el.open) el.close() }` inside the `if (open)` branch so StrictMode's
cleanup pass closes the dialog before the effect re-runs.

Regression test added: `effect cleanup closes the dialog so a re-invoked showModal does not throw`.

## Dismissed / false positives

- **App.tsx rename rollback error message**: misleading error text when rollback succeeds, but
  user's edits remain in the open form (no data loss). UX issue only — dismissed.
- **TaskList.tsx `outputRequestId` re-mount race**: stale in-flight fetch matching fresh-mount
  request id. Requires sub-second unmount/remount sequence with specific id collision. Dismissed
  (same as sprint 274/289 prior assessments).

## Notes

Hooks/lib audit: DRY — no findings (14 files cleared).
Components audit: 2 bugs confirmed, 2 dismissed.

**Next sprint:** 293 (day 1 — baseline, cycle 98).
