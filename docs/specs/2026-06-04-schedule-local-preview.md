---
title: Schedule local-time preview in TaskForm
date: 2026-06-04
status: done
owner: claude[bot]
---

## Problem

GitHub Actions cron schedules run in UTC. When a user sets "Daily 8am" they may expect their local timezone — a silent gotcha that causes tasks to fire at unexpected hours. There is currently no feedback in the form about when the schedule will actually fire.

Two failure modes:

1. User in UTC+2 creates "Daily 8am UTC" expecting 8am local → runs at 10am local.
2. User types a custom cron and doesn't know if it's valid until GitHub rejects it.

## Approach

Extend `cronLabel.ts` with a `nextCronRuns(expr, count)` function that returns the next N UTC `Date` objects for a valid cron expression (using the existing `nextCronRun` logic). In `TaskForm`, when a schedule is selected or typed, show the next 3 run times as:

```
Next runs (UTC)         Your time (UTC+2)
2026-06-05 08:00        2026-06-05 10:00
2026-06-06 08:00        2026-06-06 10:00
2026-06-07 08:00        2026-06-07 10:00
```

The local-time column only renders when `Intl.DateTimeFormat().resolvedOptions().timeZone` differs from `UTC`.

For invalid cron expressions in the custom input, show an inline validation error ("Invalid cron expression") rather than silently accepting them.

## Implementation

- `cronLabel.ts`:
  - Add `nextCronRuns(expr: string, count: number): Date[]` — calls `nextCronRun` in a loop with incremented start times.
  - Add `isValidCron(expr: string): boolean` — returns false for expressions that don't produce a valid next run.

- `TaskForm.tsx`:
  - After the schedule dropdown / custom cron input, render a `SchedulePreview` sub-component.
  - `SchedulePreview` accepts `expr: string` and computes `nextCronRuns(expr, 3)`.
  - For manual-only (empty schedule), render nothing.
  - For custom cron with an invalid expression, show "Invalid cron expression" in red below the input and disable the Preview/Submit button.
  - Format dates as `YYYY-MM-DD HH:mm` in UTC and local time using `Intl.DateTimeFormat`.

## Tests

- `cronLabel.test.ts`: `nextCronRuns('0 8 * * *', 3)` returns 3 dates all at 08:00 UTC on consecutive days; `isValidCron('0 8 * * *')` returns true; `isValidCron('99 99 * * *')` returns false.
- `TaskForm.test.tsx`: selecting a preset shows "Next runs" label; entering an invalid cron string shows "Invalid cron expression" and disables submit.

## Non-goals

- Timezone picker — always use `Intl.DateTimeFormat().resolvedOptions().timeZone` from the browser.
- DST transition edge cases — display only; no user action required.
- Cron expression builder / drag UI.
