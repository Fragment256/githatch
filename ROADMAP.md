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
- [ ] **Grant `workflows` permission to the bot's GitHub App installation** — needed so the agent can update `.github/workflows/*.yml` directly. Blocked PR #36 from wiring the Playwright E2E suite into CI (see PR body for the exact diff to apply). _Paused: requires a human with repo admin access; not something the agent can self-grant._

---

## Done

| Item                                                                     | PR  | Date       |
| ------------------------------------------------------------------------ | --- | ---------- |
| Initial scaffold + GitHub Pages deploy                                   | —   | 2026-05    |
| GitHub OAuth PKCE login                                                  | —   | 2026-05    |
| Repo picker                                                              | —   | 2026-05    |
| Task creation form + YAML generator                                      | —   | 2026-05    |
| Workflow file persistence via Contents API                               | —   | 2026-05    |
| Claude OAuth token setup helper                                          | —   | 2026-05    |
| Task list + manual trigger + run history                                 | —   | 2026-05    |
| Delete task with confirmation dialog                                     | —   | 2026-05-13 |
| Landing page + About page                                                | —   | 2026-05-13 |
| Mobile layout fixes                                                      | —   | 2026-05-13 |
| Agent config panel (CLAUDE.md, settings, skills, agents)                 | —   | 2026-05-13 |
| Fix nav repo badge showing when logged out                               | —   | 2026-05-14 |
| How it works diagram copy improvements                                   | —   | 2026-05-14 |
| E2E smoke tests (Playwright, 12 tests, 5 critical paths)                 | #17 | 2026-05-14 |
| Enable/disable task toggle (pause without deleting)                      | —   | 2026-05-14 |
| Run output viewer (new_issue / issue_comment inline)                     | —   | 2026-05-14 |
| Fix ToolsPanel act() warning in tests                                    | —   | 2026-05-14 |
| Error boundaries on all major view sections                              | —   | 2026-05-14 |
| Bundle size: lazy-load libsodium (224 kB → 71 kB)                        | —   | 2026-05-14 |
| Accessibility: ConfirmDialog aria labels + axe-core setup                | —   | 2026-05-14 |
| CSP headers (\_headers + meta http-equiv)                                | —   | 2026-05-14 |
| Activity tab: execution sparklines, PRs, commits                         | —   | 2026-05-14 |
| cronLabel lib: human-readable schedule in task list + form               | #18 | 2026-05-16 |
| Next-run display in task list ("Next: in X hours/days")                  | #19 | 2026-05-21 |
| First-run onboarding checklist (3-step, token detection)                 | #20 | 2026-05-24 |
| Workflow YAML preview & confirm before commit                            | #21 | 2026-05-26 |
| Starter template library (4 real-use-case templates)                     | #22 | 2026-05-28 |
| Dark mode (CSS variable inversion, theme toggle)                         | #23 | 2026-05-30 |
| Refresh README file map (add 8 missing files)                            | #24 | 2026-05-31 |
| Schedule local-time preview in TaskForm                                  | #26 | 2026-06-07 |
| Last-run status badge on task cards + remove duplicate Scheduled section | #27 | 2026-06-09 |
| Failure summary banner in task list (aggregate view above cards)         | #37 | 2026-07-11 |
| Searchable repo picker (combobox filter for 100+ repo lists)             | #39 | 2026-07-18 |
| Task search/filter in TaskList                                           | #40 | 2026-07-20 |
