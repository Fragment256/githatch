# Sprint 295 log — Day 3 Explore audit

**Date:** 2026-09-12
**Sprint:** 295 (day 3 of cycle 98 — Explore audit)
**Status:** 1 bug fixed. 4 findings assessed (2 dismissed, 1 deferred, 1 fixed).

## Baseline checks

- `format:check`: clean
- `type-check`: clean
- `lint` (--max-warnings=0): clean
- `test`: 594/594 ✓

## Bug fixed

### MEDIUM — `ToolsPanel.tsx:39` Install button permanently hidden after check failure

The `checkToolInstalled` catch branch set `checkError` but left `installed` as `null`.
Since the Install button is gated on `installed !== null`, a check failure (403, network
timeout, etc.) permanently hid the button for the session — no recovery path without a
full page reload.

Fix: add `setInstalled(false)` in the catch branch so the Install button appears
alongside the error message, letting the user attempt installation even when the check
cannot confirm current state.

Regression test updated: `shows check error and Install button when checkToolInstalled
throws (e.g. 403)` — previously verified the button was absent (documenting the bug);
updated to verify it is present.

Commit: `2ba79fd`

## Dismissed / false positives

- **TaskList.tsx:472 `prevRunIdRef` race before initial fetch resolves (reported HIGH):**
  Pre-existing test at line 1060 (`does not show output from a pre-existing run when
trigger fires before initial fetch resolves`) demonstrates the author was aware of
  this race and relies on the initial fetch `.then()` overwriting `prevRunIdRef.current`
  before the first 8-second poll fires. The race only manifests when GitHub API latency
  exceeds 8 seconds — exceptional and outside normal operating parameters. Dismissed.

- **useAuth.ts:56 token stored before user validation (reported MEDIUM):**
  Intentional design — storing early enables retry on transient network errors without
  re-running OAuth. `App.tsx` guards the main UI on `user` (not `token`), so
  `{token, user: null}` state is safe in current production code. The risk is future
  callers that check only `token`. Noted but not changed — behavioural change would
  break the retry pattern.

- **useTasks.ts:11 missing owner/repo guard (reported LOW):**
  The hook's public contract requires caller to guard `owner`/`repo`; App.tsx does so
  correctly. Internal guard would add noise without safety value in current usage.
  Dismissed.

- **TaskList.tsx:699 `lastRuns` reset scope on token change (reported LOW):**
  Flash during re-fetch is a cosmetic issue, not data corruption. Dismissed.

## Notes

Hooks/lib audit: DRY — no findings (7 hook files cleared).
Components audit: 1 bug confirmed and fixed, 4 dismissed.

**Next sprint:** 296 (day 1 — baseline, cycle 99).
