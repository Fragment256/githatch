# Sprint 157 log — day 3 Explore audit

**Date:** 2026-09-10
**Sprint:** 157 (day 3 of cycle 53 — Explore audit)
**Status:** 3 bugs found and fixed. 549/549 tests passing.

## Baseline checks

- `format:check`: clean
- `type-check`: clean
- `lint` (--max-warnings=0): clean
- `test`: 547/547 (pre-audit)

## Bugs found and fixed

### 1. MEDIUM — TaskList.tsx: stale `onLastRunChange` after TaskRow unmount

**Location:** `src/components/TaskList.tsx` lines 344-361 (initial last-run fetch effect)

**Bug:** The `useEffect` that fetches the last workflow run for a TaskRow had no cleanup function. When the repo changed and the old TaskRow unmounted, the in-flight `getWorkflowRuns` promise still held a reference to `onLastRunChangeRef.current`. Because no new request fired on the unmounted instance, `id === fetchLastRunRequestId.current` remained true — the staleness guard did not bail. The resolved promise wrote the old repo's run data into the parent's `lastRuns` state under the shared slug, potentially showing a phantom failure banner for the new repo.

**Fix:** Added `let cancelled = false` + `return () => { cancelled = true }` cleanup. Both the `.then()` and `.catch()` branches now check `cancelled` before calling `onLastRunChangeRef.current`.

**Test:** `TaskList > last-run status badge > does not write stale last-run to parent when TaskRow unmounts before its initial fetch resolves` (RED→GREEN)

---

### 2. LOW — AgentConfig.tsx: stale panel after token change

**Location:** `src/components/AgentConfig.tsx` line 93 (reset useEffect dep array)

**Bug:** The reset `useEffect` (which sets `config=null`, `open=false`) only listed `[owner, repo]` as deps. A token change (re-authentication) did not trigger the reset. The fetch effect's `config !== null` guard then bailed, leaving stale data from the previous session visible when the user reopened the panel.

**Fix:** Added `token` to `}, [owner, repo, token])`.

**Test:** `AgentConfig > resets panel on token change so stale config is not shown when user reopens` (RED→GREEN)

---

### 3. LOW (defensive) — App.tsx: missing `key` on edit-task TaskForm

**Location:** `src/App.tsx` line 535 (edit-task `<TaskForm>`)

**Bug:** The edit-task `<TaskForm>` had no `key` prop. The new-task form uses a key (template/dup slug). Without a key, if `editingConfig` changes while `view === 'edit-task'` stays true, the lazy `useState` initializer would not re-run, showing stale form fields for the wrong task. Currently prevented by the view-based conditional unmount, but the missing key is a latent hazard.

**Fix:** Added `key={editingTask?.slug ?? 'edit'}` for defensive parity.

**No test added** (the scenario requires App-level rendering with mocked auth; the fix is a one-liner with no behavioral change under current App flow).

## Commit

`638ef6b fix: sprint 157 Explore audit — 3 bugs fixed (549/549)`

## Comparison with previous Explore audits

| Sprint | Day | Bugs fixed      |
| ------ | --- | --------------- |
| 148    | 3   | 1 MEDIUM        |
| 151    | 3   | 3 MEDIUM        |
| 154    | 3   | 1 LOW           |
| 157    | 3   | 2 LOW, 1 MEDIUM |
