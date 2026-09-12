# Sprint 283 log — Day 3 Explore audit

**Date:** 2026-09-12
**Sprint:** 283 (day 3 of cycle 94 — Explore audit)
**Status:** 2 bugs fixed.

## Baseline checks

- `format:check`: clean
- `type-check`: clean
- `lint` (--max-warnings=0): clean
- `test`: 590/590 ✓ (+1 new regression test)

## Explore audit findings

Audited all 34 non-test source files via 3 parallel Explore agents.

### Fixed

- **LOW: `GettingStarted.tsx` — stale `dismissed` on repo switch** (`dismissedFor` approach).
  - Old: `useState(lazy-init) + useEffect` — one-frame stale `dismissed` after repo switch. Dismissed repo A → switch to repo B → banner invisible for one frame before effect fires (or vice versa).
  - Fix: `const [dismissedFor, setDismissedFor] = useState<string | null>(null)` + synchronous `isDismissed = dismissedFor === repoFullName || localStorage.getItem(...)`. No stale frame. Removed unused `useEffect`.
  - Existing test at line 122 covers the repo-switch case.

- **LOW: `workflows.ts:112` — missing Array.isArray guard on Contents API response** (defensive).
  - If `.github/workflows` resolves to a file object (not an array), `files.filter(...)` throws TypeError. Same defensive guard already present in `github.ts:196-202`.
  - Fix: `if (!Array.isArray(contentsData)) return []` before cast.
  - 1 new regression test added.

### False positives / dismissed

- `useTasks.ts` optimistic preservation — FALSE POSITIVE. The `setTasks([])` + async `.then` pattern is correct for React 18 batched usage (`load()` + `addTask()` in same `act()`). Test suite validates both behaviors. Reverting fix was required (broke "clears tasks immediately" test).
- `cronLabel.ts:60` — FALSE POSITIVE. Agent confused "every N hours from last fire" with cron `*/N` semantics ("hours where hour%N==0"). Code correctly returns midnight for cross-midnight rollover (0 % N == 0).
- `ErrorBoundary.tsx "Try again"` — DISMISSED. React remounts children on boundary clear (transitions between error UI and children always involve unmount/remount). Key trick adds marginal benefit for edge cases not present in this codebase.
- `TaskList.tsx prevRunIdRef race` — DISMISSED (same as sprint 274): theoretical, requires >8s GitHub API latency.

## Commits

- `efd2779` — fix: sprint 283 Explore audit — 2 correctness bugs (590/590)

**Next sprint:** 284 (day 1 — baseline, cycle 95).
