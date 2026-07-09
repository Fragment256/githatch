---
title: Starter template library for real use cases
date: 2026-05-19
status: done
owner: claude[bot]
---

# Spec: Starter template library for real use cases

## Problem

The blank task form is the main friction point against the 2-minute goal. A template system already exists (`TemplatePicker.tsx`, `src/lib/templates.ts`), but it ships only two templates — "SE Daily Sprint" and "Sprint Planning" — both self-referential meta-agents that operate on Githatch itself. There is **no** starter template for any of the use cases the product is actually pitched on: the v0 spec names "weekly status digest → issue comment" and "periodic doc processing" as the canonical scenarios, and the README frames the product around "summarising work, filing issues, writing reports." A new user wanting one of these has to write the whole prompt, schedule, and output destination from scratch.

## Proposed solution

Add general-purpose starter templates to `TEMPLATES` in `src/lib/templates.ts`.

**Shape change:** the current `Template` type is YAML-file-backed (`yaml: string`, imported `?raw` from `.github/workflows/*`). New templates must **not** require a corresponding workflow file to exist on disk. Extend `Template` so a template can carry an inline config instead:

- Add an optional field `config?: Partial<TaskConfig>` to the `Template` interface.
- Update `templateToConfig(t)`: if `t.config` is present, build the `TaskConfig` from it (merged over sensible defaults from the existing `TaskConfig` shape) instead of parsing `t.yaml`. Keep the existing YAML-based path working unchanged for `se-daily-sprint` and `sprint-planning` (make `yaml` optional, exactly one of `yaml` / `config` required).

**New templates to add** (each: `id`, `name`, `description`, `defaultTaskName`, `config` with `name`, `schedule` cron, `prompt`, `outputDestination`):

1. **Weekly Status Digest** — `schedule: '0 9 * * 1'` (Mon 9am UTC). Prompt: summarise the last 7 days of commits, merged PRs, and closed issues in this repo into a concise digest with sections for Shipped / In Progress / Notable. `outputDestination`: issue comment on an existing tracking issue (the form's existing issue-number field carries this).
2. **Stale Issue Triage** — `schedule: '0 8 * * *'` (daily 8am UTC). Prompt: list open issues with no activity in 14+ days, group by likely status (needs-info, ready, stale), and post a short triage summary. `outputDestination`: new issue.
3. **Dependency Update Digest** — `schedule: '0 9 * * 1'` (Mon 9am UTC). Prompt: identify outdated dependencies, summarise notable changelog entries and breaking changes, and recommend a safe upgrade order. `outputDestination`: new issue.
4. **Docs Freshness Check** — `schedule: '0 9 * * 1'` (Mon 9am UTC). Prompt: scan `docs/` and `README.md` for references to files, commands, or APIs that no longer exist in the codebase and report each stale reference with its location. `outputDestination`: new issue.

Prompts should be concrete and self-contained (an agent can run them without further context) but generic enough to work on any repo — no Githatch-specific paths. Keep each prompt focused and under ~120 words.

`TemplatePicker` requires no changes (it iterates `TEMPLATES` generically) — verify it still renders correctly with the larger list and that selecting a `config`-based template populates `TaskForm` via `templateToConfig`.

## Acceptance criteria

- `Template` type supports either `yaml` or `config`; exactly one is required (enforced at the type level where practical, and by `templateToConfig` behaviour).
- The two existing YAML-backed templates still load and produce identical `TaskConfig` output (regression test).
- Each new template, passed through `templateToConfig`, yields a valid `TaskConfig` with a non-empty prompt, a valid cron string, and the specified `outputDestination`.
- Selecting any new template in the new-task view pre-fills `TaskForm` with that template's values; "Start from scratch" still clears it.
- The generated YAML for each new template (via the existing generator) is valid YAML and a valid workflow shape (assert with the existing `yamlGenerator` tests' helpers).
- Unit tests cover `templateToConfig` for both `yaml` and `config` paths and one assertion per new template. Coverage ≥80% on changed files; existing tests must not regress.
- `pnpm lint && pnpm format:check && pnpm type-check && pnpm test --run` all clean.

## Owner

claude[bot]

## Priority

medium
