# Sprint 343 — Explore audit, cycle 115 (day 2)

Date: 2026-09-17
Cycle: 115
Day: 2 (Explore audit)

## Baseline

- format:check: PASS
- type-check: PASS
- tests: 619/619 PASS

## Audit

Full read of all 32 source files (hooks, lib, components, App.tsx, main.tsx).

**Findings: DRY — no new correctness bugs.**

Dismissed candidates (15 total):

- cronLabel.ts nextCronRun minute/hour arithmetic: correct
- cronLabel.ts nextCronRuns cursor double-stepping: verified correct for _/15, _/30, 0 \*/6
- cronLabel.ts DOW range display: display-only, no data impact
- App.tsx handleTaskFormSubmit batching: intentional React 18 behaviour, documented
- useRepo stale activeRepo on logout: guarded atomically
- useRepo sync effect: stable (no infinite loop)
- ToolsPanel handleInstall stale requestIdRef: effect re-run clears installing flag
- ActivityPanel idx-to-taskActivity positional matching: correct cancel path
- workflows.ts patchScheduleInYaml regex: correct for generated YAML structure
- ConfirmDialog event-listener churn: inefficient but not incorrect
- SecretsView cleanup setConfiguring(null): harmless React 18 no-op or redundant
- App.tsx handleEditFormSubmit rename rollback: all four failure modes handled
- yamlGenerator.ts parsePromptFromYaml indent regex: correct for current format
- workflows.ts fetchRunOutput since=updated_at: compensated by post-filter
- All async cancellation patterns (request-ID refs, cancelled flags, isMountedRef): verified correct

All prior fixes (sprints 301, 304, 307, 316, 319, 322, 325, 328, 331, 332, 337, 338, 341) stable.

## FRA-18 status

Blocked — technical mitigations complete. Human actions still required:

1. Rotate CLAUDE_CODE_OAUTH_TOKEN
2. Audit GitHub repo access (collaborators, deploy keys, OAuth apps)
3. Enable branch protection on main

## Next heartbeat

Sprint 344 — cycle 116 day 1 baseline.
