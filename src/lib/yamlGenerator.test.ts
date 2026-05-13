import { describe, it, expect } from 'vitest'
import {
  generateWorkflowYaml,
  slugify,
  parseOutputDestination,
  parsePromptFromYaml,
  taskConfigFromYaml,
  type TaskConfig,
} from './yamlGenerator'

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('My Weekly Digest')).toBe('my-weekly-digest')
  })

  it('strips non-alphanumeric characters', () => {
    expect(slugify('AI News! (v2)')).toBe('ai-news-v2')
  })

  it('collapses consecutive hyphens', () => {
    expect(slugify('foo  --  bar')).toBe('foo-bar')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  hello world  ')).toBe('hello-world')
  })

  it('truncates to 40 chars', () => {
    const long = 'a'.repeat(50)
    expect(slugify(long).length).toBeLessThanOrEqual(40)
  })
})

describe('generateWorkflowYaml — Claude OAuth provider', () => {
  const base: TaskConfig = {
    name: 'Weekly Digest',
    schedule: '0 9 * * 1',
    provider: 'claude_oauth',
    prompt: "Summarise this week's activity and post a comment on issue #42.",
    outputDestination: { type: 'issue_comment', issueNumber: 42 },
  }

  it('produces a string', () => {
    const yaml = generateWorkflowYaml(base)
    expect(typeof yaml).toBe('string')
    expect(yaml.length).toBeGreaterThan(0)
  })

  it('includes the cron schedule', () => {
    const yaml = generateWorkflowYaml(base)
    expect(yaml).toContain("'0 9 * * 1'")
  })

  it('includes the workflow_dispatch trigger', () => {
    const yaml = generateWorkflowYaml(base)
    expect(yaml).toContain('workflow_dispatch')
  })

  it('uses the claude-code-action with OAuth token', () => {
    const yaml = generateWorkflowYaml(base)
    expect(yaml).toContain('anthropics/claude-code-action')
    expect(yaml).toContain('CLAUDE_CODE_OAUTH_TOKEN')
  })

  it('embeds the prompt', () => {
    const yaml = generateWorkflowYaml(base)
    expect(yaml).toContain("Summarise this week's activity")
  })

  it('sets output destination to issue comment', () => {
    const yaml = generateWorkflowYaml(base)
    expect(yaml).toContain('42')
  })
})

describe('generateWorkflowYaml — output destinations', () => {
  const baseTask = (output: TaskConfig['outputDestination']): TaskConfig => ({
    name: 'Test Task',
    schedule: '0 8 * * *',
    provider: 'claude_oauth',
    prompt: 'Do something.',
    outputDestination: output,
  })

  it('generates new_issue output type', () => {
    const yaml = generateWorkflowYaml(baseTask({ type: 'new_issue' }))
    expect(yaml).toContain('new_issue')
  })

  it('generates file commit output type with path', () => {
    const yaml = generateWorkflowYaml(baseTask({ type: 'file', filePath: 'reports/weekly.md' }))
    expect(yaml).toContain('reports/weekly.md')
  })

  it('generates pull_request output type with gh pr create instruction', () => {
    const yaml = generateWorkflowYaml(baseTask({ type: 'pull_request' }))
    expect(yaml).toContain('pull_request')
    expect(yaml).toContain('gh pr create')
    expect(yaml).toContain('pull-requests: write')
  })

  it('generates agent_managed output type with no appended instruction', () => {
    const yaml = generateWorkflowYaml(baseTask({ type: 'agent_managed' }))
    expect(yaml).toContain('agent_managed')
    expect(yaml).toContain('pull-requests: write')
    expect(yaml).not.toContain('gh pr create')
    expect(yaml).not.toContain('gh issue')
  })

  it('does not include pull-requests permission for non-PR types', () => {
    const yaml = generateWorkflowYaml(baseTask({ type: 'new_issue' }))
    expect(yaml).not.toContain('pull-requests')
  })
})

describe('generateWorkflowYaml — schedule presets', () => {
  const task = (schedule: string): TaskConfig => ({
    name: 'x',
    schedule,
    provider: 'claude_oauth',
    prompt: 'y',
    outputDestination: { type: 'new_issue' },
  })

  it('accepts daily 8am preset', () => {
    const yaml = generateWorkflowYaml(task('0 8 * * *'))
    expect(yaml).toContain("'0 8 * * *'")
  })

  it('accepts every 6 hours preset', () => {
    const yaml = generateWorkflowYaml(task('0 */6 * * *'))
    expect(yaml).toContain("'0 */6 * * *'")
  })
})

describe('generateWorkflowYaml — manual only (no schedule)', () => {
  const manualTask: TaskConfig = {
    name: 'Ad Hoc Report',
    provider: 'claude_oauth',
    prompt: 'Do something.',
    outputDestination: { type: 'new_issue' },
  }

  it('omits the schedule block when schedule is undefined', () => {
    const yaml = generateWorkflowYaml(manualTask)
    expect(yaml).not.toContain('schedule:')
    expect(yaml).not.toContain('cron:')
  })

  it('still includes workflow_dispatch trigger', () => {
    const yaml = generateWorkflowYaml(manualTask)
    expect(yaml).toContain('workflow_dispatch')
  })
})

describe('parseOutputDestination', () => {
  it('parses issue_comment with issue number', () => {
    const yaml = '# githatch:output_type=issue_comment issue=#42\nname: test'
    const dest = parseOutputDestination(yaml)
    expect(dest.type).toBe('issue_comment')
    if (dest.type === 'issue_comment') expect(dest.issueNumber).toBe(42)
  })

  it('parses new_issue', () => {
    const yaml = '# githatch:output_type=new_issue\nname: test'
    expect(parseOutputDestination(yaml)).toEqual({ type: 'new_issue' })
  })

  it('parses file with path', () => {
    const yaml = '# githatch:output_type=file path=reports/weekly.md\nname: test'
    const dest = parseOutputDestination(yaml)
    expect(dest.type).toBe('file')
    if (dest.type === 'file') expect(dest.filePath).toBe('reports/weekly.md')
  })

  it('parses pull_request', () => {
    const yaml = '# githatch:output_type=pull_request\nname: test'
    expect(parseOutputDestination(yaml)).toEqual({ type: 'pull_request' })
  })

  it('parses agent_managed', () => {
    const yaml = '# githatch:output_type=agent_managed\nname: test'
    expect(parseOutputDestination(yaml)).toEqual({ type: 'agent_managed' })
  })

  it('defaults to new_issue when comment is absent', () => {
    expect(parseOutputDestination('name: test')).toEqual({ type: 'new_issue' })
  })
})

describe('parsePromptFromYaml', () => {
  const makeConfig = (overrides: Partial<TaskConfig> = {}): TaskConfig => ({
    name: 'Test Task',
    provider: 'claude_oauth',
    prompt: 'Summarise the repo activity.',
    outputDestination: { type: 'new_issue' },
    ...overrides,
  })

  it('round-trips a multiline prompt', () => {
    const prompt = 'Line one.\nLine two.\nLine three.'
    const yaml = generateWorkflowYaml(makeConfig({ prompt }))
    expect(parsePromptFromYaml(yaml)).toBe(prompt)
  })

  it('round-trips a single-line prompt', () => {
    const prompt = 'Do the thing.'
    const yaml = generateWorkflowYaml(makeConfig({ prompt }))
    expect(parsePromptFromYaml(yaml)).toBe(prompt)
  })

  it('strips the When done instruction from issue_comment output', () => {
    const prompt = 'Check open PRs.'
    const yaml = generateWorkflowYaml(
      makeConfig({ prompt, outputDestination: { type: 'issue_comment', issueNumber: 7 } }),
    )
    expect(parsePromptFromYaml(yaml)).toBe(prompt)
  })

  it('strips the When done instruction from file output', () => {
    const prompt = 'Generate the weekly report.'
    const yaml = generateWorkflowYaml(
      makeConfig({ prompt, outputDestination: { type: 'file', filePath: 'out.md' } }),
    )
    expect(parsePromptFromYaml(yaml)).toBe(prompt)
  })

  it('returns empty string when prompt is missing', () => {
    expect(parsePromptFromYaml('name: test')).toBe('')
  })
})

describe('taskConfigFromYaml', () => {
  it('reconstructs a full config from generated YAML', () => {
    const original: TaskConfig = {
      name: 'Weekly Report',
      schedule: '0 8 * * 1',
      provider: 'claude_oauth',
      prompt: 'Write the weekly report.',
      outputDestination: { type: 'file', filePath: 'reports/week.md' },
    }
    const yaml = generateWorkflowYaml(original)
    const parsed = taskConfigFromYaml(original.name, original.schedule, yaml)

    expect(parsed.name).toBe(original.name)
    expect(parsed.schedule).toBe(original.schedule)
    expect(parsed.prompt).toBe(original.prompt)
    expect(parsed.outputDestination).toEqual(original.outputDestination)
  })

  it('handles agent_managed output type with no schedule', () => {
    const original: TaskConfig = {
      name: 'Senior Engineer',
      provider: 'claude_oauth',
      prompt: 'Pick up open tickets and raise PRs.',
      outputDestination: { type: 'agent_managed' },
    }
    const yaml = generateWorkflowYaml(original)
    const parsed = taskConfigFromYaml(original.name, undefined, yaml)

    expect(parsed.outputDestination.type).toBe('agent_managed')
    expect(parsed.schedule).toBeUndefined()
  })

  it('handles issue_comment output type', () => {
    const original: TaskConfig = {
      name: 'Daily Standup',
      provider: 'claude_oauth',
      prompt: 'Post the standup update.',
      outputDestination: { type: 'issue_comment', issueNumber: 99 },
    }
    const yaml = generateWorkflowYaml(original)
    const parsed = taskConfigFromYaml(original.name, undefined, yaml)

    expect(parsed.outputDestination).toEqual({ type: 'issue_comment', issueNumber: 99 })
  })
})
