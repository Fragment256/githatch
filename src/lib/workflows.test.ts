import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parseGithatchYaml, listGithatchTasks, triggerWorkflow, getWorkflowRuns } from './workflows'

describe('parseGithatchYaml', () => {
  const sampleYaml = `# Githatch — Daily Standup
# githatch:output_type=new_issue
name: githatch-daily-standup

on:
  schedule:
    - cron: '0 9 * * 1-5'
  workflow_dispatch:

permissions:
  contents: write
  issues: write

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`

  it('extracts the display name from the header comment', () => {
    const result = parseGithatchYaml(sampleYaml, 'daily-standup', 1)
    expect(result.displayName).toBe('Daily Standup')
  })

  it('extracts the cron schedule', () => {
    const result = parseGithatchYaml(sampleYaml, 'daily-standup', 1)
    expect(result.schedule).toBe('0 9 * * 1-5')
  })

  it('preserves the slug and workflowId', () => {
    const result = parseGithatchYaml(sampleYaml, 'daily-standup', 42)
    expect(result.slug).toBe('daily-standup')
    expect(result.workflowId).toBe(42)
  })

  it('falls back to slug as displayName when header comment is absent', () => {
    const yamlNoHeader = sampleYaml.replace(/^# Githatch — .+\n/, '')
    const result = parseGithatchYaml(yamlNoHeader, 'daily-standup', 1)
    expect(result.displayName).toBe('daily-standup')
  })

  it('returns empty schedule when cron line is absent', () => {
    const yamlNoCron = sampleYaml.replace(/ {4}- cron: '[^']+'\n/, '')
    const result = parseGithatchYaml(yamlNoCron, 'daily-standup', 1)
    expect(result.schedule).toBe('')
  })
})

describe('listGithatchTasks', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('returns tasks parsed from githatch-*.yml files in the workflows directory', async () => {
    const workflowsListResponse = [
      { name: 'githatch-daily-standup.yml', path: '.github/workflows/githatch-daily-standup.yml' },
      { name: 'ci.yml', path: '.github/workflows/ci.yml' },
      { name: 'githatch-weekly-report.yml', path: '.github/workflows/githatch-weekly-report.yml' },
    ]
    const actionsWorkflows = {
      workflows: [
        { id: 10, path: '.github/workflows/githatch-daily-standup.yml' },
        { id: 11, path: '.github/workflows/ci.yml' },
        { id: 12, path: '.github/workflows/githatch-weekly-report.yml' },
      ],
    }
    const dailyYaml = Buffer.from(
      `# Githatch — Daily Standup\n# githatch:output_type=new_issue\nname: githatch-daily-standup\n\non:\n  schedule:\n    - cron: '0 9 * * 1-5'\n  workflow_dispatch:\n`,
    ).toString('base64')
    const weeklyYaml = Buffer.from(
      `# Githatch — Weekly Report\n# githatch:output_type=file path=report.md\nname: githatch-weekly-report\n\non:\n  schedule:\n    - cron: '0 8 * * 1'\n  workflow_dispatch:\n`,
    ).toString('base64')

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(workflowsListResponse) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(actionsWorkflows) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ content: dailyYaml }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ content: weeklyYaml }) })
    vi.stubGlobal('fetch', fetchMock)

    const tasks = await listGithatchTasks({ token: 'gho_test', owner: 'testuser', repo: 'my-repo' })

    expect(tasks).toHaveLength(2)
    expect(tasks[0].slug).toBe('daily-standup')
    expect(tasks[0].displayName).toBe('Daily Standup')
    expect(tasks[0].schedule).toBe('0 9 * * 1-5')
    expect(tasks[0].workflowId).toBe(10)
    expect(tasks[1].slug).toBe('weekly-report')
    expect(tasks[1].displayName).toBe('Weekly Report')
  })

  it('returns empty array when no githatch workflows exist', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
    vi.stubGlobal('fetch', fetchMock)

    const tasks = await listGithatchTasks({ token: 'gho_test', owner: 'testuser', repo: 'my-repo' })
    expect(tasks).toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws when the contents API call fails', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 404 })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      listGithatchTasks({ token: 'gho_test', owner: 'testuser', repo: 'my-repo' }),
    ).rejects.toThrow()
  })
})

describe('triggerWorkflow', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('POSTs to the workflow_dispatch endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchMock)

    await triggerWorkflow({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      workflowId: 42,
      defaultBranch: 'main',
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/actions/workflows/42/dispatches')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body as string) as { ref: string }
    expect(body.ref).toBe('main')
  })

  it('uses the supplied defaultBranch in the dispatch body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchMock)

    await triggerWorkflow({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      workflowId: 42,
      defaultBranch: 'master',
    })

    const body = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { ref: string }
    expect(body.ref).toBe('master')
  })

  it('throws on non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    await expect(
      triggerWorkflow({
        token: 'gho_test',
        owner: 'testuser',
        repo: 'my-repo',
        workflowId: 42,
        defaultBranch: 'main',
      }),
    ).rejects.toThrow()
  })
})

describe('getWorkflowRuns', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('returns parsed run objects', async () => {
    const raw = {
      workflow_runs: [
        {
          id: 100,
          status: 'completed',
          conclusion: 'success',
          created_at: '2024-01-01T09:00:00Z',
          html_url: 'https://github.com/testuser/my-repo/actions/runs/100',
        },
        {
          id: 101,
          status: 'in_progress',
          conclusion: null,
          created_at: '2024-01-02T09:00:00Z',
          html_url: 'https://github.com/testuser/my-repo/actions/runs/101',
        },
      ],
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(raw) }),
    )

    const runs = await getWorkflowRuns({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      workflowId: 10,
      defaultBranch: 'main',
    })

    expect(runs).toHaveLength(2)
    expect(runs[0].id).toBe(100)
    expect(runs[0].status).toBe('completed')
    expect(runs[0].conclusion).toBe('success')
    expect(runs[0].createdAt).toBe('2024-01-01T09:00:00Z')
    expect(runs[0].htmlUrl).toContain('runs/100')
    expect(runs[1].conclusion).toBeNull()
  })

  it('throws on API error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    await expect(
      getWorkflowRuns({
        token: 'gho_test',
        owner: 'testuser',
        repo: 'my-repo',
        workflowId: 10,
        defaultBranch: 'main',
      }),
    ).rejects.toThrow()
  })
})
