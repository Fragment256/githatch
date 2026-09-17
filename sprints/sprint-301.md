# Sprint 301 log — Explore audit (3 MEDIUM bugs fixed)

**Date:** 2026-09-17
**Sprint:** 301 (day 3 of cycle 100 — Explore audit)
**Status:** 3 MEDIUM correctness bugs fixed via TDD. Dry streak resets to 0.

## Baseline checks

- `format:check`: clean
- `type-check`: clean
- `lint` (--max-warnings=0): clean
- `test`: 597/597 ✓ (+3 from sprint 300)

## Bugs fixed

### (1) MEDIUM — `yamlGenerator.ts` `parsePromptFromYaml` captures trailing workflow steps

The regex `/ {10}prompt: \|\n([\s\S]+)$/` captured everything from `prompt: |` to
end-of-file. A workflow YAML with a second step after the Claude agent step (e.g.
`githatch-senior-engineer-daily-sprint.yml` has a "Verify sprint left a durable trace"
step at line 152) had that step's raw YAML appended verbatim to the parsed prompt.
For `agent_managed` tasks, the `\n\nWhen done,` marker stripping does not apply, so
the trailing YAML content was preserved in the round-tripped prompt.

**Fix:** Changed regex to `/ {10}prompt: \|\n((?:[ ]{11,}[^\n]*\n?|[ ]*\n)*)/)` — only
captures lines with ≥11 spaces of indentation (the block scalar content level) or
empty lines, stopping before any line that returns to ≤10 spaces.

**Test:** 1 regression test (RED→GREEN) added to `yamlGenerator.test.ts`.

### (2) MEDIUM — `useAuth.ts` logout race restores token/user after logout

`logout()` called `clearToken()` + `setState({ token: null })` but did not cancel the
in-flight `getAuthenticatedUser(stored)` call. The `.then()` callback's only guard was
`if (!cancelled)` where `cancelled` is only set on component unmount — so if the user
logged out during token validation, the callback would still fire and call
`setState({ token: stored, user, ... })`, restoring the logged-out state.

**Fix:** Added `sessionRevRef` (useRef counter). The stored-token effect captures
`myRev = ++sessionRevRef.current` and only fires setState if `sessionRevRef.current === myRev`.
`logout()` increments the ref first, invalidating any in-flight callback.

**Test:** 1 regression test (RED→GREEN) added to `useAuth.test.ts`.

### (3) MEDIUM — `TaskList.tsx` `isMountedRef` broken by React 18 StrictMode

The cleanup-only `useEffect([], [])` set `isMountedRef.current = false` on unmount but
had no reset to `true` on remount. React 18 StrictMode (active in dev) runs every
effect twice: mount → cleanup (sets false) → remount (no reset). After the first cycle,
`isMountedRef.current` was permanently `false`. All post-await guards in `handleTrigger`,
`handleToggle`, and `handleDelete` silently no-op'd: the trigger button stayed showing
"triggering…" forever, errors were never shown, and `onRefresh` was never called.
Production was unaffected (StrictMode is dev-only).

**Fix:** Added `isMountedRef.current = true` at the start of the effect body so the
remount phase explicitly resets it.

**Test:** 1 regression test (RED→GREEN) added to `TaskList.test.tsx`.

## Commit

- Fix commit: `a60df6b` — pushed to `Fragment256/githatch`
- Sprint log: this file

**Next sprint:** 302 (day 1 — baseline, cycle 101).
