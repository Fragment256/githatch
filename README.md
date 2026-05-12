# Githatch

Thin web wrapper for scheduling recurring agentic GitHub Actions on your own repos — without writing YAML.

Githatch sits on top of GitHub Issues, Projects, and Actions. You log in with your GitHub account; Githatch lets you configure cron-scheduled tasks that run via the official Claude Code Action and write output back to the repo (as issue comments, new issues, or files).

**Status:** v0 — under development. See [`specs/githatch-v0.md`](./specs/githatch-v0.md).

## Architecture

- **Auth:** GitHub OAuth via PKCE (token stays in the browser).
- **Storage:** Issues, Projects, and workflow YAML files in the user's own repo.
- **Compute:** GitHub Actions (workflow YAML written by Githatch, executed by GitHub).
- **Secrets:** GitHub Actions secrets, encrypted client-side with `libsodium-wrappers`.
- **Frontend:** Static React + Vite + Tailwind. No backend.
- **Hosting:** GitHub Pages.

## License

MIT — see [`LICENSE`](./LICENSE).
