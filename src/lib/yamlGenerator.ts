export type Provider = 'claude_oauth'

export type OutputDestination =
  | { type: 'issue_comment'; issueNumber: number }
  | { type: 'new_issue' }
  | { type: 'file'; filePath: string }
  | { type: 'pull_request' }
  | { type: 'agent_managed' }

export interface TaskConfig {
  name: string
  schedule?: string
  provider: Provider
  prompt: string
  outputDestination: OutputDestination
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .slice(0, 40)
    .replace(/^-+|-+$/g, '')
}

function buildPromptWithOutput(config: TaskConfig): string {
  const { prompt, outputDestination } = config
  const lines = [prompt.trim()]

  if (outputDestination.type === 'issue_comment') {
    lines.push(
      `\nWhen done, post your response as a comment on issue #${outputDestination.issueNumber} using the GitHub CLI: gh issue comment ${outputDestination.issueNumber} --body "<your response>"`,
    )
  } else if (outputDestination.type === 'new_issue') {
    lines.push(
      `\nWhen done, create a new GitHub issue with your findings using: gh issue create --title "<descriptive title>" --body "<your response>"`,
    )
  } else if (outputDestination.type === 'file') {
    lines.push(
      `\nWhen done, write your response to the file \`${outputDestination.filePath}\` and commit it: git add ${outputDestination.filePath} && git commit -m "chore: update ${outputDestination.filePath}" && git push`,
    )
  } else if (outputDestination.type === 'pull_request') {
    lines.push(
      `\nWhen done, open a pull request with your changes using: gh pr create --title "<descriptive title>" --body "<summary>". Reference any issue you addressed with "Closes #N" in the body. Comment on that issue to confirm the PR is raised.`,
    )
  }
  // agent_managed: no appended instruction — prompt is self-contained

  return lines.join('\n')
}

function indentBlock(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces)
  return text
    .split('\n')
    .map((line) => pad + line)
    .join('\n')
}

export function parseOutputDestination(yaml: string): OutputDestination {
  const match = yaml.match(/^# githatch:output_type=(\S+)(?:\s+(.+))?$/m)
  if (!match) return { type: 'new_issue' }
  const [, type, params] = match
  if (type === 'issue_comment') {
    const n = parseInt(params?.match(/issue=#(\d+)/)?.[1] ?? '0', 10)
    return { type: 'issue_comment', issueNumber: n || 1 }
  }
  if (type === 'file') {
    const filePath = params?.match(/path=(\S+)/)?.[1] ?? ''
    return { type: 'file', filePath }
  }
  if (type === 'pull_request') return { type: 'pull_request' }
  if (type === 'agent_managed') return { type: 'agent_managed' }
  return { type: 'new_issue' }
}

export function parsePromptFromYaml(yaml: string): string {
  const blockMatch = yaml.match(/ {10}prompt: \|\n([\s\S]+)$/)
  if (blockMatch) {
    const full = blockMatch[1]
      .split('\n')
      .map((line) => (line.startsWith(' '.repeat(10)) ? line.slice(10) : line))
      .join('\n')
      .trimEnd()
    return full.split('\n\nWhen done,')[0].trimEnd()
  }
  const singleMatch = yaml.match(/ {10}prompt: '([\s\S]+)'$/)
  if (singleMatch) return singleMatch[1].replace(/''/g, "'")
  return ''
}

export function taskConfigFromYaml(
  name: string,
  schedule: string | undefined,
  yaml: string,
): TaskConfig {
  return {
    name,
    schedule: schedule || undefined,
    provider: 'claude_oauth',
    prompt: parsePromptFromYaml(yaml),
    outputDestination: parseOutputDestination(yaml),
  }
}

export function generateWorkflowYaml(config: TaskConfig): string {
  const slug = slugify(config.name)
  const fullPrompt = buildPromptWithOutput(config)

  const outputType = config.outputDestination.type
  const outputComment =
    outputType === 'issue_comment'
      ? `# githatch:output_type=issue_comment issue=#${(config.outputDestination as { issueNumber: number }).issueNumber}`
      : outputType === 'new_issue'
        ? '# githatch:output_type=new_issue'
        : outputType === 'file'
          ? `# githatch:output_type=file path=${(config.outputDestination as { filePath: string }).filePath}`
          : outputType === 'pull_request'
            ? '# githatch:output_type=pull_request'
            : '# githatch:output_type=agent_managed'

  const needsPrPermission = outputType === 'pull_request' || outputType === 'agent_managed'

  const promptYaml = fullPrompt.includes('\n')
    ? `|\n${indentBlock(fullPrompt, 10)}`
    : `'${fullPrompt.replace(/'/g, "''")}'`

  const onBlock = config.schedule
    ? `on:\n  schedule:\n    - cron: '${config.schedule}'\n  workflow_dispatch:`
    : `on:\n  workflow_dispatch:`

  return `# Githatch — ${config.name}
${outputComment}
name: githatch-${slug}

${onBlock}

permissions:
  contents: write
  issues: write${needsPrPermission ? '\n  pull-requests: write' : ''}

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Claude agent
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: \${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          prompt: ${promptYaml}
`
}
