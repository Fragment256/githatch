# Sprint 458 — Explore audit, cycle 154

Date: 2026-09-19
Cycle: 154
Day: 3 (Explore audit)

## Baseline

- format:check: PASS
- lint: 0 warnings PASS
- type-check: PASS
- tests: 625/625 PASS (↑ from 622)

## Audit

Unscoped Explore audit (all 34 non-test source files). 3 bugs fixed via TDD (RED→GREEN). Dry streak resets to 0.

1. MEDIUM: `buildPromptWithOutput` — `git add ${fp}` unquoted. A filePath with spaces would split the shell argument, staging the wrong file. Fix: `git add "${fp}"`.
2. LOW: `generateWorkflowYaml` — `config.name` interpolated directly into YAML comment header (`# Githatch — ${config.name}`). A newline in the name breaks out of the comment, putting raw content at YAML document root. Fix: strip `\r\n` via `safeName`.
3. LOW: `generateWorkflowYaml` — `filePath` interpolated into output_type comment. Same newline injection path. Fix: strip `\r\n` via `safeFilePath`.

Commit: 0ef755a

## Security situation (unchanged)

CLAUDE_CODE_OAUTH_TOKEN rotation and githatch #44 decision remain pending (Luke-only actions).

## Next heartbeat

Sprint 459 — day 1 baseline, cycle 155.
