# Spec: First-run onboarding checklist

## Problem

The project's definition of "good" (README) is: *"a non-technical user can create a working agent task in under 2 minutes."* Today, after a user logs in and picks a repo with no tasks, they land on an empty `TaskList` with no guidance. The three things required for a working agent — (1) repo selected, (2) `CLAUDE_CODE_OAUTH_TOKEN` secret set, (3) at least one task created — are scattered across separate views (Secrets, + New task) with no indication that the token step is mandatory. A first-time user can easily create a task that fails on first run because the token secret was never set. This is the single largest gap against the stated 2-minute goal.

## Proposed solution

Add a `GettingStarted` component, rendered in the `tasks` view (above `AgentConfig`) in `App.tsx`, shown only when the user has an active repo AND (`tasks.length === 0` OR the `CLAUDE_CODE_OAUTH_TOKEN` secret is not present).

The component is a 3-step checklist. Each step shows a done/todo state and a primary action button:

1. **Repository selected** — always satisfied when the component renders (the user has an `activeRepo`). Show as done, display `activeRepo.name`.
2. **Claude token configured** — detect whether the repo has an Actions secret named `CLAUDE_CODE_OAUTH_TOKEN`. Use a `listRepoSecrets({ token, owner, repo })` helper in `src/lib/github.ts` (GitHub API: `GET /repos/{owner}/{repo}/actions/secrets`, which returns secret *names* only). If the call succeeds and the name is present → done. If it succeeds and the name is absent → todo, with a "Set up token" button that calls `setView('token-setup')`. If the call fails (e.g. 403 insufficient scope) → render the step as "unknown" with the same "Set up token" button and a one-line note ("couldn't verify — set it up to be safe"); never block on this.
3. **Create your first task** — done when `tasks.length > 0`. Otherwise todo, with a "+ New task" button that calls `setView('new-task')`.

Behaviour:

- Once all three steps are done, the component renders a single dismissible success line ("You're set up — agents will run on schedule.") with a dismiss control. Dismissal is per-repo, persisted in `sessionStorage` under a key like `githatch:onboarding-dismissed:<owner>/<repo>`.
- If the user later switches to a repo with zero tasks or no token secret, the checklist reappears (it keys off live state, not just the dismiss flag — the dismiss flag only suppresses the all-done success line).
- Styling matches the existing monochrome system: `border-2 border-black bg-white`, `font-mono text-xs tracking-widest uppercase` for labels, no inline styles, Tailwind only.
- Secret detection result should be loaded once when the repo/token changes (a small `useEffect` in `App.tsx` or a dedicated hook) and passed in as a prop, so the checklist itself stays presentational and easily unit-testable.

## Acceptance criteria

- New repo with no tasks and no token secret: all three steps render, steps 2 and 3 show "todo" with working action buttons that switch views.
- Repo with the `CLAUDE_CODE_OAUTH_TOKEN` secret present but zero tasks: step 2 shows done, step 3 shows todo.
- Repo with a token secret and ≥1 task: checklist collapses to the dismissible success line; dismiss hides it for that repo for the session.
- Switching to a different repo with zero tasks shows the checklist again even if another repo was dismissed.
- `listRepoSecrets` returning 403/error does not throw or blank the page; step 2 renders the "unknown" state.
- Unit tests cover: each step's done/todo/unknown state, dismiss persistence keyed by repo, and reappearance on repo switch. Existing test count must not regress; new component is covered ≥80%.
- `pnpm lint && pnpm format:check && pnpm type-check && pnpm test --run` all clean.

## Owner

claude[bot]

## Priority

high
