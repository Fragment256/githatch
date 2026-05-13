# SPEC: Githatch — v0

## Status (2026-05-13)

**Parked.** Core scaffold, task creation, task list, manual trigger, run history, output viewer, and OAuth token setup helper are all built and on main. The app deploys to `https://fragment256.github.io/githatch/`.

**Open blocker — auth rewrite.** The PKCE OAuth flow requires a server-side token proxy to exchange the code for a GitHub token. A Cloudflare Worker was built (`/githatch-token-proxy`) but never deployed. Decision: **drop PKCE OAuth; replace with PAT-based auth.** The target user is a developer — pasting a fine-grained PAT scoped to `repo` + `workflow` is acceptable friction and eliminates all infra. The worker repo can be archived.

**Next action when resumed:** replace `src/lib/auth.ts` OAuth flow + `LoginButton` with a PAT input screen; update acceptance criteria accordingly.

---

## Goal

A static web app that lets a single user schedule recurring agentic GitHub Actions on their own repos, without writing YAML. The thinness is the point: GitHub holds the data, runs the work, and stores the secrets; Githatch is the UI for configuring it.

## Non-goals

- Not a general workflow editor — Githatch only creates a specific shape of workflow (cron + agent-runs-prompt + write-back-to-repo).
- Not a Claude-skill marketplace, prompt library, or chat interface.
- Not a replacement for GitHub UI (no code browsing, PR review, branch management).
- Not multi-user / multi-tenant in v0 — one logged-in user, their own repos.
- Not webhook-driven — output is polled, not pushed.
- No backend, no database, no secrets server-side — the user's repo is the backend.

## Users / scenario

**Primary user (v0):** Luke (Fragment256 operator). Uses Githatch as his own operating tool to schedule recurring agentic work on his repos.

**Concrete v0 use cases:**

- **GSD status digest** — every Monday 9am, summarise the last week of Practice Thinkers session actions, post as a comment on a tracking issue.
- **AI news processing** — periodic pass over `kb/ai-news/raw/`, surface candidates against `kb/ai-news/selections.md` rules.

**Demo audience:** Pete (Practice Thinkers). Watches Luke configure and run a task; reaction is a data point on whether non-technical operators see the value, not whether Pete is the target buyer.

## Requirements (must)

- [x] ~~GitHub OAuth login via PKCE (no server-side secret).~~ **Replaced — see auth decision above.** New requirement: PAT input screen. User pastes a fine-grained GitHub PAT (`repo` + `workflow` scopes); token stored in `sessionStorage`.
- [x] Repo picker — list user's repos (filter `permissions.push = true`), select one as the active repo; selection persists in `sessionStorage`.
- [x] Scheduled task creation form:
  - Task name (becomes workflow filename slug)
  - Schedule (preset picker: "every Monday 9am", "daily 8am", "every 6 hours" + custom cron string)
  - Provider dropdown (v0 ships only "Claude (OAuth)"; designed to take `claude_api`, `github_models`, etc. later)
  - Prompt / instructions textarea
  - Output destination (issue comment on existing issue / new issue / commit to file)
- [x] Workflow YAML generator — translates form input into a valid `.github/workflows/githatch-{slug}.yml`. Provider-aware: in v0, emits a `claude_oauth` template using `anthropics/claude-code-action@v1`.
- [x] Create workflow file via GitHub Contents API (`PUT /repos/.../contents/...`).
- [x] Tasks list view — read `.github/workflows/githatch-*.yml` files, parse name/schedule/provider, display with last-run status.
- [x] Manual run trigger via `workflow_dispatch`.
- [x] Run history — last 20 runs per task with status, started, duration.
- [x] Run output viewer — for completed runs, fetch and display the issue comment / new issue / file the workflow produced. For failures, deep-link to GitHub's run page.
- [x] OAuth token setup helper — one-time per repo. Prompts user to run `claude setup-token` locally, paste the returned token; Githatch encrypts client-side (`libsodium-wrappers`) and PUTs to repo Actions secrets as `CLAUDE_CODE_OAUTH_TOKEN`.
- [x] Static deploy on GitHub Pages at `Fragment256.github.io/githatch`.

## Nice-to-haves (v0, only if cheap)

- [ ] Delete a scheduled task (delete the workflow file).
- [ ] Enable/disable a task without deleting (workflows enable/disable API).
- [ ] Dark mode.

## Acceptance criteria (definition of done)

- [ ] Public URL loads and shows PAT input screen with link to GitHub's fine-grained PAT creation page.
- [x] After token entry, user sees their repos and can pick one.
- [x] User can fill the task creation form and submit; a workflow file appears at `.github/workflows/githatch-{slug}.yml` in the active repo with the configured schedule and prompt.
- [x] User can manually trigger the workflow from Githatch; it runs in GitHub Actions.
- [ ] The workflow completes successfully and produces the configured output (issue comment / new issue / file). *(not yet end-to-end tested with a real run)*
- [x] Run history view shows the run with correct status; clicking a successful run shows the produced output inside Githatch.
- [x] OAuth token setup flow works end-to-end: `CLAUDE_CODE_OAUTH_TOKEN` lands in the repo's Actions secrets, workflows can use it, secret never leaves the browser unencrypted.
- [x] Lint, format, type-check, and tests pass in CI.

## Risks / constraints

- **OAuth scopes.** Requires `repo` + `workflow` scopes. The `workflow` scope on the consent screen reads as "this app can write code that runs in your CI with your secrets" — alarming for non-technical users. Mitigation: clear in-app explanation; GitHub App migration path documented for v1 if external users emerge.
- **No webhooks.** Run status is polled (5–10s intervals). Acceptable for runs lasting 30s–30min.
- **GitHub API rate limit.** 5000/hr authenticated. Plenty for solo use.
- **Cost model.** Workflow runtime is on the user's GitHub Actions minutes. Claude usage is on the user's Claude Pro/Max subscription via OAuth token. Githatch does not proxy or charge.
- **YAML validation.** The generator must produce valid YAML and a valid cron string. Test coverage on the generator is non-negotiable.
- **Stack.** Vite + React + TypeScript + Tailwind + shadcn/ui. Octokit (browser-compatible) for GitHub API. TanStack Query for caching. `libsodium-wrappers` for secret encryption. No backend.
- **Hosting.** GitHub Pages for v0. Cloudflare Pages migration considered later if preview environments per PR become valuable.

## Issue breakdown

1. **chore: project scaffold + GitHub Pages deploy** ✅ done
2. **feat: GitHub OAuth login (PKCE)** ✅ done — *to be replaced by PAT auth (see status)*
3. **feat: repo picker** ✅ done

4. **feat: scheduled task creation form + provider abstraction** ✅ done
5. **feat: workflow YAML generator (provider-aware)** ✅ done
6. **feat: persist workflow file via Contents API** ✅ done
7. **feat: Claude Code OAuth token setup helper** ✅ done
8. **feat: tasks list + manual trigger + run history + output viewer** ✅ done

9. **feat: PAT-based auth** *(next)*
   - Description: Replace PKCE OAuth flow with a PAT input screen. User pastes a fine-grained GitHub PAT scoped to `repo` + `workflow`. Token stored in `sessionStorage`. Show a direct link to GitHub's fine-grained PAT creation page with the correct scope pre-explanation. Remove all OAuth App machinery (`buildAuthUrl`, `exchangeCodeForToken`, PKCE verifier/challenge), `LoginButton` component, and `VITE_GITHUB_CLIENT_ID` env var.
   - Acceptance: blank URL loads PAT input; after pasting a valid token the app fetches the user and proceeds to repo picker. Invalid token shows a clear error.
   - Test plan: unit-test the token validation call; manually verify end-to-end login → repo pick → task create.

## PR discipline

- Branch → PR only. No pushing to main.
- PR body includes `Closes #N`.
- Commands to run (paste output in PR):
  - `pnpm lint`
  - `pnpm format --check`
  - `pnpm type-check`
  - `pnpm test`
- The `code-reviewer` agent must run before merge. CRITICAL/HIGH must be resolved; MEDIUM noted in PR body.
