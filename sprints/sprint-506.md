# Sprint 506 — Explore audit, cycle 172

Date: 2026-09-20
Cycle: 172
Day: 3 (Explore audit)

## Baseline

- format:check: PASS
- lint: 0 warnings PASS
- type-check: PASS
- tests: 653/653 PASS (+1 regression test)
- security scan: clean (1 JS file tracked)

## Audit

Full read of all 34 non-test source files.

### Finding 1 — LOW: `AgentConfig.tsx` — toggle button not disabled during loading + stuck loading state

**Root bug**: `setLoading(false)` was in `.finally()` with an id check. When `.then()` called `setConfig(result)`, React's effect cleanup could fire (incrementing `requestIdRef.current`) before `.finally()` ran. This caused the id check in `.finally()` to fail, leaving `loading` stuck at `true` even after a successful fetch.

**Secondary issue**: The toggle button had no `disabled` prop during loading, so a user could click to close the accordion while a fetch was in-flight, staling the request without clearing the loading state.

**Fix**: Moved `setLoading(false)` from `.finally()` into `.then()` (before `setConfig`) and `.catch()` (before `setError`). Added `disabled={open && loading}` to the toggle button — prevents close while open and loading, which would stale the request without clearing loading state.

**1 regression test (RED→GREEN)**: toggle button is disabled while a fetch is in progress.

### Finding 2 — dismissed: `workflows.ts` line 103 — extra pagination page

Proposed fix (`total_count ?? Infinity`) is functionally identical to existing code for all realistic inputs. Not a bug.

## Security situation (unchanged)

CLAUDE_CODE_OAUTH_TOKEN rotation and githatch #44 decision remain pending (Luke-only actions). Attacker retains GitHub push access — second force-push injection detected 2026-09-17, removed in commit `6634725`. Branch protection still not enabled on main.

## Next heartbeat

Sprint 507 — day 1 baseline, cycle 173.
