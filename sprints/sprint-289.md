# Sprint 289 log — Day 3 Explore audit

**Date:** 2026-09-12
**Sprint:** 289 (day 3 of cycle 96 — Explore audit)
**Status:** 2 bugs fixed, 2 regression tests added.

## Baseline checks

- `format:check`: clean
- `type-check`: clean
- `lint` (--max-warnings=0): clean
- `test`: 592/592 ✓ (+2 from sprint 288)

## Explore audit findings

Audited all 34 non-test source files via 2 parallel Explore agents. Core logic files (App.tsx, useTasks.ts, github.ts, workflows.ts, yamlGenerator.ts) clean. 2 bugs confirmed in components.

### Fixed

- **MEDIUM: `TaskList.tsx:333–344` — enabled state flicker after toggle resolves**
  - After `disableWorkflow`/`enableWorkflow` resolves and sets `enabled=false/true`, a parent poll firing with stale `task.enabled` (GitHub not yet propagated) caused the `useEffect` to snap the local state back, producing a Resume→Pause→Resume visual flicker.
  - Fix: `resolvedEnabledRef` tracks the committed local state; the `useEffect` skips parent sync until `task.enabled` matches the committed value, then clears the ref. On error, ref is never set, so parent sync resumes normally.
  - 1 regression test: stale parent rerender after API resolves does not flip Resume back to Pause.

- **LOW: `TaskForm.tsx:238–244` — double-submit on rapid "Commit to repo" clicks**
  - Two synchronous clicks before the `loading` prop propagated back both passed the `disabled={loading}` check and called `onSubmit` twice (same event-loop tick).
  - Fix: `submittingRef` gate in `handleConfirmCommit`; resets via `useEffect` when `loading` goes false.
  - 1 regression test: double-click calls `onSubmit` exactly once.

### False positives / dismissed

- All core logic files (App.tsx, useTasks.ts, github.ts, workflows.ts, yamlGenerator.ts): clean per targeted Explore agent.
- All components not listed above: clean per full components Explore agent.

## Commits

- `c69a042` — fix: sprint 289 Explore audit — enabled flicker and double-submit guards

**Next sprint:** 290 (day 1 — baseline, cycle 97).
