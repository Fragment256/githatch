const ACTIONS_CHECKOUT_REF = '11d5960a326750d5838078e36cf38b85af677262' // v4
const CLAUDE_CODE_ACTION_REF = '9d7150bc8a3dae8149739a88019d192b579ad90c' // v1
const CODEX_ACTION_REF = '52fe01ec70a42f454c9d2ebd47598f9fd6893d56' // v1

export type Provider = 'claude_oauth' | 'codex' | 'synthetic'

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
  model?: string
  prompt: string
  outputDestination: OutputDestination
}

export const PROVIDER_MODELS: Record<Provider, { value: string; label: string }[]> = {
  claude_oauth: [
    { value: '', label: 'Default (Sonnet 4.6)' },
    { value: 'claude-opus-4-8', label: 'Opus 4.8 — most capable' },
    { value: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
    { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 — fastest' },
  ],
  codex: [{ value: '', label: 'Default' }],
  synthetic: [
    { value: 'kimi-k2.6', label: 'Kimi K2.6' },
    { value: 'minimax-m2.5', label: 'MiniMax M2.5' },
    { value: 'glm-5.1', label: 'GLM 5.1' },
    { value: 'glm-4.7-flash', label: 'GLM 4.7 Flash' },
  ],
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
    const fp = outputDestination.filePath
    if (fp.endsWith('/')) {
      lines.push(
        `\nWhen done, create a new file in \`${fp}\` named with today's date in YYYY-MM-DD format followed by \`-report.md\` (e.g. \`${fp}2026-01-01-report.md\`) and write your response there, then commit: git add ${fp} && git commit -m "chore: add report to ${fp}" && git push`,
      )
    } else {
      lines.push(
        `\nWhen done, write your response to the file \`${fp}\` and commit it: git add ${fp} && git commit -m "chore: update ${fp}" && git push`,
      )
    }
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
    if (!n) return { type: 'new_issue' }
    return { type: 'issue_comment', issueNumber: n }
  }
  if (type === 'file') {
    const filePath = params?.match(/path=(\S+)/)?.[1] ?? ''
    return { type: 'file', filePath }
  }
  if (type === 'pull_request') return { type: 'pull_request' }
  if (type === 'agent_managed') return { type: 'agent_managed' }
  return { type: 'new_issue' }
}

export function parseModel(yaml: string): string | undefined {
  const match = yaml.match(/^# githatch:model=(\S+)$/m)
  return match ? match[1] : undefined
}

export function parseProvider(yaml: string): Provider {
  const match = yaml.match(/^# githatch:provider=(\S+)$/m)
  if (!match) return 'claude_oauth'
  const p = match[1]
  if (p === 'codex' || p === 'synthetic') return p
  return 'claude_oauth'
}

export function parsePromptFromYaml(yaml: string): string {
  const blockMatch = yaml.match(/ {10}prompt: \|\n([\s\S]+)$/)
  if (blockMatch) {
    const lines = blockMatch[1].split('\n')
    // Detect actual indentation from first non-empty line to handle both old (10) and new (12) format
    const firstContentLine = lines.find((l) => l.trim().length > 0) ?? ''
    const indent = firstContentLine.match(/^( *)/)?.[1].length ?? 10
    const full = lines
      .map((line) => (line.startsWith(' '.repeat(indent)) ? line.slice(indent) : line))
      .join('\n')
      .trimEnd()
    const marker = '\n\nWhen done,'
    const idx = full.lastIndexOf(marker)
    return idx === -1 ? full.trimEnd() : full.slice(0, idx).trimEnd()
  }
  const singleMatch = yaml.match(/ {10}prompt: '(.*)'$/m)
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
    provider: parseProvider(yaml),
    model: parseModel(yaml),
    prompt: parsePromptFromYaml(yaml),
    outputDestination: parseOutputDestination(yaml),
  }
}

function buildAgentStep(config: TaskConfig, promptYaml: string, allowedTools: string): string {
  if (config.provider === 'codex') {
    const modelLine = config.model ? `\n          model: ${config.model}` : ''
    return `      - name: Run Codex agent
        uses: openai/codex-action@${CODEX_ACTION_REF} # v1
        with:
          openai-api-key: \${{ secrets.OPENAI_API_KEY }}${modelLine}
          sandbox: danger-full-access
          prompt: ${promptYaml}`
  }

  if (config.provider === 'synthetic') {
    const syntheticModel = config.model || 'kimi-k2.6'
    return `      - name: Run Synthetic agent
        uses: openai/codex-action@${CODEX_ACTION_REF} # v1
        env:
          OPENAI_BASE_URL: https://api.synthetic.new/openai/v1
        with:
          openai-api-key: \${{ secrets.SYNTHETIC_API_KEY }}
          model: ${syntheticModel}
          sandbox: danger-full-access
          prompt: ${promptYaml}`
  }

  const modelFlag = config.model ? ` --model ${config.model}` : ''
  return `      - name: Run Claude agent
        uses: anthropics/claude-code-action@${CLAUDE_CODE_ACTION_REF} # v1
        with:
          claude_code_oauth_token: \${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          claude_args: --allowedTools "${allowedTools}"${modelFlag}
          prompt: ${promptYaml}`
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

  const allowedTools =
    outputType === 'issue_comment' || outputType === 'new_issue'
      ? 'Bash,Read'
      : 'Bash,Write,Edit,Read'

  const promptYaml = fullPrompt.includes('\n')
    ? `|\n${indentBlock(fullPrompt, 12)}`
    : `'${fullPrompt.replace(/'/g, "''")}'`

  const onBlock = config.schedule
    ? `on:\n  schedule:\n    - cron: '${config.schedule}'\n  workflow_dispatch:`
    : `on:\n  workflow_dispatch:`

  const agentStep = buildAgentStep(config, promptYaml, allowedTools)

  const modelComment = config.model ? `\n# githatch:model=${config.model}` : ''

  return `# Githatch — ${config.name}
${outputComment}
# githatch:provider=${config.provider}${modelComment}
name: githatch-${slug}

${onBlock}

permissions:
  contents: write
  issues: write
  id-token: write${needsPrPermission ? '\n  pull-requests: write' : ''}

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@${ACTIONS_CHECKOUT_REF} # v4

${agentStep}
`
}
