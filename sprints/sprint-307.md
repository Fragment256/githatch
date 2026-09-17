# Sprint 307 log — Explore audit (cycle 102)

**Date:** 2026-09-17
**Sprint:** 307 (day 3 of cycle 102 — Explore audit)
**Status:** 2 bugs fixed. 600/600 (+2).

## Baseline checks

- `format:check`: clean
- `type-check`: clean
- `lint` (--max-warnings=0): clean
- `test`: 600/600 ✓ (up from 598 after fixes)

## Explore audit findings

### MEDIUM: `RepoPicker.tsx` — Enter key fires `onSelect` when dropdown is closed

**File**: `src/components/RepoPicker.tsx` line 53  
**Bug**: The `Enter` branch of `handleKeyDown` had no guard on `open`. After selecting a repo via keyboard (which calls `setOpen(false)`), the input remains focused. Pressing Enter again found `filtered[highlightedIndex]` still valid (filter uses the current query = selected repo's full_name, so `filtered[0]` resolves to the same repo) and called `select(repo)` a second time — triggering `onSelect` spuriously without user intent.  
**Fix**: Added `if (!open) return` at the top of the Enter branch.  
**Test**: 1 regression test (RED→GREEN).

### LOW: `useAuth.ts` — code exchange branch not guarded by `sessionRevRef`

**File**: `src/hooks/useAuth.ts` line 53  
**Bug**: The stored-token path correctly guards all callbacks with `sessionRevRef.current === myRev` so that logout (which increments `sessionRevRef`) prevents stale callbacks from restoring auth state. The code exchange path used only `cancelled` (set on unmount, never on logout), leaving a gap: if the user called `logout()` while an OAuth code exchange was in flight, the exchange could resolve after logout and call `storeToken` + `setState` with the new token, silently re-authenticating against the user's intent.  
**Fix**: Added `const myRev = ++sessionRevRef.current` before `exchangeCodeForToken` and added `|| sessionRevRef.current !== myRev` guards to all callbacks, matching the stored-token pattern.  
**Test**: 1 regression test (RED→GREEN).

## Dismissed

- ActivityPanel.tsx `!workflowId` path missing `id` guard: false positive — the forEach runs synchronously within the effect body; there are no async callbacks on this path so no stale-closure risk.
- TaskList.tsx `prevRunIdRef` null baseline race: previously dismissed sprint 289 (theoretical, >8s latency required).
- useTasks.ts `setTasks([])` optimistic dead code: previously dismissed sprint 283/289 (intentional React 18 design, no production impact reported).
- TaskList.tsx delete button not guarded on `toggling`: LOW, considered but deferred (transient UX glitch only, no data loss).
- TaskList.tsx `handleLastRunChange` not memoized: performance, not a correctness bug.
- GettingStarted.tsx `localStorage` SecurityError in sandboxed iframe: edge case, app is not deployed in sandboxed iframes.
- ToolsPanel.tsx install button shown on check error: LOW, already handled via `checkError` display; label ambiguity is cosmetic.

## Notes

Dry streak resets to 0 (2 bugs found and fixed).

**Next sprint:** 308 (day 1 — baseline, cycle 103).
