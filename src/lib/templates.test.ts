import { describe, it, expect } from 'vitest'
import { TEMPLATES, templateToConfig, type Template } from './templates'
import { generateWorkflowYaml } from './yamlGenerator'

describe('templateToConfig — yaml path (regression)', () => {
  it('se-daily-sprint template produces a valid TaskConfig', () => {
    const t = TEMPLATES.find((t) => t.id === 'se-daily-sprint')!
    const config = templateToConfig(t)
    expect(config.name).toBe('Senior Engineer Daily Sprint')
    expect(config.prompt.length).toBeGreaterThan(0)
    expect(config.provider).toBe('claude_oauth')
  })

  it('sprint-planning template produces a valid TaskConfig', () => {
    const t = TEMPLATES.find((t) => t.id === 'sprint-planning')!
    const config = templateToConfig(t)
    expect(config.name).toBe('Sprint Planning')
    expect(config.prompt.length).toBeGreaterThan(0)
    expect(config.provider).toBe('claude_oauth')
  })
})

describe('templateToConfig — config path', () => {
  it('builds TaskConfig from inline config with defaults', () => {
    const t: Template = {
      id: 'test-config',
      name: 'Test Config Template',
      description: 'A test template',
      defaultTaskName: 'My Test Task',
      config: {
        schedule: '0 9 * * 1',
        prompt: 'Do the thing.',
        outputDestination: { type: 'new_issue' },
      },
    }
    const config = templateToConfig(t)
    expect(config.name).toBe('My Test Task')
    expect(config.schedule).toBe('0 9 * * 1')
    expect(config.prompt).toBe('Do the thing.')
    expect(config.outputDestination).toEqual({ type: 'new_issue' })
    expect(config.provider).toBe('claude_oauth')
  })

  it('produced TaskConfig generates valid YAML via the generator', () => {
    const t: Template = {
      id: 'test-config',
      name: 'Test Config Template',
      description: 'A test template',
      defaultTaskName: 'My Test Task',
      config: {
        schedule: '0 8 * * *',
        prompt: 'Check things.',
        outputDestination: { type: 'new_issue' },
      },
    }
    const config = templateToConfig(t)
    const yaml = generateWorkflowYaml(config)
    expect(yaml).toContain("'0 8 * * *'")
    expect(yaml).toContain('Check things.')
  })
})

describe('new templates', () => {
  it('TEMPLATES contains all four new templates', () => {
    const ids = TEMPLATES.map((t) => t.id)
    expect(ids).toContain('weekly-status-digest')
    expect(ids).toContain('stale-issue-triage')
    expect(ids).toContain('dependency-update-digest')
    expect(ids).toContain('docs-freshness-check')
  })

  it('weekly-status-digest has correct schedule and output destination', () => {
    const t = TEMPLATES.find((t) => t.id === 'weekly-status-digest')!
    const config = templateToConfig(t)
    expect(config.schedule).toBe('0 9 * * 1')
    expect(config.outputDestination.type).toBe('issue_comment')
    expect(config.prompt.length).toBeGreaterThan(0)
  })

  it('stale-issue-triage has correct schedule and output destination', () => {
    const t = TEMPLATES.find((t) => t.id === 'stale-issue-triage')!
    const config = templateToConfig(t)
    expect(config.schedule).toBe('0 8 * * *')
    expect(config.outputDestination).toEqual({ type: 'new_issue' })
    expect(config.prompt.length).toBeGreaterThan(0)
  })

  it('dependency-update-digest has correct schedule and output destination', () => {
    const t = TEMPLATES.find((t) => t.id === 'dependency-update-digest')!
    const config = templateToConfig(t)
    expect(config.schedule).toBe('0 9 * * 1')
    expect(config.outputDestination).toEqual({ type: 'new_issue' })
    expect(config.prompt.length).toBeGreaterThan(0)
  })

  it('docs-freshness-check has correct schedule and output destination', () => {
    const t = TEMPLATES.find((t) => t.id === 'docs-freshness-check')!
    const config = templateToConfig(t)
    expect(config.schedule).toBe('0 9 * * 1')
    expect(config.outputDestination).toEqual({ type: 'new_issue' })
    expect(config.prompt.length).toBeGreaterThan(0)
  })

  it('each new template produces valid YAML via the generator', () => {
    const newIds = [
      'weekly-status-digest',
      'stale-issue-triage',
      'dependency-update-digest',
      'docs-freshness-check',
    ]
    for (const id of newIds) {
      const t = TEMPLATES.find((t) => t.id === id)!
      const config = templateToConfig(t)
      const yaml = generateWorkflowYaml(config)
      expect(yaml).toContain('name: githatch-')
      expect(yaml).toContain('workflow_dispatch')
      expect(yaml.length).toBeGreaterThan(200)
    }
  })
})

describe('TEMPLATES structure', () => {
  it('has 6 templates total', () => {
    expect(TEMPLATES).toHaveLength(6)
  })

  it('every template has required fields', () => {
    for (const t of TEMPLATES) {
      expect(t.id.length).toBeGreaterThan(0)
      expect(t.name.length).toBeGreaterThan(0)
      expect(t.description.length).toBeGreaterThan(0)
      expect(t.defaultTaskName.length).toBeGreaterThan(0)
      const hasYaml = 'yaml' in t && typeof t.yaml === 'string'
      const hasConfig = 'config' in t && typeof t.config === 'object'
      expect(hasYaml || hasConfig).toBe(true)
    }
  })
})
