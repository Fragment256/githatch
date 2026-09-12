# Sprint 253 log — Explore audit

**Date:** 2026-09-12
**Sprint:** 253 (day 3 of cycle 84 — Explore audit)
**Status:** 1 bug fixed. 582/582 tests passing.

## Baseline checks

- `format:check`: clean
- `type-check`: clean
- `lint` (--max-warnings=0): clean
- `test`: 582/582 ✓ (581 + 1 new regression test)

## Explore audit findings

### MEDIUM — Unpinned action tags in `SEND_GMAIL_YAML` (`src/lib/tools.ts`)

`actions/checkout@v4` and `dawidd6/action-send-mail@v3` were floating version tags. The rest of the codebase already used pinned commit SHAs (`ACTIONS_CHECKOUT_REF` etc. in `yamlGenerator.ts`). The Gmail tool workflow runs with access to `GMAIL_USERNAME` and `GMAIL_APP_PASSWORD` repo secrets, making a tag mutation a credential-theft vector.

**Fix:**

- Exported `ACTIONS_CHECKOUT_REF` from `yamlGenerator.ts`
- Added `DAWIDD6_SEND_MAIL_REF = '4226df7daafa6fc901a43789c49bf7ab309066e7' // v3`
- Updated `SEND_GMAIL_YAML` template to use both pinned SHAs
- Added regression test: `send-gmail yaml uses pinned SHA refs, not floating version tags`

## Commit

`(log commit)`

**Next sprint:** 254 (day 1 — baseline, cycle 85).
