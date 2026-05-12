# SPEC: Githatch — v0

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
- [ ] GitHub OAuth login via PKCE (no server-side secret).
- [ ] Repo picker — list user's repos (filter `permissions.push = true`), select one as the active repo; selection persists in `sessionStorage`.
- [ ] Scheduled task creation form:
  - Task name (becomes workflow filename slug)
  - Schedule (preset picker: "every Monday 9am", "daily 8am", "every 6 hours" + custom cron string)
  - Provider dropdown (v0 ships only "Claude (OAuth)"; designed to take `claude_api`, `github_models`, etc. later)
  - Prompt / instructions textarea
  - Output destination (issue comment on existing issue / new issue / commit to file)
- [ ] Workflow YAML generator — translates form input into a valid `.github/workflows/githatch-{slug}.yml`. Provider-aware: in v0, emits a `claude_oauth` template using `anthropics/claude-code-action@v1`.
- [ ] Create workflow file via GitHub Contents API (`PUT /repos/.../contents/...`).
- [ ] Tasks list view — read `.github/workflows/githatch-*.yml` files, parse name/schedule/provider, display with last-run status.
- [ ] Manual run trigger via `workflow_dispatch`.
- [ ] Run history — last 20 runs per task with status, started, duration.
- [ ] Run output viewer — for completed runs, fetch and display the issue comment / new issue / file the workflow produced. For failures, deep-link to GitHub's run page.
- [ ] OAuth token setup helper — one-time per repo. Prompts user to run `claude setup-token` locally, paste the returned token; Githatch encrypts client-side (`libsodium-wrappers`) and PUTs to repo Actions secrets as `CLAUDE_CODE_OAUTH_TOKEN`.
- [ ] Static deploy on GitHub Pages at `Fragment256.github.io/githatch`.

## Nice-to-haves (v0, only if cheap)
- [ ] Delete a scheduled task (delete the workflow file).
- [ ] Enable/disable a task without deleting (workflows enable/disable API).
- [ ] Dark mode.

## Acceptance criteria (definition of done)
- [ ] Public URL loads and shows "Login with GitHub".
- [ ] After login, user sees their repos and can pick one.
- [ ] User can fill the task creation form and submit; a workflow file appears at `.github/workflows/githatch-{slug}.yml` in the active repo with the configured schedule and prompt.
- [ ] User can manually trigger the workflow from Githatch; it runs in GitHub Actions.
- [ ] The workflow completes successfully and produces the configured output (issue comment / new issue / file).
- [ ] Run history view shows the run with correct status; clicking a successful run shows the produced output inside Githatch.
- [ ] OAuth token setup flow works end-to-end: `CLAUDE_CODE_OAUTH_TOKEN` lands in the repo's Actions secrets, workflows can use it, secret never leaves the browser unencrypted.
- [ ] Lint, format, type-check, and tests pass in CI.

## Risks / constraints
- **OAuth scopes.** Requires `repo` + `workflow` scopes. The `workflow` scope on the consent screen reads as "this app can write code that runs in your CI with your secrets" — alarming for non-technical users. Mitigation: clear in-app explanation; GitHub App migration path documented for v1 if external users emerge.
- **No webhooks.** Run status is polled (5–10s intervals). Acceptable for runs lasting 30s–30min.
- **GitHub API rate limit.** 5000/hr authenticated. Plenty for solo use.
- **Cost model.** Workflow runtime is on the user's GitHub Actions minutes. Claude usage is on the user's Claude Pro/Max subscription via OAuth token. Githatch does not proxy or charge.
- **YAML validation.** The generator must produce valid YAML and a valid cron string. Test coverage on the generator is non-negotiable.
- **Stack.** Vite + React + TypeScript + Tailwind + shadcn/ui. Octokit (browser-compatible) for GitHub API. TanStack Query for caching. `libsodium-wrappers` for secret encryption. No backend.
- **Hosting.** GitHub Pages for v0. Cloudflare Pages migration considered later if preview environments per PR become valuable.

## Issue breakdown (to create in GitHub)

1. **chore: project scaffold + GitHub Pages deploy**
   - Description: Vite + React + TypeScript + Tailwind + shadcn/ui. ESLint, Prettier, Vitest, tsc. GitHub Action to build and deploy to GitHub Pages on push to main. README, MIT LICENSE, .gitignore.
   - Acceptance: pushing to main publishes a "Hello Githatch" page at `Fragment256.github.io/githatch`. CI green.
   - Test plan: visit URL after merge; confirm page loads. Run lint/format/test/type-check locally and in CI.

2. **feat: GitHub OAuth login (PKCE)**
   - Description: PKCE OAuth flow against a GitHub OAuth App. Token stored in `sessionStorage`. Login + logout. Display logged-in user (avatar + handle).
   - Acceptance: clicking Login redirects to GitHub, returns with token, shows user.
   - Test plan: log in/out; verify token never leaves browser; unit-test PKCE code verifier/challenge generation.

3. **feat: repo picker**
   - Description: After login, fetch and list repos where `permissions.push = true`. Persist selection in `sessionStorage`. Display active repo in header.
   - Acceptance: can pick a repo; rest of app operates on it; refresh preserves selection.
   - Test plan: log in, pick a repo, refresh — selection persists.

4. **feat: scheduled task creation form + provider abstraction**
   - Description: Form with name, schedule picker (presets + custom cron), provider dropdown (v0 shows only "Claude (OAuth)"), prompt textarea, output destination. On submit, hands form data to the YAML generator (#5).
   - Acceptance: form validates inputs; on submit, calls the generator and persists the resulting workflow file (via #6).
   - Test plan: submit valid + invalid forms; assert validation messages; assert correct payload sent to generator.

5. **feat: workflow YAML generator (provider-aware)**
   - Description: Pure function `(taskConfig, provider) → yamlString`. Provider switch: in v0, emits `anthropics/claude-code-action@v1` template using `claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}`. Unit-tested against fixtures.
   - Acceptance: generator produces YAML that GitHub Actions accepts and that runs to completion.
   - Test plan: snapshot tests over a matrix of (schedule × prompt × output destination); manual run against a real repo to confirm GitHub accepts the YAML.

6. **feat: persist workflow file via Contents API**
   - Description: Given a generated YAML string and a slug, PUT to `.github/workflows/githatch-{slug}.yml` in the active repo. Handle file-already-exists (use the SHA returned by GET to update).
   - Acceptance: a task created via #4+#5 produces a real file in the repo.
   - Test plan: integration test against a sandbox repo (or mocked Octokit); manual end-to-end against Practice Thinkers.

7. **feat: Claude Code OAuth token setup helper**
   - Description: First-time-per-repo UI. Explains `claude setup-token`. User pastes token; Githatch fetches the repo's public key via Actions secrets API, encrypts the token with `libsodium-wrappers` client-side, PUTs as `CLAUDE_CODE_OAUTH_TOKEN`. Detect existing secret and skip if present.
   - Acceptance: secret lands in repo Actions secrets; workflows can use it; raw token never leaves the browser unencrypted.
   - Test plan: set the secret; trigger a task that uses it; verify task succeeds. Unit-test the encryption step.

8. **feat: tasks list + manual trigger + run history + output viewer**
   - Description: Combined view per active repo. List existing `githatch-*.yml` workflows. Per-task: schedule, last run status, "Run now" button (`workflow_dispatch`), recent runs (last 20: status, started, duration), and run-detail view showing the workflow's produced output (issue comment / new issue / file).
   - Acceptance: a created task appears in the list; "Run now" produces a real run; success shows output, failure links to GitHub's run page.
   - Test plan: create, list, trigger, verify run + output; cover failure path by setting an invalid prompt.

## PR discipline
- Branch → PR only. No pushing to main.
- PR body includes `Closes #N`.
- Commands to run (paste output in PR):
  - `pnpm lint`
  - `pnpm format --check`
  - `pnpm type-check`
  - `pnpm test`
- The `code-reviewer` agent must run before merge. CRITICAL/HIGH must be resolved; MEDIUM noted in PR body.
