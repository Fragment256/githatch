# Sprint 509 — Explore audit, cycle 173

Date: 2026-09-20
Cycle: 173
Day: 3 (Explore audit)

## Baseline

- format:check: PASS
- lint: 0 warnings PASS
- type-check: PASS
- tests: 655/655 PASS (+2 regression tests)
- security scan: eslint.config.js clean (no payload)

## Audit

Full read of all 34 non-test source files.

### Finding 1 — LOW: `useTasks.ts` — stale in-flight load overwrites new repo's task list

**Root bug**: The `[owner, repo]` cleanup effect cleared tasks and error but did not increment
`requestId.current`. Any `load()` in flight for the old repo still held an `id` equal to the
unchanged `requestId.current`, so its `.then()` callback was not suppressed — it wrote the old
repo's tasks into state for the new repo.

The existing test (ignores stale response after load() for new repo) covered the case where
`load()` was immediately called after the repo switch (which increments the counter). The uncovered
case: repo changes, no `load()` is yet called, old fetch resolves and corrupts state.

**Fix**: Increment `requestId.current` and reset `setLoading(false)` in the repo-change effect.

**1 regression test (RED→GREEN)**: discards in-flight load when repo changes without a subsequent
`load()` call.

### Finding 2 — LOW: `TaskList.tsx` — `resolvedEnabledRef` clears prematurely on rapid double-toggle

**Root bug**: After a rapid A→B→A double-toggle, `resolvedEnabledRef.current` held the committed
value `A`. A stale poll with `task.enabled = A` (pre-first-toggle data) coincidentally matched,
cleared the guard, and left the component unguarded. When GitHub then propagated toggle-1 (showing
`B`), the unguarded effect accepted it and briefly showed the wrong state.

**Fix**: Replaced the `boolean | null` ref with `{ expected: boolean; needIntermediate: boolean } | null`.
When a second toggle fires while the first is unconfirmed, `needIntermediate` is set to `true`,
requiring the intermediate value (the first toggle's propagated state) to be observed before the
guard accepts the final value. Single-toggle behaviour is unchanged.

**1 regression test (RED→GREEN)**: verifies the guard holds through a complete A→B→A double-toggle
cycle until both GitHub propagations arrive.

### Findings dismissed

- `ActivityPanel.tsx` useState initializer always overridden by first effect → extra render (minor
  perf, no incorrect behaviour).
- `App.tsx` slug recomputation: `slugify(config.name)` in both TaskForm and App.tsx use identical
  input (`values.name.trim()`) — no observable divergence possible.
- `cronLabel.ts` setUTCHours(24) overflow: JavaScript Date normalises to midnight next day
  correctly — not a bug.

## Security situation (unchanged)

CLAUDE_CODE_OAUTH_TOKEN rotation and githatch #44 decision remain pending (Luke-only actions).
Attacker retains GitHub push access. Branch protection still not enabled on main.

## Next heartbeat

Sprint 510 — day 1 baseline, cycle 174.
