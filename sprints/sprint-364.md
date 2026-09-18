# Sprint 364 — Explore audit, cycle 122 day 3

Date: 2026-09-18
Cycle: 122
Day: 3 (Explore audit)

## Baseline

- format:check: PASS
- lint: 0 warnings PASS
- type-check: PASS
- tests: 622/622 PASS

## Bugs found and fixed

**useTasks.ts — optimistic task wipeout on manual reload (CONFIRMED)**

`setTasks([])` was called before the fetch in `load()`, defeating the `prev.filter` merge logic in the `.then()` callback that was meant to preserve in-flight optimistic tasks. If a user created a task (via `addTask`) and then triggered a reload before GitHub propagated the new file, the optimistic task vanished. Fix: remove `setTasks([])`, introduce `isOptimistic: true` flag on `GithatchTask` so the merge logic can distinguish locally-added tasks from server-returned ones.

**App.tsx — token! non-null assertions on AgentConfig and TaskList (CONFIRMED)**

`AgentConfig` (line 441) and `TaskList` (line 449) used `token!` inside the outer `user && activeRepo && isMainView` guard, which does not include `token`. All other components in the same block (ToolsPanel, ActivityPanel, SecretsView) use explicit `token &&` guards. Fixed to `view === 'tasks' && token &&` on both renders.

## Commit

95483a9 fix: optimistic task preservation and token null-assertion in tasks view

## Next heartbeat

Sprint 365 — cycle 123, day 1 baseline.
