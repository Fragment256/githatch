# Sprint 325 — Day 3 Explore audit, cycle 108

Date: 2026-09-17
Cycle: 108
Day: 3

## Baseline

- format:check: PASS
- lint: PASS (0 warnings)
- type-check: PASS
- tests: 610/610 PASS (+1)

## Explore Audit

Files audited: cronLabel.ts, yamlGenerator.ts, TaskForm.tsx, AgentConfig.tsx, useTasks.ts, templates.ts, tools.ts

### Findings reviewed

**Agent findings:** 4 (HIGH×1, MEDIUM×2, LOW×1)

- HIGH: useTasks.ts setTasks([]) wipes optimistic tasks — **FALSE POSITIVE**. App.tsx already calls `load()` before `addTask()` (sprint 151 fix); React 18 batching ensures the functional updater from addTask runs last, preserving the optimistic task.
- MEDIUM: TaskForm.tsx initialConfig not re-applied on prop change — **FALSE POSITIVE**. App.tsx passes `key={editingTask?.slug}` causing full remount when task changes; useState initializer re-runs on every mount.
- MEDIUM: TaskForm.tsx blank custom-cron bypasses validation — **CONFIRMED BUG**. See below.
- LOW: cronLabel.ts Sunday appended out of calendar order for `1-7` range — **FALSE POSITIVE**. `1-7` means Mon→Sun; "Monday, ..., Saturday, Sunday" IS the correct sequential calendar-order display for that range.

### Bug fixed

**MEDIUM: `TaskForm.tsx` — blank custom-cron expression silently creates manual-only task**

Failure scenario: user selects "Custom cron…" from the schedule dropdown but leaves the input blank. `customCronInvalid` is computed as `schedule==='custom' && resolvedSchedule.length > 0 && !isValidCron(resolvedSchedule)` — the `resolvedSchedule.length > 0` guard means an empty expression is NOT flagged as invalid. Submit button stays enabled. On submit, `resolvedSchedule || undefined` evaluates to `undefined`, and the task is saved as manual-only with no error shown — directly contrary to the user's explicit intent.

Fix: added `if (values.schedule === 'custom' && !resolvedSchedule) return setError('Enter a cron expression, or choose a different schedule.')` at the top of `handleSubmit`.

1 regression test (RED→GREEN). Commit `2168126`.

## Notes

Dry streak resets to 0. Next sprint: 326 (day 1 — baseline, cycle 109).
