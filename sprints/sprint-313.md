# Sprint 313 log — Explore audit (cycle 104)

**Date:** 2026-09-17
**Sprint:** 313 (day 3 of cycle 104 — Explore audit)
**Status:** 1 bug fixed (MEDIUM). 604/604 (+1).

## Baseline checks

- `format:check`: clean
- `type-check`: clean
- `lint` (--max-warnings=0): clean
- `test`: 604/604 ✓ (up from 603 after fix)

## Explore audit findings

### MEDIUM: `TaskList.tsx` — "Run now" not disabled during delete

**File**: `src/components/TaskList.tsx` line 606  
**Bug**: The "Run now" button's `disabled` condition was `triggering || !enabled || polling`. The trash icon button at line 613 correctly included `deleting` in its guard, but "Run now" did not. After the user confirmed a delete (`deleting=true`, `deleteWorkflowFile` in flight), the "Run now" button remained clickable. Clicking it dispatched a `workflow_dispatch` event to GitHub. When `deleteWorkflowFile` succeeded moments later and removed the YAML file, GitHub attempted to run the dispatched workflow against a now-missing file — the run failed or executed partially. The UI showed a clean delete with an unintended background run injected.  
**Fix**: Added `|| deleting` to the "Run now" `disabled` condition.  
**Test**: 1 regression test (RED→GREEN).

## Dismissed

All other findings from prior sprints confirmed in place. No new bugs in remaining files (useAuth, useRepo, useTasks, workflows.ts, yamlGenerator.ts, github.ts, tools.ts, templates.ts, ActivityPanel, AgentConfig, RepoPicker, SecretsView, UserMenu, ToolsPanel, TemplatePicker, TokenSetup).

## Notes

Dry streak resets to 0 (1 bug found and fixed).

**Next sprint:** 314 (day 1 — baseline, cycle 105).
