# Sprint 361 — Explore audit, cycle 121

Date: 2026-09-18
Cycle: 121
Day: 3

## Baseline

- format:check: PASS
- lint: 0 warnings PASS
- type-check: PASS
- tests: 622/622 PASS

## Explore audit

Full read of all 34 source files (hooks, lib, components, App.tsx, main.tsx).

**Result: DRY — no new correctness bugs found.**

One candidate finding investigated and ruled out:

- `TaskList.tsx` delete button missing `editLoading` in `disabled` prop — initially flagged as inconsistent with History/Prompt/Toggle/Run buttons. Applying the fix caused 1/622 tests to fail: the sprint 310 regression test (`cancels an in-flight edit fetch when task is deleted via onRefresh`) explicitly covers the case where delete IS allowed while `editLoading` is true (delete triggers `onRefresh` which increments `editLoadRequestId`, cancelling the stale fetch). Omission is intentional — reverted.

Files audited:

- hooks/useAuth.ts — sessionRevRef guard, login() try/catch ✓
- hooks/useTasks.ts — requestId guard, optimistic tasks ✓
- hooks/useRepo.ts — localStorage, react-query, setActiveRepo ✓
- hooks/useTheme.ts — ✓
- components/TaskList.tsx — latestRunIdRef, isMountedRef, resolvedEnabledRef, handleDelete unconditional (intentional, see sprint 310 test) ✓
- components/TaskForm.tsx — submittingRef, preview flow ✓
- components/AgentConfig.tsx — requestIdRef ✓
- components/SecretsView.tsx — disabled during checking ✓
- components/RepoPicker.tsx — Enter guard ✓
- components/TokenSetup.tsx — requestIdRef, phase transitions ✓
- components/ToolsPanel.tsx — requestIdRef, handleInstall ✓
- components/ActivityPanel.tsx — taskKeys memo, tasksRef.current ✓
- components/GettingStarted.tsx — localStorage check ✓
- lib/workflows.ts — fetchAllActionWorkflows, fetchRunOutput ✓
- lib/cronLabel.ts — canPreviewCron range exclusion, nextCronRun ✓
- lib/yamlGenerator.ts — generateWorkflowYaml, parseOutputDestination ✓
- lib/github.ts — upsertWorkflowFile, listPushableRepos, fetchRepoAgentConfig ✓
- lib/auth.ts — PKCE flow ✓
- lib/secrets.ts — encryptSecret, putRepoSecret ✓
- lib/utils.ts — LCS diff algorithm ✓
- lib/tools.ts — ✓
- lib/templates.ts — ✓
- App.tsx — editLoadRequestId, logout handler ✓

All prior fixes (sprints 301–355) stable. Dry streak extends (cycle 120 Explore: dry; cycle 121 Explore: dry).

## Notes

622/622 stable. Dry audit — no fixes committed this sprint.

## Next heartbeat

Sprint 362 — cycle 122, day 1 baseline.
