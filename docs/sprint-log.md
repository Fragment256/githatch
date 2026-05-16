# Sprint Log

Agent-maintained. One entry per daily sprint run.

---

## 2026-05-14

- Action: pr-review
- Summary: Reviewed all 5 open PRs (#9–#13, project scaffold through Contents API persistence); approved 4, requested changes on #12 (console.debug leftover); all PRs noted as conflicting with main and recommended for closure since code is already committed to main.
- PR: #9, #10, #11, #12, #13
- ROADMAP updated: no

## 2026-05-14 (sprint 2)

- Action: pr-closed | roadmap
- Summary: Closed 5 stale conflicting PRs (#9–#13, all superseded by main); then implemented top ROADMAP item — 12 Playwright E2E smoke tests covering landing, repo picker, task list, create task, and trigger task.
- PR: #17
- ROADMAP updated: yes

## 2026-05-14 (sprint 3)

- Action: pr-review | pr-addressed | pr-merged
- Summary: Reviewed and approved PR #17 (Playwright E2E smoke tests); fixed CI formatting failure on ROADMAP.md and sprint workflow YAML; waited for green CI then squash-merged and deleted branch.
- PR: #17
- ROADMAP updated: yes

## 2026-05-15

- Action: ci-fix
- Summary: Fixed CI failure on main — `pnpm format:check` was failing because `ActivityPanel.tsx` had a trailing whitespace issue; ran Prettier and pushed fix directly to main.
- Rationale: CI was broken on main; fixing it is the top priority before any feature or backlog work can be considered green.
- PR: n/a
- ROADMAP updated: no

## 2026-05-16

- Action: roadmap
- Summary: Extracted `describeCron` to a testable `src/lib/cronLabel.ts` module, fixed `ScheduledRow` which was showing raw cron strings instead of human-readable labels, and added a schedule preview in `TaskForm` (shows cron expression for presets, human-readable label for custom cron).
- Rationale: ScheduledRow was showing raw cron strings (`0 9 * * 1`) while TaskRow showed human-readable labels — a UX inconsistency that confused users; this was the highest-value unimplemented UX fix with no open issues or roadmap backlog items to pick from. Chose over dark mode (cosmetic) and other nice-to-haves because it fixes an actual displayed bug.
- PR: #18
- ROADMAP updated: yes
