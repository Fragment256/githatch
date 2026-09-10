# Sprint 178 log — day 3 Explore audit

**Date:** 2026-09-10
**Sprint:** 178 (day 3 of cycle 60 — Explore audit)
**Status:** 3 bugs found and fixed. 559/559 tests passing.

## Baseline checks

- `format:check`: clean
- `type-check`: clean
- `lint` (--max-warnings=0): clean
- `test`: 555/555 (pre-audit)

## Bugs found and fixed

### 1. HIGH — App.tsx: About button click during in-flight save permanently disabled Back button

**Location:** `src/App.tsx` lines 234–238 (About button onClick handler)

**Bug:** The About button handler incremented `editLoadRequestId.current` (to cancel stale YAML fetches) but did not call `setSaving(false)`. The `finally` block in both `handleTaskFormSubmit` and `handleEditFormSubmit` guards `setSaving(false)` with `if (id === editLoadRequestId.current)`. After the About click increments the counter, this guard fails — `saving` stays `true` permanently. Returning to a new-task or edit-task form shows the Back button disabled (`disabled={saving}`) and the TaskForm receives `loading={true}`, making the form unsubmittable. The logo button already correctly called `setSaving(false)`; only the About button was missing it.

**Fix:** Added `setSaving(false)` to the About button handler, matching the logo button pattern.

**Test:** `App — task form submission > About button click during in-flight save does not permanently disable Back button on next form` (RED→GREEN)

---

### 2. MEDIUM — ActivityPanel.tsx: repoLoading incorrectly gated task-run stat tiles

**Location:** `src/components/ActivityPanel.tsx` lines 176–180 (stat tile rendering)

**Bug:** The condition for whether to show '…' for numeric stat tiles (Runs this week, Total runs) included `repoLoading` alongside `taskActivity.some(a => a.loading)`. `repoLoading` reflects whether `getRecentCommits`/`getRecentPRs`/`getPRCounts` have finished — these are completely independent of `taskActivity` (workflow run data). Including `repoLoading` caused "Runs this week" and "Total runs" to show '…' even after all `getWorkflowRuns` fetches completed, blocking display for as long as the repo API calls took.

**Fix:** Removed `repoLoading` from the `typeof value === 'number'` guard. PR tiles already show '…' naturally via `prCounts?.open ?? '…'` when unloaded.

**Test:** `ActivityPanel > shows task-run stat tiles immediately when workflow runs resolve, even if repo API is still loading` (RED→GREEN)

---

### 3. LOW — yamlGenerator.ts: parseOutputDestination returned `filePath: ''` when path= absent

**Location:** `src/lib/yamlGenerator.ts` lines 104–107 (file type branch)

**Bug:** When a workflow YAML contains `# githatch:output_type=file` without a `path=` argument (e.g. manual edit), `parseOutputDestination` returned `{ type: 'file', filePath: '' }`. Two callers mishandled empty filePath: `fetchRunOutput` in `workflows.ts` produced the URL `https://github.com/owner/repo/blob/main/` (GitHub 404), and `buildPromptWithOutput` in `yamlGenerator.ts` emitted `git add  && git commit -m "chore: update "` — a bare `git add` staging all unstaged files. The `issue_comment` type already handled its analogous case (missing `issue=#N`) by warning and falling back to `new_issue`.

**Fix:** Added the same guard for the `file` type: warn via `console.warn` and return `{ type: 'new_issue' }` when `filePath` is empty.

**Tests:** `parseOutputDestination > falls back to new_issue when file annotation has no path= argument` and `> logs a console.warn when file annotation has no parseable path` (both RED→GREEN)

## Commit

`9f3e9b3 fix: sprint 178 Explore audit — 3 bugs fixed (559/559)`

## Comparison with recent Explore audits

| Sprint | Day | Bugs fixed              |
| ------ | --- | ----------------------- |
| 169    | 3   | 1 MEDIUM, 1 LOW         |
| 172    | 3   | 1 LOW                   |
| 175    | 3   | 3 bugs                  |
| 178    | 3   | 1 HIGH, 1 MEDIUM, 1 LOW |
