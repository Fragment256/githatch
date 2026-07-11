---
title: Failure summary banner in task list
date: 2026-07-10
status: done
owner: claude[bot]
---

# Spec: Failure summary banner in task list

## Problem

`TaskList` renders a per-card `LastRunIndicator` badge (Failed / Cancelled / Running), but that state lives only inside each `TaskRow` — the parent has no visibility into it. A user with several scheduled tasks has no way to tell "is anything broken?" without opening every card individually. This works against the README's "zero-friction UX" goal, especially since failures are silent otherwise (no webhooks, polled state only).

## Proposed solution

Lift last-run state from `TaskRow` up to `TaskList` via a callback prop:

- `TaskRow` gains an `onLastRunChange(slug, run)` prop, called whenever its `lastRun` state changes (initial fetch and the post-trigger poll). Stored in a ref inside `TaskRow` so effect dependency arrays stay stable.
- `TaskList` holds `lastRuns: Record<string, WorkflowRun | null>`, updated via the callback, and renders a banner above the task list when `count(hasFailed) > 0`:
  `"{failedCount} of {tasks.length} tasks failed last run"` — same monochrome `border-2 border-black bg-black` treatment as other status chrome.
- "Failed" reuses the exact same condition as the existing per-card badge (`status === 'completed' && conclusion !== 'success'`), so cancelled runs count too and the banner never disagrees with the badges a user sees after opening a card.
- No new API calls — this only aggregates state each `TaskRow` already fetches.

## Acceptance criteria

- Banner appears when one or more tasks' last run is Failed or Cancelled; absent when all succeeded, are still Running, or have no runs yet.
- Banner count updates live if a task fails while another is being polled after a manual trigger.
- No additional GitHub API calls introduced.
- Unit tests cover: banner shown with correct count across multiple tasks, banner absent on all-success, banner absent on Running-only.
- `pnpm lint && pnpm format --check && pnpm type-check && pnpm test` all clean.

## Owner

claude[bot]

## Priority

medium
