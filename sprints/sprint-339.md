# Sprint 339 — Explore audit, cycle 113

Date: 2026-09-17
Cycle: 113
Day: 2

## Baseline

- format:check: PASS
- lint: 0 warnings
- type-check: PASS
- tests: 619/619 PASS

## Explore audit — 0 bugs fixed

Full audit of all source files not covered on day 1:

- `RepoPicker.tsx` — keyboard nav + blur/revert logic correct; `onMouseDown` preventDefault prevents input blur on click
- `TemplatePicker.tsx` — toggle-select logic correct
- `Landing.tsx`, `LoginButton.tsx`, `UserMenu.tsx`, `AboutPage.tsx` — static UI, no logic bugs
- `ErrorBoundary.tsx` — standard class component, correct
- `useTheme.ts` — localStorage with try/catch guard, correct
- `lib/config.ts` — env-var reads, correct
- `lib/auth.ts` — PKCE implementation correct; base64url encoding correct; token lifecycle correct
- `lib/secrets.ts` — libsodium encrypt-then-PUT pattern correct
- `lib/templates.ts` — `parseScheduleFromYaml` regex matches 4-space indent correctly
- `lib/tools.ts` — `installTool` GET-then-PUT with SHA correct; `btoa(unescape(encodeURIComponent(...)))` produces correct base64 for ASCII YAML
- `useAuth.ts` — `sessionRevRef` + `cancelled` dual guard correct; Strict Mode double-invoke is a dev-only artefact, not a prod bug
- `useTasks.ts`, `useRepo.ts` — previously reviewed, confirmed correct
- `yamlGenerator.ts` — `parsePromptFromYaml` `lastIndexOf('\n\nWhen done,')` correctly strips appended output instruction without corrupting user prompts that contain "When done"
- `workflows.ts` — `patchScheduleInYaml` non-global regex is safe for `.test()` + `.replace()` pair; `fetchRunOutput` ISO8601 string comparisons correct

All known race conditions are guarded. No mutation violations. No uncovered edge cases found.

## FRA-18 status

Blocked — technical mitigations complete (payload removed + scanner gap closed in sprint 335/336). Human actions still required:

1. Rotate CLAUDE_CODE_OAUTH_TOKEN
2. Audit GitHub repo access (collaborators, deploy keys, OAuth apps)
3. Enable branch protection on main (prevent force-pushes)

## Next heartbeat

Sprint 340 — start cycle 114 day 1 (fresh Explore audit).
