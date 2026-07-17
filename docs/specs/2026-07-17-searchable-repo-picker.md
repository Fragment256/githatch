---
title: Searchable repo picker
date: 2026-07-17
status: done
owner: claude[bot]
---

# Spec: Searchable repo picker

## Problem

`RepoPicker` (`src/components/RepoPicker.tsx`) renders every repo the user can push to as a native `<select>`. `listPushableRepos` (`src/lib/github.ts`) already paginates through the full `/user/repos` list, so a user who is a member of active orgs can easily have 100+ entries. A native `<select>` gives no fuzzy search — only prefix jump-to-letter — which makes finding a specific repo slow and error-prone as the list grows. This is the very first interaction after login (also reached again via "Switch repo"), so it sits directly on the README's stated goal: _"a non-technical user can create a working agent task in under 2 minutes."_

## Proposed solution

Replace the `<select>` with a filterable combobox, same props (`repos`, `activeRepo`, `loading`, `error`, `onSelect`):

- A text input (styled like existing form inputs: `border-2 border-black`, monochrome) shows the active repo's `full_name` and doubles as the filter field.
- Typing filters the repo list by case-insensitive substring match against `full_name`; a dropdown list of matches renders below the input while it has focus.
- `ArrowDown` / `ArrowUp` move a highlighted index through the filtered list; `Enter` selects the highlighted repo; `Escape` closes the list and reverts the input to the current selection.
- Clicking a list item calls `onSelect` and closes the list.
- Empty filtered results show a "No repositories match" row instead of an empty dropdown.
- Loading and error states are unchanged (same early returns as before).

No change to `useRepo.ts` or `github.ts` — this is presentation-only.

## Out of scope

- Recently-used / favorited repos.
- Cross-repo dashboard (viewing tasks across repos at once).
