# Sprint 563 — Explore audit, cycle 191

**Date**: 2026-09-24
**Tests**: 689/689 (2 new)
**Bugs found**: 2

## Bug 1: scan-all-tracked-js.mjs — SELF_EXEMPT_SET mismatch when invoked from subdirectory

`SELF_EXEMPT_SET` contained bare repo-root-relative paths (e.g. `scripts/scan-suspicious-patterns.mjs`), while `git ls-files` was invoked without a `cwd` option and returns paths relative to `process.cwd()`. When the script was run from any directory other than the repo root (e.g. `cd scripts && node scan-all-tracked-js.mjs`), git returned bare filenames (`scan-suspicious-patterns.mjs`) that never matched the exempt set, causing the scanner to scan itself and emit a false-positive `createRequire` violation.

Fixed: always invoke `git rev-parse --show-toplevel` to obtain the repo root, then pass `cwd: repoRoot` to `git ls-files` and resolve all file paths relative to `repoRoot`. This ensures paths are always repo-root-relative regardless of the caller's cwd.

## Bug 2: TaskList.tsx — fetchingLastRun stuck true when workflowId transitions to undefined mid-fetch

`fetchingLastRun` remained `true` permanently when `task.workflowId` transitioned from a truthy value to `undefined` while a `getWorkflowRuns` call was in flight. The early-return branch (`if (!task.workflowId) return`) exited the `useEffect` without calling `setFetchingLastRun(false)`, and the cancelled in-flight fetch's `.then()`/`.catch()` handlers also bailed without resetting the flag. This left internal state inconsistent for the duration of the "Registering…" window.

Fixed: added `setFetchingLastRun(false)` before the early return so the flag is reset whenever `workflowId` disappears.
