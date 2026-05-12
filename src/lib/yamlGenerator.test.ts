import { describe, it, expect } from 'vitest'
import { generateWorkflowYaml, slugify, type TaskConfig } from './yamlGenerator'

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
