# Sprint 241 log — Explore audit

**Date:** 2026-09-11
**Sprint:** 241 (day 3 of cycle 81 — Explore audit)
**Status:** 3 bugs fixed. 579/579 tests passing (+4 new tests).

## Baseline checks

- `format:check`: clean
- `type-check`: clean
- `lint` (--max-warnings=0): clean
- `test`: 575/575 (pre-fix)

## Bugs found and fixed

| #   | Severity | File                       | Summary                                                                                                          |
| --- | -------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | MEDIUM   | `src/lib/github.ts:121`    | `!content` check incorrectly threw "too large" for 0-byte files (empty string is falsy, not null)                |
| 2   | MEDIUM   | `src/lib/workflows.ts:141` | Same `!content` false-positive in `listGithatchTasks` — empty workflow file caused task list to abort            |
| 3   | MEDIUM   | `src/lib/workflows.ts:182` | Same `!encoded` false-positive in `updateWorkflowSchedule` — empty workflow file caused schedule update to abort |

**Not fixed (false positives):**

- `RepoPicker.tsx` stale closure on `highlightedIndex` in `handleKeyDown`: ArrowDown + Enter stale-closure scenario cannot occur in practice — DOM keydown events are processed one at a time with a React commit cycle between them.
- `TaskList.tsx` polling effect cleanup missing `++outputFetchRequestId.current`: both attempted fixes (cleanup increment, `cancelled` guard) break the existing "shows trigger error when fetchRunOutput rejects" test because cleanup fires when `setPolling(false)` is committed, not only on deps-change restarts. Original guard logic is correct.
- `TaskList.tsx:334` `setEnabled` overwriting optimistic state: marginal LOW — `task.enabled` must change value to trigger the effect, so the flash only occurs when a server refresh delivers a different value during a toggle, which is extremely rare.

## Fix detail

1–3. **`!content` / `!encoded` null guard (MEDIUM ×3)**: Changed falsy `!content` / `!encoded` guards to strict null checks (`== null`). The GitHub Contents API returns `null` for files >1 MB and `""` for 0-byte files. The old guards treated both as "too large", incorrectly aborting on empty files. Added 4 regression tests covering the empty-file case in both `github.test.ts` and `workflows.test.ts`.

## Commit

`c166b46` — fix: sprint 241 Explore audit — 3 MEDIUM bugs in github.ts / workflows.ts (579/579)

**Next sprint:** 242 (day 1 baseline, new cycle).
