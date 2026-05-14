# Roadmap

Agent instructions: work top-to-bottom in Backlog. Move item to In Progress when you start; move to Done when the PR merges. One item per sprint run. Update this file in every sprint commit.

---

## In Progress

_nothing currently in progress_

---

## Backlog

Priority order. Top item is highest priority.

- [ ] **E2E tests** — Playwright smoke tests for the critical paths: login → repo picker → create task → trigger task. Currently no E2E coverage; unit tests only. (`tests/e2e/`)
- [ ] **GitHub App registration** — Register a GitHub App (see `specs/githatch-v0.md` issue #9). Update `VITE_GITHUB_CLIENT_ID`. Verify CORS on the token endpoint. If CORS fails, implement device flow fallback. This unblocks external users.
- [ ] **Accessibility audit** — Keyboard navigation, focus management, ARIA roles, contrast ratios. `TaskList` action buttons and `ConfirmDialog` need review. Run `axe-core` in tests.
- [ ] **Fix ToolsPanel act() warning in tests** — `ToolsPanel.test.tsx` emits a React `act()` warning on the `ToolCard` state update. Wrap the async state update properly.
- [ ] **Enable/disable task without deleting** — GitHub Actions has a workflow enable/disable API. Add toggle on `TaskRow` so users can pause a task without losing the config.
- [ ] **Bundle size audit** — Run `vite-bundle-visualizer`. `libsodium-wrappers` is large; consider lazy-loading it (only needed in `TokenSetup`). Target: initial JS bundle under 200kB gzipped.
- [ ] **CSP headers** — Add `Content-Security-Policy` headers via `_headers` file (GitHub Pages / Cloudflare). Restrict `script-src`, `connect-src` to `api.github.com` and `*.anthropic.com`.
- [ ] **Error boundaries** — Wrap major view sections in React error boundaries so a component crash doesn't blank the whole app.
- [ ] **Run output viewer** — For completed runs with `issue_comment` or `new_issue` output type, fetch and display the produced content inside Githatch (currently deep-links to GitHub only).
- [ ] **Dark mode** — System `prefers-color-scheme` toggle. Tailwind `dark:` variants. Persisted in `localStorage`.

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
