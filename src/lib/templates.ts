import seDailySprintYaml from '../../.github/workflows/githatch-senior-engineer-daily-sprint.yml?raw'
import sprintPlanningYaml from '../../.github/workflows/githatch-sprint-planning.yml?raw'
import { taskConfigFromYaml, type TaskConfig } from './yamlGenerator'

type TemplateBase = {
  id: string
  name: string
  description: string
  defaultTaskName: string
}

type YamlTemplate = TemplateBase & { yaml: string; config?: never }
type ConfigTemplate = TemplateBase & { config: Partial<TaskConfig>; yaml?: never }

export type Template = YamlTemplate | ConfigTemplate

function parseScheduleFromYaml(yaml: string): string | undefined {
  const match = yaml.match(/^ {4}- cron: '([^']+)'/m)
  return match ? match[1] : undefined
}

export function templateToConfig(t: Template): TaskConfig {
  if (t.config !== undefined) {
    return {
      name: t.defaultTaskName,
      provider: 'claude_oauth',
      prompt: '',
      outputDestination: { type: 'new_issue' },
      ...t.config,
    }
  }
  const schedule = parseScheduleFromYaml(t.yaml)
  return taskConfigFromYaml(t.defaultTaskName, schedule, t.yaml)
}

export const TEMPLATES: Template[] = [
  {
    id: 'se-daily-sprint',
    name: 'SE Daily Sprint',
    description:
      'Runs nightly — fixes CI, ships from roadmap and issues, implements existing specs. Never plans.',
    defaultTaskName: 'Senior Engineer Daily Sprint',
    yaml: seDailySprintYaml,
  },
  {
    id: 'sprint-planning',
    name: 'Sprint Planning',
    description:
      'Opus-powered planning agent — assesses state, updates roadmap, writes specs. Trigger manually before each sprint.',
    defaultTaskName: 'Sprint Planning',
    yaml: sprintPlanningYaml,
  },
  {
    id: 'weekly-status-digest',
    name: 'Weekly Status Digest',
    description:
      'Every Monday — summarises the last 7 days of commits, merged PRs, and closed issues into a digest with Shipped / In Progress / Notable sections.',
    defaultTaskName: 'Weekly Status Digest',
    config: {
      schedule: '0 9 * * 1',
      prompt: `Summarise the last 7 days of activity in this repo. Use \`git log --since='7 days ago'\`, \`gh pr list --state merged --limit 20\`, and \`gh issue list --state closed --limit 20\`. Write a digest with three sections: **Shipped** (merged PRs and closed issues), **In Progress** (open PRs and active issues), and **Notable** (anything that stands out: large diffs, long discussions, recently reopened items). Keep each section to 3–5 bullet points. Be concise and factual.`,
      outputDestination: { type: 'issue_comment', issueNumber: 1 },
    },
  },
  {
    id: 'stale-issue-triage',
    name: 'Stale Issue Triage',
    description:
      'Daily — finds open issues with no activity in 14+ days, groups them by status, and posts a triage summary.',
    defaultTaskName: 'Stale Issue Triage',
    config: {
      schedule: '0 8 * * *',
      prompt: `Audit open issues in this repo. Run \`gh issue list --state open --json number,title,updatedAt,labels,comments --limit 100\` and find issues with no update in 14+ days. Group them into three buckets: **Needs Info** (waiting on a response or clarification), **Ready** (actionable, no clear blocker), and **Stale** (no clear next step, candidate for closure). List each issue by number and title. Keep the summary concise. Title the new issue "Stale Issue Triage — <today's date YYYY-MM-DD>".`,
      outputDestination: { type: 'new_issue' },
    },
  },
  {
    id: 'dependency-update-digest',
    name: 'Dependency Update Digest',
    description:
      'Weekly — identifies outdated dependencies, notes breaking changes, and recommends a safe upgrade order.',
    defaultTaskName: 'Dependency Update Digest',
    config: {
      schedule: '0 9 * * 1',
      prompt: `Check for outdated dependencies in this repository. Run the appropriate outdated check (\`pnpm outdated\`, \`npm outdated\`, or \`yarn outdated\`) and identify all packages with available updates. For each, note the current version, the latest version, and whether the bump is patch, minor, or major. Flag major-version updates that have known breaking changes. Recommend a safe upgrade order, grouping patch and minor updates together. Title the new issue "Dependency Update Digest — <today's date YYYY-MM-DD>".`,
      outputDestination: { type: 'new_issue' },
    },
  },
  {
    id: 'docs-freshness-check',
    name: 'Docs Freshness Check',
    description:
      'Weekly — scans docs/ and README.md for references to files, commands, or APIs that no longer exist.',
    defaultTaskName: 'Docs Freshness Check',
    config: {
      schedule: '0 9 * * 1',
      prompt: `Audit \`docs/\` and \`README.md\` for stale references. For each documentation file, check for: file paths that no longer exist in the repo, commands referencing removed scripts or flags, and environment variables or config keys not present in the codebase. For each stale reference, report the file name, approximate line number, the stale text, and a one-line explanation. If everything is accurate, say so. Title the new issue "Docs Freshness Check — <today's date YYYY-MM-DD>".`,
      outputDestination: { type: 'new_issue' },
    },
  },
  {
    id: 'release-notes-drafter',
    name: 'Release Notes Drafter',
    description:
      'On demand — compares the last two tags, groups merged PRs by type, and drafts formatted release notes as a new issue.',
    defaultTaskName: 'Release Notes Drafter',
    config: {
      prompt: `Draft release notes for the next release. First run \`git tag --sort=-version:refname | head -5\` to find the most recent tag (e.g. v1.2.3). Then run \`git log <latest-tag>..HEAD --oneline --no-merges\` to list commits since that tag, and \`gh pr list --state merged --base main --json number,title,mergedAt,labels --limit 50\` to get merged PRs. Group the PRs and commits into sections: **Features** (feat:), **Bug Fixes** (fix:), **Performance** (perf:), **Chores & Dependencies** (chore:, deps:), and **Other**. Write a clean, user-facing changelog entry — omit purely internal changes. If there are no meaningful changes, say so. Title the new issue "Release Notes Draft — <next inferred version>".`,
      outputDestination: { type: 'new_issue' },
    },
  },
  {
    id: 'open-pr-nudge',
    name: 'Open PR Nudge',
    description:
      'Daily (weekdays) — finds pull requests open for 3+ days without a review and posts a digest so nothing gets lost.',
    defaultTaskName: 'Open PR Nudge',
    config: {
      schedule: '0 9 * * 1-5',
      prompt: `Find pull requests that need attention. Run \`gh pr list --state open --json number,title,author,createdAt,reviewDecision,isDraft --limit 50\`. Filter out draft PRs. For each non-draft PR open for 3 or more days without an approved review (reviewDecision not APPROVED), list it with: PR number, title, author, days open, and review status. Sort by days open descending. If all open PRs have recent activity or are approved, say "All open PRs are on track." Title the new issue "Open PR Nudge — <today's date YYYY-MM-DD>".`,
      outputDestination: { type: 'new_issue' },
    },
  },
  {
    id: 'security-vulnerability-scan',
    name: 'Security Vulnerability Scan',
    description:
      'Weekly — runs the package manager audit, groups findings by severity, and flags anything high or critical.',
    defaultTaskName: 'Security Vulnerability Scan',
    config: {
      schedule: '0 9 * * 1',
      prompt: `Run a security audit of this repository's dependencies. Detect the package manager: check for \`pnpm-lock.yaml\` (use \`pnpm audit --json\`), \`yarn.lock\` (use \`yarn audit --json\`), or default to \`npm audit --json\`. Parse the JSON output and group findings by severity: **Critical**, **High**, **Moderate**, **Low**. For Critical and High items, include the package name, vulnerability title, and the recommended fix or version range. For Moderate and Low, just list counts. If there are no vulnerabilities, say so explicitly. Title the new issue "Security Audit — <today's date YYYY-MM-DD>".`,
      outputDestination: { type: 'new_issue' },
    },
  },
]
