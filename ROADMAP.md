# Roadmap

Agent instructions: work top-to-bottom in Backlog. Move item to In Progress when you start; move to Done when the PR merges. One item per sprint run. Update this file in every sprint commit.

---

## In Progress

_nothing currently in progress_

---

## Backlog

Priority order. Top item is highest priority.

- [ ] **Bundle size audit** — Run `vite-bundle-visualizer`. `libsodium-wrappers` is large; consider lazy-loading it (only needed in `TokenSetup`). Target: initial JS bundle under 200kB gzipped.
- [ ] **Accessibility audit** — Keyboard navigation, focus management, ARIA roles, contrast ratios. `TaskList` action buttons and `ConfirmDialog` need review. Run `axe-core` in tests.
- [ ] **CSP headers** — Add `Content-Security-Policy` headers via `_headers` file (GitHub Pages / Cloudflare). Restrict `script-src`, `connect-src` to `api.github.com` and `*.anthropic.com`.

---

## Paused

Items deliberately on hold — not prioritised but not abandoned.

- [ ] **GitHub App registration** — Register a GitHub App (see `specs/githatch-v0.md` issue #9). Update `VITE_GITHUB_CLIENT_ID`. Verify CORS on the token endpoint. If CORS fails, implement device flow fallback. This unblocks external users. _Paused: currently a personal tool; revisit when opening to external users._

---

## Done

| Item                                                     | PR  | Date       |
| -------------------------------------------------------- | --- | ---------- |
| Initial scaffold + GitHub Pages deploy                   | —   | 2026-05    |
| GitHub OAuth PKCE login                                  | —   | 2026-05    |
| Repo picker                                              | —   | 2026-05    |
| Task creation form + YAML generator                      | —   | 2026-05    |
| Workflow file persistence via Contents API               | —   | 2026-05    |
| Claude OAuth token setup helper                          | —   | 2026-05    |
| Task list + manual trigger + run history                 | —   | 2026-05    |
| Delete task with confirmation dialog                     | —   | 2026-05-13 |
| Landing page + About page                                | —   | 2026-05-13 |
| Mobile layout fixes                                      | —   | 2026-05-13 |
| Agent config panel (CLAUDE.md, settings, skills, agents) | —   | 2026-05-13 |
| Fix nav repo badge showing when logged out               | —   | 2026-05-14 |
| How it works diagram copy improvements                   | —   | 2026-05-14 |
| E2E smoke tests (Playwright, 12 tests, 5 critical paths) | #17 | 2026-05-14 |
| Enable/disable task toggle (pause without deleting)      | —   | 2026-05-14 |
| Run output viewer (new_issue / issue_comment inline)     | —   | 2026-05-14 |
| Fix ToolsPanel act() warning in tests                    | —   | 2026-05-14 |
| Error boundaries on all major view sections              | —   | 2026-05-14 |
