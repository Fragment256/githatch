# GitHub Security Audit: Fragment256/githatch

## Audit Window: 2026-08-06 to 2026-08-11

**Audit completed**: 2026-09-10 by CEO agent  
**Context**: Malicious payload in eslint.config.js during this window  
**Credentials at risk**: `CLAUDE_CODE_OAUTH_TOKEN`, `GITHUB_TOKEN` (ephemeral, scoped)

---

## Executive Summary

✅ **No additional compromise indicators found**

- No unauthorized collaborators added
- No deploy keys or webhooks configured
- No suspicious commits beyond the payload injection/removal
- No workflow file modifications

⚠️ **Confirmed exposure**: 4 workflow runs executed `pnpm lint` with payload present:

- 2026-08-07 (run 31146824699)
- 2026-08-08 (run 31236728914, FAILED)
- 2026-08-09 (run 31292249831)
- 2026-08-10 (run 31352794223)

🔴 **Critical gap**: Cannot verify if secrets were exfiltrated or what the payload actually does (deobfuscation not attempted)

---

## Detailed Findings

### 1. Commit History

**Query**: All commits 2026-08-06 to 2026-08-11

| SHA      | Date             | Author      | Message                                        |
| -------- | ---------------- | ----------- | ---------------------------------------------- |
| 30def862 | 2026-08-06 04:52 | claude[bot] | chore: sprint log 2026-08-06                   |
| da416b91 | 2026-08-11 03:29 | claude[bot] | fix: remove malicious obfuscated payload (#45) |
| 9343cda0 | 2026-08-11 03:29 | claude[bot] | chore: sprint log 2026-08-11                   |

**Analysis**:

- `30def862` is the orphan commit that severed git history and contained the payload
- Only these 3 commits exist in the window
- All authored by claude[bot]
- No suspicious additional commits found

### 2. Pull Requests

**Query**: PRs created 2026-08-06 to 2026-08-11

| Number | Title                              | Author     | Created    | State  |
| ------ | ---------------------------------- | ---------- | ---------- | ------ |
| #45    | security: remove malicious payload | app/claude | 2026-08-11 | MERGED |

**Analysis**: Only PR was the security fix removing the payload

### 3. Issues

**Query**: Issues created 2026-08-06 to 2026-08-11

| Number | Title                                | Author     | Created    | State |
| ------ | ------------------------------------ | ---------- | ---------- | ----- |
| #44    | main branch git history was severed  | app/claude | 2026-08-10 | OPEN  |
| #46    | CRITICAL: malicious payload was live | app/claude | 2026-08-11 | OPEN  |

**Analysis**: Only issues are incident documentation

### 4. Repository Access Control

**Collaborators**: 1 user

- `lukemaxwell` (admin access) - legitimate owner

**Deploy keys**: None configured  
**Webhooks**: None configured

**Analysis**: ✅ No unauthorized access added

### 5. GitHub Actions Workflow Runs

**Query**: Runs during compromise window

| Run ID      | Date             | Workflow     | Result      | Branch | Event    |
| ----------- | ---------------- | ------------ | ----------- | ------ | -------- |
| 31072348054 | 2026-08-06 04:50 | daily-sprint | success     | main   | schedule |
| 31146824699 | 2026-08-07 04:15 | daily-sprint | success     | main   | schedule |
| 31236728914 | 2026-08-08 03:13 | daily-sprint | **failure** | main   | schedule |
| 31292249831 | 2026-08-09 03:21 | daily-sprint | success     | main   | schedule |
| 31352794223 | 2026-08-10 03:30 | daily-sprint | success     | main   | schedule |
| 31455238185 | 2026-08-11 03:23 | daily-sprint | success     | main   | schedule |

**Analysis**:

- Run 31072348054 (08-06): Created the orphan commit with payload
- Runs 31146824699, 31236728914, 31292249831, 31352794223 (08-07 to 08-10): **Executed with payload present**
- Run 31455238185 (08-11): Detected and removed payload

⚠️ **4 confirmed runs** where `pnpm lint` executed the malicious code with CI credentials potentially available

### 6. Workflow File Changes

**Query**: Changes to .github/workflows/\* during window

**Result**: None found

**Analysis**: ✅ No workflow modifications during compromise

### 7. Organization Audit Log

**Query**: Fragment256 org audit log 2026-08-06 to 2026-08-11

**Result**: 404 Not Found (Fragment256 may be a personal account, not an org)

**Analysis**: Cannot access org-level audit trail

---

## Risk Assessment

### Confirmed Exposures

1. ✅ **Malicious code executed in CI** (4 runs: 08-07, 08-08, 08-09, 08-10)
2. ✅ **Environment potentially contained**:
   - `CLAUDE_CODE_OAUTH_TOKEN` (long-lived, write access to Claude API)
   - `GITHUB_TOKEN` (ephemeral, scoped: contents, issues, PRs, id-token)

### Unknowns (Require Deeper Forensics)

1. ❓ **Was payload actually executed** or just loaded by Node?
2. ❓ **Did payload exfiltrate credentials** from environment?
3. ❓ **Where did exfiltrated data go** (if anywhere)?
4. ❓ **Payload deobfuscation** - what does it actually do?
5. ❓ **How was payload injected** - tool-call transcripts hidden by claude-code-action

### Mitigations Already Applied

1. ✅ Payload removed (PR #45)
2. ✅ Pre-commit scanner added (PR #51)
3. ✅ Incident documented (#44, #46, #47)

---

## Recommendations

### Immediate (Luke Required)

1. 🔴 **Rotate `CLAUDE_CODE_OAUTH_TOKEN` immediately** - treat as compromised
2. 🔴 **Decide on #44** (git history): force-push to restore or accept orphan
3. 🔴 **Grant workflows permission** to bot so Actions pinning (#47) can be applied

### Follow-up

1. **Deobfuscate payload** in isolated sandbox to understand actual behavior
2. **Review tool-call transcripts** for run 31072348054 (if accessible to humans)
3. **Monitor for suspicious activity** using rotated credentials

### Process Improvements (Already Done)

✅ Pre-commit hook prevents future payload injection  
⏳ Pin GitHub Actions to SHAs (blocked on workflows permission)

---

## Conclusion

**No evidence of additional compromise** beyond the confirmed payload injection and execution.

**However**: Cannot definitively prove secrets were NOT exfiltrated. The prudent course is to:

1. Rotate `CLAUDE_CODE_OAUTH_TOKEN` immediately
2. Monitor for abuse of old token
3. Deobfuscate payload for forensics

**Audit status**: COMPLETE (blocker #2 from FRA-6)

---

## References

- GitHub issue #46: https://github.com/Fragment256/githatch/issues/46
- GitHub issue #44: https://github.com/Fragment256/githatch/issues/44
- GitHub issue #47: https://github.com/Fragment256/githatch/issues/47
- PR #45: https://github.com/Fragment256/githatch/pull/45
- PR #51: https://github.com/Fragment256/githatch/pull/51
