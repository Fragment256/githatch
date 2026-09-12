# Sprint 274 log — Day 3 Explore audit

**Date:** 2026-09-12
**Sprint:** 274 (day 3 of cycle 91 — Explore audit)
**Status:** 3 LOW bugs fixed.

## Baseline checks

- `format:check`: clean
- `type-check`: clean
- `lint` (--max-warnings=0): clean
- `test`: 586/586 ✓ (+1 regression test)

## Explore audit findings

Full review of 32 non-test source files via 2 parallel Explore agents.

### Fixed

| Severity | File              | Bug                                                                                                                                                                                                                                                                 |
| -------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LOW      | `cronLabel.ts`    | `nextCronRuns` cursor shared same Date reference as `results[]`. External mutation of a returned date corrupts subsequent iteration. Fix: `cursor = new Date(next)`. 1 regression test added.                                                                       |
| LOW      | `AgentConfig.tsx` | Cleanup effect (owner/repo/token change) reset `config`, `open`, `error` but not `loading`. Stale `true` persisted after a mid-fetch repo switch; next open saw no-op `setLoading(true)` instead of clean start. Fix: `setLoading(false)` in cleanup.               |
| LOW      | `App.tsx`         | `handleEditFormSubmit` success path omitted `setEditingOriginalYaml(null)`. Stale YAML from previous edit session persisted in state. Latent — no active read path, but creates a correctness hazard for future callers. Fix: added `setEditingOriginalYaml(null)`. |

### False positives dismissed

- `useTasks.ts` `setTasks([])`: flagged as dead-code optimistic guard. Confirmed intentional — `load()` + `addTask()` are always called in the same React 18 batch in `handleTaskFormSubmit`; the functional updater receives `[]` from the batch, then `addTask` appends. Existing test (`optimistic addTask is visible before fetch resolves`) verifies correct behaviour. Not a bug.
- `TaskList.tsx` `prevRunIdRef` race: flagged as stale-null baseline if user clicks "Run now" before initial fetch completes. Practical exposure requires >8s GitHub API latency (poll interval is 8s). Code comment at line 368 already acknowledges and partially mitigates the case. Theoretical; no fix warranted.
- `App.tsx` rename rollback error message: flagged as misleading when rollback deletes non-existent file. Behavior is correct; error message accurately reflects original delete failure. False positive.

## Commit

`55f5eda` — pushed to Fragment256/githatch.

**Next sprint:** 275 (day 1 — baseline, cycle 92).
