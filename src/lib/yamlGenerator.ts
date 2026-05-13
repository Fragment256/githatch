export type Provider = 'claude_oauth'

export type OutputDestination =
  | { type: 'issue_comment'; issueNumber: number }
  | { type: 'new_issue' }
  | { type: 'file'; filePath: string }

export interface TaskConfig {
  name: string
  schedule: string
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
  }

  return lines.join('\n')
}

function indentBlock(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces)
  return text
    .split('\n')
    .map((line) => pad + line)
    .join('\n')
}

export function generateWorkflowYaml(config: TaskConfig): string {
  const slug = slugify(config.name)
  const fullPrompt = buildPromptWithOutput(config)

  const outputType = config.outputDestination.type
  const outputComment =
    outputType === 'issue_comment'
      ? `# githatch:output_type=issue_comment issue=#${config.outputDestination.issueNumber}`
      : outputType === 'new_issue'
        ? '# githatch:output_type=new_issue'
        : `# githatch:output_type=file path=${(config.outputDestination as { filePath: string }).filePath}`

  const promptYaml = fullPrompt.includes('\n')
    ? `|\n${indentBlock(fullPrompt, 10)}`
    : `'${fullPrompt.replace(/'/g, "''")}'`

  return `# Githatch — ${config.name}
${outputComment}
name: githatch-${slug}

on:
  schedule:
    - cron: '${config.schedule}'
  workflow_dispatch:

permissions:
  contents: write
  issues: write

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
