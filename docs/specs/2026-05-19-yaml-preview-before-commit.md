# Spec: Workflow YAML preview & confirm before commit

## Problem

A stated definition of "good" (README): _"Thin and auditable: every action Githatch takes is a visible API call or a committed file."_ Today the task form does the opposite of auditable for its single most consequential action. In `App.tsx`, `handleTaskFormSubmit` / `handleEditFormSubmit` call `upsertWorkflowFile` immediately on form submit — the user never sees the YAML that gets committed to `.github/workflows/` in their repo. They are trusting a generator they cannot inspect, on a file that runs in their CI with their secrets. For an edit, they also can't see what changed versus the file already in the repo. This is a trust and correctness gap directly at odds with the project's core ethos, and a likely source of silent mistakes (wrong cron, wrong output destination).

## Proposed solution

Introduce a preview/confirm step inside `TaskForm.tsx` between form submission and the `onSubmit` callback. `TaskForm` gains local view state: `'form' | 'preview'`.

- On the form's submit, instead of calling `onSubmit` directly, generate the YAML (the form already produces it) and switch to `'preview'`.
- The preview renders the **exact** generated YAML string in a read-only block: monospace, `whitespace-pre`, `border-2 border-black`, scrollable, no re-formatting or re-parsing. The text shown must be byte-identical to what will be committed.
- Two controls in preview:
  - **← Edit** — return to `'form'`, preserving all field values.
  - **Commit to repo** — calls the existing `onSubmit(yaml, slug, config)` (unchanged signature; `App.tsx` handlers stay as-is). Shows the existing `loading` state on this button.
- **Edit-task diff:** when editing an existing task, show a minimal line-level diff above the YAML. `App.tsx` `handleEditTask` already fetches the existing file via `fetchFileContent`; thread that original content into `edit-task` (e.g. store it alongside `editingConfig`) and pass it to `TaskForm` as an optional `originalYaml` prop. Render a simple per-line diff (added lines prefixed `+`, removed `-`, unchanged context) — a small local diff helper in `src/lib/utils.ts` is sufficient; do not add a dependency. If `originalYaml` is absent (new task), skip the diff and show only the full YAML.
- Keep styling within the existing monochrome system; Tailwind only, no inline styles.

## Acceptance criteria

- Submitting the new-task form shows the YAML preview and does **not** call `upsertWorkflowFile` until "Commit to repo" is pressed.
- The previewed YAML string is byte-identical to the string passed to `onSubmit` (assert in a unit test).
- "← Edit" returns to the form with all previously entered values intact.
- Editing an existing task shows a line diff between the current repo file and the regenerated YAML; an unchanged field produces no diff lines for that region.
- New task (no original) shows full YAML with no diff section and no errors.
- `loading` disables the "Commit to repo" button and shows progress, matching current behaviour.
- Unit/component tests cover: preview gating (no commit before confirm), byte-identical assertion, edit-back round-trip preserving values, diff rendering for a changed field. Coverage ≥80% on changed files; existing tests must not regress.
- `pnpm lint && pnpm format:check && pnpm type-check && pnpm test --run` all clean.

## Owner

claude[bot]

## Priority

high
