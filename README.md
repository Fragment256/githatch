# Githatch

A static web app for scheduling Claude agents via GitHub Actions. No backend, no new platform — your repo is the runtime.

**Live:** [fragment256.github.io/githatch](https://fragment256.github.io/githatch/)
**Spec:** [`specs/githatch-v0.md`](./specs/githatch-v0.md)
**Roadmap:** [`ROADMAP.md`](./ROADMAP.md)

---

## Purpose

When you move past using Claude interactively, you want agents running on a schedule — summarising work, filing issues, writing reports, drafting PRs. Every solution to this adds a new platform with new lock-in.

Githatch takes a different bet: GitHub Actions already solves scheduling, secrets, compute, and auth. Githatch is the thin UI that writes the YAML so you don't have to. The workflows live in your repo. Stop using Githatch and they keep running.

**What Githatch does:**

- Authenticates with GitHub (OAuth PKCE — no backend, token in session only)
- Lets you pick any repo you can push to
- Creates and manages `cron`-scheduled GitHub Actions workflows that run Claude agents
- Generates the workflow YAML (`claude-code-action@v1`), commits it, and tracks runs

**What Githatch does not do:**

- General workflow editing (only creates the specific claude-agent shape)
- Multi-user / multi-tenant (v0: one user, their own repos)
- Webhook-driven updates (polls GitHub API)
- Proxy anything — Claude usage is on the user's own OAuth token

**Definition of "good" for this project:**

- Zero-friction UX: a non-technical user can create a working agent task in under 2 minutes
- Thin and auditable: every action Githatch takes is a visible API call or a committed file
- Reliable CI: lint, format, type-check, and tests pass on every push
- No lock-in: if Githatch disappeared tomorrow, the workflows would still run

---

## Tech stack

| Layer             | Choice                                                            |
| ----------------- | ----------------------------------------------------------------- |
| Framework         | React 18 + TypeScript (strict)                                    |
| Build             | Vite                                                              |
| Styling           | Tailwind CSS (utility-first, monochrome design system)            |
| Testing           | Vitest + React Testing Library                                    |
| Linting           | ESLint + Prettier (via lint-staged)                               |
| Package manager   | pnpm                                                              |
| Deploy            | GitHub Pages via GitHub Actions                                   |
| Auth              | GitHub OAuth PKCE (no `client_secret`)                            |
| Secret encryption | `libsodium-wrappers` (client-side, for `CLAUDE_CODE_OAUTH_TOKEN`) |
| Agent runner      | `anthropics/claude-code-action@v1`                                |

---

## File map

```
src/
  components/
    AgentConfig.tsx       — collapsible panel: reads .claude/ from active repo
    AboutPage.tsx         — static about page
    ConfirmDialog.tsx     — native <dialog> modal (used for destructive actions)
    Landing.tsx           — logged-out hero + how-it-works + callouts
    LoginButton.tsx       — GitHub OAuth trigger
    RepoPicker.tsx        — repo selection list
    TaskForm.tsx          — create/edit agent task form
    TaskList.tsx          — task cards with run/history/delete
    TokenSetup.tsx        — CLAUDE_CODE_OAUTH_TOKEN setup helper
    ToolsPanel.tsx        — pre-built tool templates
    UserMenu.tsx          — avatar + logout
  hooks/
    useAuth.ts            — GitHub OAuth PKCE flow, token in sessionStorage
    useRepo.ts            — active repo state, persisted in sessionStorage
    useTasks.ts           — loads githatch-*.yml from .github/workflows/
  lib/
    auth.ts               — OAuth helpers
    config.ts             — VITE_GITHUB_CLIENT_ID env var
    github.ts             — GitHub Contents / Actions / Repos API wrappers
    secrets.ts            — libsodium encrypt/upload for Actions secrets
    tools.ts              — pre-built tool definitions
    utils.ts              — shared utilities
    workflows.ts          — workflow run listing and dispatch
    yamlGenerator.ts      — generates workflow YAML from TaskConfig
  App.tsx                 — top-level routing and view state
  main.tsx                — React entry point
  setupTests.ts           — Vitest setup (HTMLDialogElement polyfill)

specs/                    — human-authored specs
docs/
  specs/                  — agent-authored specs (date-prefixed)
  sprint-log.md           — daily sprint run log (agent-maintained)

.github/workflows/
  deploy.yml              — builds and publishes to GitHub Pages on push to main
  githatch-*.yml          — agent tasks (written by Githatch, run here)
```

---

## Conventions

### Commits

```
<type>: <description>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

### PRs

- Branch → PR only. Never push directly to main.
- PR body includes `Closes #N` if addressing an issue.
- CI must be green before merge.
- Run before raising: `pnpm lint && pnpm format --check && pnpm type-check && pnpm test`

### Testing

- Vitest + React Testing Library. Test files colocated (`*.test.tsx` / `*.test.ts`).
- Minimum 80% coverage. TDD: write tests first (RED → GREEN → refactor).
- Mock at the module boundary — spy on named exports from `@/lib/*`.
- No mocking of React internals or DOM APIs (use polyfills in `setupTests.ts`).

### Code style

- No comments unless the WHY is non-obvious.
- No mutation — return new objects.
- Immutable state patterns in React hooks.
- Functions under 50 lines; files under 800 lines.
- Tailwind only — no inline `style` props.

### YAML generator

- `yamlGenerator.ts` is critical. Any change must maintain test coverage.
- The generated YAML must be valid YAML and trigger correctly on GitHub Actions.
- Indentation rule: block scalar content must be indented deeper than its key.

---

## Development

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # vitest watch
pnpm test --run   # single pass
pnpm lint
pnpm format
pnpm type-check
pnpm build        # production build to dist/
```

Required env var (set in repo variable `VITE_GITHUB_CLIENT_ID`):

```
VITE_GITHUB_CLIENT_ID=<GitHub OAuth App / App client ID>
```

---

## Architecture decisions

**No backend.** The user's GitHub token never leaves their browser. Githatch calls the GitHub API directly. Secret encryption happens client-side with `libsodium-wrappers` before uploading to GitHub Actions Secrets.

**Sessions only.** Auth token and active repo are stored in `sessionStorage` (not `localStorage`). They clear when the tab closes. Logout explicitly clears them.

**Workflow shape.** Every generated workflow uses `anthropics/claude-code-action@v1`. The `outputDestination` in `TaskConfig` determines permissions, allowed tools, and the appended delivery instruction in the prompt.

**Output types:** `issue_comment`, `new_issue`, `file` (dated or named), `pull_request`, `agent_managed` (self-contained prompt, full permissions).
