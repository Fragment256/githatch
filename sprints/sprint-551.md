# Sprint 551 — Explore audit, cycle 187

**Date**: 2026-09-24
**Tests**: 686/686 (2 new)
**Bugs found**: 2

## Bug 1: scan-suspicious-patterns.mjs — mismatched-quote regex false positive

`/["'`][^"'`\s]{300,}["'`]/`allowed a`"` opener to match a `` ` `` closer (or any cross-quote combination). On a line where 300+ non-quote non-whitespace chars happen to span from one literal's opening quote to a different-style closing quote, the scanner would emit a false positive and block a legitimate commit.

Fixed: replaced the single pattern with alternating anchored groups `/"[^"\s]{300,}"|'[^'\s]{300,}'|`[^`\s]{300,}`/` so each arm requires matching delimiters.

## Bug 2: TaskList.tsx — outputRequestId not cancelled on fetchRuns deps change

`outputRequestId.current` was only incremented on component unmount (empty-dep `useEffect` cleanup). When `fetchRuns` deps changed (e.g., token or repo change), the `useEffect([fetchRuns])` cleanup incremented `fetchRunsRequestId.current` but NOT `outputRequestId.current`. An in-flight "View output" fetch from the prior context could resolve and display stale output from the old repo/token context.

Fixed: added `++outputRequestId.current` to the `useEffect([fetchRuns])` cleanup alongside `fetchRunsRequestId`.
