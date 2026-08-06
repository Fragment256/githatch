---
name: spi
description: >
  Use this skill when the user wants to spec out a feature, write a specification document,
  create GitHub issues from a description, or when they say "SPI", "spec this out",
  "create a spec", "write up issues for", "plan this feature", "spec and issues",
  or "turn this into issues". Guides the Spec → Plan → Issues workflow: draft a structured
  spec from a description, confirm it with the user, write SPEC.md, create GitHub
  issues for each item in the breakdown, and create a GitHub Project to track them.
  Also handles "/spi go" — autonomous implementation of all open issues using TDD,
  with conflict-safe branching, code review, and PR creation.
version: 1.2.0
---

# SPI — Spec · Plan · Issues

Turns a plain-language feature description into a structured spec document and a set of
GitHub issues, ready to pick up and work.

## Workflow overview

```
/spi <description>
     │
     ├─ Phase 1: Clarify (ask 3–5 questions if description is vague)
     ├─ Phase 2: Draft spec (fill spec template, show to user, wait for OK)
     ├─ Phase 3: Write SPEC.md
     ├─ Phase 4: Create GitHub issues via `gh issue create`
     ├─ Phase 5: Create GitHub Project + add all issues to it
     └─ Phase 6: Print summary table
```

## When to invoke proactively

Suggest running `/spi <description>` when:

- The user describes a feature but hasn't created a spec or issues yet
- The user pastes a rough idea and asks "what do you think?"
- A PR conversation reveals a missing spec for the work being reviewed

## Templates

### Spec template

Load `templates/spec.md` when filling out a spec. Key sections:

- **Goal** — one sentence
- **Non-goals** — explicitly excluded scope
- **Users / scenario** — who, when, why
- **Requirements (must)** — checkbox list
- **Nice-to-haves** — optional improvements
- **Acceptance criteria** — observable, testable outcomes
- **Risks / constraints** — auth, rate limits, backwards compat
- **Issue breakdown** — one entry per GitHub issue to create
- **PR discipline** — branch/PR rules and commands to paste in PR body

### Issue body template

Load `templates/issue.md` when creating each GitHub issue. Key sections:

- **Description** — what needs to be done
- **Acceptance criteria** — checkbox list of outcomes
- **Test plan** — how to verify the work
- **Context** — link back to the parent spec

## gh CLI operations

```bash
# Check repo is on GitHub
gh repo view --json name,url

# Create an issue
gh issue create --title "..." --body "..."

# List existing issues (to avoid duplicates)
gh issue list --state open --limit 50

# Create a GitHub Project (returns the new project number)
gh project create --owner <owner> --title "<title>"

# Add an issue to a project (use the issue URL returned by gh issue create)
gh project item-add <project-number> --owner <owner> --url <issue-url>

# List project fields (to find Status field ID and option IDs)
gh project field-list <project-number> --owner <owner> --format json

# Move a project item to a different status column
# Requires: item ID (from item-add output), field ID, project ID, option ID
gh project item-edit \
  --id <item-node-id> \
  --field-id <status-field-id> \
  --project-id <project-node-id> \
  --single-select-option-id <option-id>
```

## Phase 5 — Create GitHub Project

After all issues are created, create a GitHub Project board to track them:

```bash
# Get the repo owner
OWNER=$(gh repo view --json owner --jq '.owner.login')

# Create a project named after the spec (use the spec title / slug)
gh project create --owner "$OWNER" --title "<Feature Name>"
# Note the project number printed (e.g. "Created project 4")

# Add every issue created in Phase 4 to the project
# Use the URLs returned by each `gh issue create` call
gh project item-add <project-number> --owner "$OWNER" --url <issue-url-1>
gh project item-add <project-number> --owner "$OWNER" --url <issue-url-2>
# … repeat for each issue
```

Print the project URL in the Phase 6 summary table.

**If `gh project` is unavailable** (missing scope): tell the user to run `gh auth refresh -s project` and retry, then print the project creation commands for manual execution.

## Quality gates

- Never leave `<placeholder>` text in a delivered spec or issue
- Every requirement in the spec maps to at least one issue
- Every issue has at least one acceptance criterion and one test plan step
- If `gh` is unavailable, print formatted issue bodies for manual creation
- Write specs to `specs/{slug}.md` — never overwrite, append `-2` on collision
- Specs accumulate in `specs/` so agents can scan project history before starting new work
- Include `Spec: specs/{slug}.md` in every issue body for back-linking
- Every `/spi` run creates exactly one GitHub Project and links all issues to it

---

## /spi go — Autonomous Implementation

Implements all open GitHub issues using TDD, conflict-safe branching, code review, and PR creation. Processes issues sequentially in conflict-safe order.

```
/spi go
     │
     ├─ Phase 1: Sync — pull latest main
     ├─ Phase 2: Triage — fetch open issues, build conflict graph
     ├─ Phase 3: Sequence — order issues to avoid merge conflicts
     ├─ Phase 4: Implement — for each issue: branch → TDD → review → PR
     └─ Phase 5: Summary — print table of all PRs created
```

### Phase 1 — Sync

```bash
git checkout main
git pull origin main
```

Abort if the working tree is dirty. Tell the user to stash or commit first.

### Phase 2 — Triage + Scope

Fetch all open issues:

```bash
gh issue list --state open --limit 100 --json number,title,body,labels
```

**Always clarify scope before proceeding.** Print a grouped list of open issues and ask which subset to work on:

```
Open issues (20 total):

  Discoveries UI (#529, #530, #531, #533, #534, #535)
  Map (#462, #463, #464, #465, #466)
  Heatmap (#483, #484, #485)
  Curated walks (#455, #486, #487)
  Walk journal (#451)
  Other (#532)

Which issues should I implement?
  a) All of them
  b) A specific group (e.g. "Discoveries UI")
  c) Specific issue numbers (e.g. "#529 #530 #533")
  d) A theme/label

> _
```

Wait for the user's answer. Do not proceed until scope is confirmed.

Group issues by common theme using title prefixes and feature area. If the user specifies a label, filter with `gh issue list --label <label>`.

For each issue in the confirmed scope, identify the likely **file footprint** — which source files it will touch. Use the issue title and body to infer this:

- Widget/screen names → `lib/features/*/presentation/screens/*.dart`
- Service names → `lib/features/*/domain/services/*.dart`
- Repository names → `lib/features/*/data/repositories/*.dart`
- "Fix" issues for a specific screen → that screen's file + its test file

Mark each issue with its footprint. Two issues **conflict** if their footprints overlap (same file or same directory likely to cause merge conflicts).

### Phase 3 — Sequence

Build a conflict graph. Issues with overlapping footprints must be sequenced — later issues in a conflict group must wait for the earlier one's PR to merge before branching.

**Sequencing rules:**

1. Independent issues (no shared footprint) can theoretically be parallel, but implement them sequentially here — one branch at a time, each cutting from `main`. This avoids any risk of diverging state.
2. Conflicting issues: sequence them in logical order (e.g. data model before UI, fix before feature). Later issues in the sequence **branch from main** too — not from the earlier branch. They will be rebased by the developer after the earlier PR merges.
3. Print the sequence plan and wait for the user to confirm before proceeding:

```
Implementation order:
  1. #529 fix: walk journal share sheet (lib/features/walks/…)
  2. #530 fix: discovery card scroll-clip (lib/features/discoveries/…)
  3. #533 feat: discoveries 2-column grid  ← conflicts with #530 (same file)
     ↳ branch from main; rebase onto #530's branch after it merges
  4. #534 feat: detail screen map hero (lib/features/discoveries/…)
  5. #535 feat: detail screen tags + walk title ← conflicts with #534
     ↳ branch from main; rebase onto #534's branch after it merges

Proceed? (y/n)
```

### Phase 4 — Implement (TDD loop, one issue at a time)

For each issue in sequence:

#### 4a. Branch

```bash
git checkout main
git pull origin main
git checkout -b feat/issue-{N}-{slug}
# slug = issue title lowercased, spaces→hyphens, max 40 chars
```

#### 4b. TDD — red → green → refactor

Follow the TDD workflow for this issue:

1. **Read the issue** — understand the acceptance criteria and test plan
2. **Write failing tests first** — unit tests and/or widget tests that directly test the acceptance criteria. Run them: they must fail (RED).
3. **Implement** — write the minimum code to make the tests pass (GREEN).
4. **Refactor** — clean up without breaking tests.
5. **Run the full test suite** — all existing tests must still pass.

```bash
flutter test                        # must pass
flutter analyze                     # zero issues
dart format --set-exit-if-changed . # must be clean
```

If tests fail or analyze has issues, fix them before moving on. Do not skip to the next issue with a broken build.

#### 4c. Code review (MANDATORY — do not skip)

**You must run the code-reviewer agent before creating the PR.** This is a hard gate, not optional.

Spawn the `code-reviewer` agent with the list of changed files (`git diff main...HEAD --name-only`). Wait for it to complete.

- **CRITICAL or HIGH findings** — fix them before proceeding. Do not create the PR until they are resolved. Re-run the reviewer after fixing.
- **MEDIUM findings** — include them verbatim in the PR body under a "Code review notes" section.
- **LOW / INFO findings** — may be ignored.

If you skip this step, you are violating the workflow. There are no exceptions.

#### 4d. Rebase and create PR

**Always rebase onto `main` immediately before pushing.** This collapses the drift window to near-zero, eliminating merge conflicts caused by predecessor PRs merging while this branch was being built:

```bash
git fetch origin main
git rebase origin/main
# If conflict: resolve, git add, git rebase --continue
# If commit already in main (cherry-pick): git rebase --skip
```

Then push and create the PR:

```bash
git push -u origin feat/issue-{N}-{slug}
gh pr create \
  --title "<issue title>" \
  --body "$(cat <<'EOF'
## Summary
<1–3 bullet points describing what was done>

## Test plan
- [ ] tests pass
- [ ] linting/formatting clean
- [ ] type checking clean
<any manual QA steps from the issue test plan>

Closes #{N}
EOF
)"
```

#### 4e. Conflict note (if applicable)

If this issue was flagged as conflicting with a later one, print:

```
⚠️  #535 conflicts with this PR. After this PR merges:
    git checkout feat/issue-535-…
    git rebase main
    git push --force-with-lease
```

### Phase 4d. Move project item to "In Review"

After creating the PR, if the issue belongs to a GitHub Project, move it to the "In Review" column:

```bash
# Get the project node ID and Status field info
gh project field-list <project-number> --owner "$OWNER" --format json \
  | jq '.fields[] | select(.name == "Status")'

# Find the "In Review" option ID from the field's options, then:
gh project item-edit \
  --id <item-node-id> \
  --field-id <status-field-id> \
  --project-id <project-node-id> \
  --single-select-option-id <in-review-option-id>
```

If the project has no "In Review" column, skip this step — do not create columns or restructure the board.

### Phase 5 — Summary

Print a table of everything that was done:

```
## /spi go — complete

| # | Issue | Branch | PR | Status |
|---|-------|--------|----|--------|
| #529 | fix: walk journal share sheet | feat/issue-529-… | #536 | ✅ PR open |
| #530 | fix: discovery card scroll-clip | feat/issue-530-… | #537 | ✅ PR open |
| #533 | feat: discoveries 2-col grid | feat/issue-533-… | #538 | ✅ PR open |
…

Project board: https://github.com/users/<owner>/projects/<N>

Conflict rebases needed after merging:
  - Merge #537 → then rebase feat/issue-533-… onto main
  - Merge #538 → then rebase feat/issue-535-… onto main
```

### Rules

- **Never push to main.** Branch → PR only.
- **Never skip a failing build.** Fix before moving to the next issue.
- **Never skip code review.** Run the code-reviewer agent after every implementation. Fix CRITICAL/HIGH before creating the PR.
- **One PR per issue.** Each PR must close exactly one issue.
- **Always cut from main.** Even if an issue conflicts with a predecessor, branch from `main` — not from the predecessor's branch. The developer merges and rebases in the right order.
- **Tests first.** No implementation before there are failing tests that prove the behaviour doesn't exist yet.
- **Print the sequence plan before starting** and wait for user confirmation.
- **Rebase onto `main` immediately before `git push`** — not when the branch was created. This eliminates merge conflicts from predecessor PRs that merged while this branch was being built. If a conflict arises during rebase, fix it once here rather than in a PR conflict resolver.
- **Squash merge.** Each PR should be squash-merged on GitHub so `main` history has one clean commit per feature. Micro-commits (`style: ruff format`, `fix: mypy`) disappear into the squash.
