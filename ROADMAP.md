# Roadmap

Agent instructions: work top-to-bottom in Backlog. Move item to In Progress when you start; move to Done when the PR merges. One item per sprint run. Update this file in every sprint commit.

---

## In Progress

_(none)_

---

## Backlog

Priority order. Top item is highest priority.

_(none)_

---

## Paused

Items deliberately on hold — not prioritised but not abandoned.

- [ ] **GitHub App registration** — Register a GitHub App (see `specs/githatch-v0.md` issue #9). Update `VITE_GITHUB_CLIENT_ID`. Verify CORS on the token endpoint. If CORS fails, implement device flow fallback. This unblocks external users. _Paused: currently a personal tool; revisit when opening to external users._
- [ ] **Grant `workflows` permission to the bot's GitHub App installation** — needed so the agent can update `.github/workflows/*.yml` directly. Blocked PR #36 from wiring the Playwright E2E suite into CI (see PR body for the exact diff to apply). _Paused: requires a human with repo admin access; not something the agent can self-grant. Note: #47 (Actions pinning) and #54 (post-run verification step) were both completed directly by Luke._

---

## Done

| Item                                                                                    | PR  | Date       |
| --------------------------------------------------------------------------------------- | --- | ---------- |
| Initial scaffold + GitHub Pages deploy                                                  | —   | 2026-05    |
| GitHub OAuth PKCE login                                                                 | —   | 2026-05    |
| Repo picker                                                                             | —   | 2026-05    |
| Task creation form + YAML generator                                                     | —   | 2026-05    |
| Workflow file persistence via Contents API                                              | —   | 2026-05    |
| Claude OAuth token setup helper                                                         | —   | 2026-05    |
| Task list + manual trigger + run history                                                | —   | 2026-05    |
| Delete task with confirmation dialog                                                    | —   | 2026-05-13 |
| Landing page + About page                                                               | —   | 2026-05-13 |
| Mobile layout fixes                                                                     | —   | 2026-05-13 |
| Agent config panel (CLAUDE.md, settings, skills, agents)                                | —   | 2026-05-13 |
| Fix nav repo badge showing when logged out                                              | —   | 2026-05-14 |
| How it works diagram copy improvements                                                  | —   | 2026-05-14 |
| E2E smoke tests (Playwright, 12 tests, 5 critical paths)                                | #17 | 2026-05-14 |
| Enable/disable task toggle (pause without deleting)                                     | —   | 2026-05-14 |
| Run output viewer (new_issue / issue_comment inline)                                    | —   | 2026-05-14 |
| Fix ToolsPanel act() warning in tests                                                   | —   | 2026-05-14 |
| Error boundaries on all major view sections                                             | —   | 2026-05-14 |
| Bundle size: lazy-load libsodium (224 kB → 71 kB)                                       | —   | 2026-05-14 |
| Accessibility: ConfirmDialog aria labels + axe-core setup                               | —   | 2026-05-14 |
| CSP headers (\_headers + meta http-equiv)                                               | —   | 2026-05-14 |
| Activity tab: execution sparklines, PRs, commits                                        | —   | 2026-05-14 |
| cronLabel lib: human-readable schedule in task list + form                              | #18 | 2026-05-16 |
| Next-run display in task list ("Next: in X hours/days")                                 | #19 | 2026-05-21 |
| First-run onboarding checklist (3-step, token detection)                                | #20 | 2026-05-24 |
| Workflow YAML preview & confirm before commit                                           | #21 | 2026-05-26 |
| Starter template library (4 real-use-case templates)                                    | #22 | 2026-05-28 |
| Dark mode (CSS variable inversion, theme toggle)                                        | #23 | 2026-05-30 |
| Refresh README file map (add 8 missing files)                                           | #24 | 2026-05-31 |
| Schedule local-time preview in TaskForm                                                 | #26 | 2026-06-07 |
| Last-run status badge on task cards + remove duplicate Scheduled section                | #27 | 2026-06-09 |
| Failure summary banner in task list (aggregate view above cards)                        | #37 | 2026-07-11 |
| Searchable repo picker (combobox filter for 100+ repo lists)                            | #39 | 2026-07-18 |
| Task search/filter in TaskList                                                          | #40 | 2026-07-20 |
| Remove malicious obfuscated payload from eslint.config.js (incident #46)                | #45 | 2026-08-11 |
| Pin generated workflow action SHAs in YAML generator                                    | #49 | 2026-08-16 |
| Guard ActivityPanel against stale repo-switch responses                                 | #50 | 2026-08-20 |
| Pre-commit scan for obfuscated-payload patterns                                         | #51 | 2026-08-25 |
| Guard secret-status effect against stale repo-switch responses                          | #52 | 2026-08-29 |
| Pin all static GitHub Actions workflows to commit SHAs (closes #47)                     | —   | 2026-08-31 |
| Add post-run verification step to catch silent sprint no-ops (closes #54)               | —   | 2026-09-03 |
| Surface edit/duplicate errors in task list view (closes #55)                            | #55 | 2026-09-04 |
| Discard stale output in RunHistoryPanel on rapid View clicks (closes #56)               | #56 | 2026-09-04 |
| Guard SecretsView against stale checkSecretExists responses                             | #57 | 2026-09-04 |
| Guard ToolCard against stale checkToolInstalled responses; fix Reinstall                | —   | 2026-09-04 |
| Fix ActivityPanel task effect missing deps; sparklines never load async                 | —   | 2026-09-04 |
| Guard AgentConfig against stale fetchRepoAgentConfig responses                          | —   | 2026-09-04 |
| Guard RunHistoryPanel fetchRuns against stale StrictMode double-effect                  | —   | 2026-09-04 |
| Guard TaskRow initial last-run fetch; add missing effect deps (token/owner/repo/branch) | —   | 2026-09-04 |
| Fix listRepoSecrets truncation at 30 secrets; add per_page=100                          | —   | 2026-09-04 |
| Guard handleEditTask/handleDuplicateTask against stale double-click race                | —   | 2026-09-04 |
| Clear saveError on Back navigation from new-task and edit-task views                    | —   | 2026-09-04 |
| Guard TokenSetup checkSecretExists against stale mid-flight secretName changes          | —   | 2026-09-04 |
| RepoPicker: guard ArrowDown against -1 highlightedIndex when filtered list is empty     | —   | 2026-09-04 |
