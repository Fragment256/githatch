# Sprint 304 log — Explore audit (cycle 101)

**Date:** 2026-09-17
**Sprint:** 304 (day 3 of cycle 101 — Explore audit)
**Status:** 1 MEDIUM bug fixed. 598/598 (+1).

## Baseline checks

- `format:check`: clean
- `type-check`: clean
- `lint` (--max-warnings=0): clean
- `test`: 598/598 ✓ (up from 597 after fix)

## Explore audit findings

### MEDIUM: `useAuth.ts` — logout race restores token on non-401 network error

**File**: `src/hooks/useAuth.ts` line 101  
**Bug**: The `.catch()` handler for the stored-token validation path checked `if (cancelled) return` but did NOT check `sessionRevRef.current !== myRev`. The `cancelled` flag is only set by effect cleanup on unmount — logout increments `sessionRevRef.current` but never sets `cancelled`. So if:

1. User has stored token, `getAuthenticatedUser(stored)` is in-flight
2. User clicks logout → sessionRevRef incremented, token cleared, state set to logged-out
3. The in-flight call throws a non-401 error (e.g. network timeout)
4. `.catch()` fires, sees `cancelled === false`, calls `setState({ token: stored, user: null, error: 'Could not reach GitHub...' })` — restoring the old token to React state after logout

**Fix**: Added `|| sessionRevRef.current !== myRev` guard to `.catch()`, matching the `.then()` handler.  
**Test**: 1 regression test (RED→GREEN).

## Notes

Dry streak resets to 0 (1 MEDIUM bug found and fixed).

**Next sprint:** 305 (day 1 — baseline, cycle 102).
