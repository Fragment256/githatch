import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  parseGithatchYaml,
  listGithatchTasks,
  triggerWorkflow,
  getWorkflowRuns,
  patchScheduleInYaml,
  updateWorkflowSchedule,
  enableWorkflow,
  disableWorkflow,
  fetchRunOutput,
} from './workflows'
import type { WorkflowRun } from './workflows'
import type { GithatchTask } from './workflows'

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

  it('defaults enabled to true when not provided', () => {
    const result = parseGithatchYaml(sampleYaml, 'daily-standup', 1)
    expect(result.enabled).toBe(true)
  })

  it('parses outputDestination from the YAML header comment', () => {
    const result = parseGithatchYaml(sampleYaml, 'daily-standup', 1)
    expect(result.outputDestination.type).toBe('new_issue')
  })

  it('reflects the enabled parameter when explicitly provided', () => {
    const disabled = parseGithatchYaml(sampleYaml, 'daily-standup', 1, false)
    expect(disabled.enabled).toBe(false)
    const enabled = parseGithatchYaml(sampleYaml, 'daily-standup', 1, true)
    expect(enabled.enabled).toBe(true)
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

  it('returns empty string for prompt when no prompt block is present', () => {
    const result = parseGithatchYaml(sampleYaml, 'daily-standup', 1)
    expect(result.prompt).toBe('')
  })

  it('extracts the user prompt from a full workflow YAML, stripping the delivery instruction', () => {
    const yamlWithPrompt = `# Githatch — Daily Standup
# githatch:output_type=new_issue
# githatch:provider=claude_oauth
name: githatch-daily-standup

on:
  workflow_dispatch:

permissions:
  contents: write
  issues: write
  id-token: write

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Claude agent
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: \${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          claude_args: --allowedTools "Bash,Read"
          prompt: |
            Summarize the last 7 days of commits.

            When done, create a new GitHub issue with your findings using: gh issue create --title "<descriptive title>" --body "<your response>"
`
    const result = parseGithatchYaml(yamlWithPrompt, 'daily-standup', 1)
    expect(result.prompt).toBe('Summarize the last 7 days of commits.')
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
        { id: 10, path: '.github/workflows/githatch-daily-standup.yml', state: 'active' },
        { id: 11, path: '.github/workflows/ci.yml', state: 'active' },
        {
          id: 12,
          path: '.github/workflows/githatch-weekly-report.yml',
          state: 'disabled_manually',
        },
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
    expect(tasks[0].enabled).toBe(true)
    expect(tasks[1].slug).toBe('weekly-report')
    expect(tasks[1].displayName).toBe('Weekly Report')
    expect(tasks[1].enabled).toBe(false)
  })

  it('returns empty array when no githatch workflows exist', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
    vi.stubGlobal('fetch', fetchMock)

    const tasks = await listGithatchTasks({ token: 'gho_test', owner: 'testuser', repo: 'my-repo' })
    expect(tasks).toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns empty array when workflows directory does not exist (404)', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 404 })
    vi.stubGlobal('fetch', fetchMock)

    const result = await listGithatchTasks({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
    })
    expect(result).toEqual([])
  })

  it('throws when the contents API call fails with non-404 error', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 500 })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      listGithatchTasks({ token: 'gho_test', owner: 'testuser', repo: 'my-repo' }),
    ).rejects.toThrow()
  })

  it('throws when a per-file content fetch returns a non-404 error (task must not silently vanish)', async () => {
    const workflowsListResponse = [
      { name: 'githatch-daily-standup.yml', path: '.github/workflows/githatch-daily-standup.yml' },
      { name: 'githatch-weekly-report.yml', path: '.github/workflows/githatch-weekly-report.yml' },
    ]
    const actionsWorkflows = {
      workflows: [
        { id: 10, path: '.github/workflows/githatch-daily-standup.yml', state: 'active' },
        { id: 12, path: '.github/workflows/githatch-weekly-report.yml', state: 'active' },
      ],
    }
    const dailyYaml = Buffer.from(
      `# Githatch — Daily Standup\n# githatch:output_type=new_issue\nname: githatch-daily-standup\n\non:\n  workflow_dispatch:\n`,
    ).toString('base64')

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(workflowsListResponse) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(actionsWorkflows) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ content: dailyYaml }) })
      .mockResolvedValueOnce({ ok: false, status: 403 }) // rate-limited / permission error
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      listGithatchTasks({ token: 'gho_test', owner: 'testuser', repo: 'my-repo' }),
    ).rejects.toThrow('403')
  })

  it('skips a file that returns 404 after the directory listing (race: file just deleted)', async () => {
    const workflowsListResponse = [
      { name: 'githatch-daily-standup.yml', path: '.github/workflows/githatch-daily-standup.yml' },
      { name: 'githatch-weekly-report.yml', path: '.github/workflows/githatch-weekly-report.yml' },
    ]
    const actionsWorkflows = {
      workflows: [
        { id: 10, path: '.github/workflows/githatch-daily-standup.yml', state: 'active' },
        { id: 12, path: '.github/workflows/githatch-weekly-report.yml', state: 'active' },
      ],
    }
    const dailyYaml = Buffer.from(
      `# Githatch — Daily Standup\n# githatch:output_type=new_issue\nname: githatch-daily-standup\n\non:\n  workflow_dispatch:\n`,
    ).toString('base64')

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(workflowsListResponse) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(actionsWorkflows) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ content: dailyYaml }) })
      .mockResolvedValueOnce({ ok: false, status: 404 }) // file deleted between listing and fetch
    vi.stubGlobal('fetch', fetchMock)

    const tasks = await listGithatchTasks({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
    })
    expect(tasks).toHaveLength(1)
    expect(tasks[0].slug).toBe('daily-standup')
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

describe('patchScheduleInYaml', () => {
  const baseYaml = `# Githatch — Test\nname: githatch-test\n\non:\n  workflow_dispatch:\n\npermissions:\n  contents: write\n`
  const scheduledYaml = `# Githatch — Test\nname: githatch-test\n\non:\n  schedule:\n    - cron: '0 9 * * 1'\n  workflow_dispatch:\n\npermissions:\n  contents: write\n`

  it('adds a cron schedule to a manual-only workflow', () => {
    const result = patchScheduleInYaml(baseYaml, '0 8 * * *')
    expect(result).toContain("cron: '0 8 * * *'")
    expect(result).toContain('workflow_dispatch')
    expect(result).toContain('permissions:')
  })

  it('removes a cron schedule when schedule is undefined', () => {
    const result = patchScheduleInYaml(scheduledYaml, undefined)
    expect(result).not.toContain('schedule:')
    expect(result).not.toContain('cron:')
    expect(result).toContain('workflow_dispatch')
    expect(result).toContain('permissions:')
  })

  it('replaces an existing cron with a new one', () => {
    const result = patchScheduleInYaml(scheduledYaml, '0 8 * * *')
    expect(result).toContain("cron: '0 8 * * *'")
    expect(result).not.toContain("cron: '0 9 * * 1'")
  })

  it('patches correctly when permissions: follows a single blank line instead of two', () => {
    // Manually edited YAML with one newline before permissions: — regex must not no-op
    const oneNewlineYaml =
      `# Githatch — Test\nname: githatch-test\n\non:\n  workflow_dispatch:\n\npermissions:\n  contents: write\n`.replace(
        '\n\npermissions:',
        '\npermissions:',
      )
    const result = patchScheduleInYaml(oneNewlineYaml, '0 8 * * *')
    expect(result).toContain("cron: '0 8 * * *'")
    expect(result).toContain('permissions:')
  })
})

describe('updateWorkflowSchedule', () => {
  beforeEach(() => vi.restoreAllMocks())

  const task: GithatchTask = {
    slug: 'test-task',
    displayName: 'Test Task',
    schedule: '',
    workflowId: 10,
    path: '.github/workflows/githatch-test-task.yml',
    enabled: true,
    outputDestination: { type: 'new_issue' },
    prompt: '',
  }

  const currentYaml = `# Githatch Test Task\nname: githatch-test-task\n\non:\n  workflow_dispatch:\n\npermissions:\n  contents: write\n`
  const encodedYaml = btoa(currentYaml)

  it('fetches the file, patches the schedule, and PUTs the result', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ content: encodedYaml, sha: 'abc123' }),
      })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await updateWorkflowSchedule({
      token: 'gho_test',
      owner: 'u',
      repo: 'r',
      task,
      schedule: '0 9 * * 1',
    })

    const body = JSON.parse(
      (fetchMock.mock.calls[1] as [string, RequestInit])[1].body as string,
    ) as { content: string; sha: string }
    expect(body.sha).toBe('abc123')
    expect(atob(body.content)).toContain("cron: '0 9 * * 1'")
  })

  it('throws on failed GET', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    await expect(
      updateWorkflowSchedule({
        token: 'gho_test',
        owner: 'u',
        repo: 'r',
        task,
        schedule: '0 9 * * 1',
      }),
    ).rejects.toThrow()
  })
})

describe('enableWorkflow', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('PUTs to the workflow enable endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchMock)

    await enableWorkflow({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      workflowId: 42,
      defaultBranch: 'main',
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/actions/workflows/42/enable')
    expect(opts.method).toBe('PUT')
  })

  it('throws on non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    await expect(
      enableWorkflow({
        token: 'gho_test',
        owner: 'testuser',
        repo: 'my-repo',
        workflowId: 42,
        defaultBranch: 'main',
      }),
    ).rejects.toThrow()
  })
})

describe('disableWorkflow', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('PUTs to the workflow disable endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchMock)

    await disableWorkflow({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      workflowId: 42,
      defaultBranch: 'main',
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/actions/workflows/42/disable')
    expect(opts.method).toBe('PUT')
  })

  it('throws on non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    await expect(
      disableWorkflow({
        token: 'gho_test',
        owner: 'testuser',
        repo: 'my-repo',
        workflowId: 42,
        defaultBranch: 'main',
      }),
    ).rejects.toThrow()
  })
})

describe('fetchRunOutput', () => {
  beforeEach(() => vi.restoreAllMocks())

  const baseRun: WorkflowRun = {
    id: 1,
    status: 'completed',
    conclusion: 'success',
    createdAt: '2024-01-01T09:00:00Z',
    htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/1',
  }

  it('returns the first issue created after the run for new_issue output type', async () => {
    const issues = [
      {
        number: 42,
        title: 'Daily report 2024-01-01',
        body: 'Report body',
        html_url: 'https://github.com/testuser/my-repo/issues/42',
        created_at: '2024-01-01T09:10:00Z',
      },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(issues) }),
    )

    const result = await fetchRunOutput({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      run: baseRun,
      outputDestination: { type: 'new_issue' },
    })

    expect(result).not.toBeNull()
    expect(result!.type).toBe('issue')
    expect(result!.title).toBe('Daily report 2024-01-01')
    expect(result!.body).toBe('Report body')
  })

  it('returns null when no issues are found for new_issue type', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) }))

    const result = await fetchRunOutput({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      run: baseRun,
      outputDestination: { type: 'new_issue' },
    })

    expect(result).toBeNull()
  })

  it('skips PRs and returns the first real issue for new_issue when response contains both', async () => {
    const items = [
      {
        number: 10,
        title: 'chore: automated PR',
        body: 'PR body',
        html_url: 'https://github.com/testuser/my-repo/pull/10',
        created_at: '2024-01-01T09:05:00Z',
        pull_request: { url: 'https://api.github.com/repos/testuser/my-repo/pulls/10' },
      },
      {
        number: 11,
        title: 'Daily report 2024-01-01',
        body: 'Issue body',
        html_url: 'https://github.com/testuser/my-repo/issues/11',
        created_at: '2024-01-01T09:10:00Z',
      },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(items) }),
    )

    const result = await fetchRunOutput({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      run: baseRun,
      outputDestination: { type: 'new_issue' },
    })

    expect(result).not.toBeNull()
    expect(result!.type).toBe('issue')
    expect(result!.title).toBe('Daily report 2024-01-01')
  })

  it('returns the bot comment for issue_comment output type', async () => {
    const comments = [
      {
        id: 10,
        body: 'Bot comment body',
        html_url: 'https://github.com/testuser/my-repo/issues/5#issuecomment-10',
        created_at: '2024-01-01T09:05:00Z',
        user: { login: 'github-actions[bot]' },
      },
      {
        id: 11,
        body: 'Human comment',
        html_url: 'https://github.com/testuser/my-repo/issues/5#issuecomment-11',
        created_at: '2024-01-01T09:06:00Z',
        user: { login: 'human-user' },
      },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(comments) }),
    )

    const result = await fetchRunOutput({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      run: baseRun,
      outputDestination: { type: 'issue_comment', issueNumber: 5 },
    })

    expect(result).not.toBeNull()
    expect(result!.type).toBe('comment')
    expect(result!.body).toBe('Bot comment body')
  })

  it('ignores pre-run bot comments for issue_comment output type (created_at filter)', async () => {
    // Pre-run bot comment (created before run.createdAt=09:00:00Z) plus a post-run one
    const comments = [
      {
        id: 9,
        body: 'Stale bot comment',
        html_url: 'https://github.com/testuser/my-repo/issues/5#issuecomment-9',
        created_at: '2024-01-01T08:55:00Z',
        user: { login: 'github-actions[bot]' },
      },
      {
        id: 10,
        body: 'Fresh bot comment',
        html_url: 'https://github.com/testuser/my-repo/issues/5#issuecomment-10',
        created_at: '2024-01-01T09:05:00Z',
        user: { login: 'github-actions[bot]' },
      },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(comments) }),
    )

    const result = await fetchRunOutput({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      run: baseRun,
      outputDestination: { type: 'issue_comment', issueNumber: 5 },
    })

    expect(result).not.toBeNull()
    expect(result!.body).toBe('Fresh bot comment')
  })

  it('returns null when only a pre-run bot comment exists for issue_comment', async () => {
    const comments = [
      {
        id: 9,
        body: 'Stale bot comment',
        html_url: 'https://github.com/testuser/my-repo/issues/5#issuecomment-9',
        created_at: '2024-01-01T08:55:00Z',
        user: { login: 'github-actions[bot]' },
      },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(comments) }),
    )

    const result = await fetchRunOutput({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      run: baseRun,
      outputDestination: { type: 'issue_comment', issueNumber: 5 },
    })

    expect(result).toBeNull()
  })

  it('returns null for agent_managed output type', async () => {
    const result = await fetchRunOutput({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      run: baseRun,
      outputDestination: { type: 'agent_managed' },
    })

    expect(result).toBeNull()
  })

  it('returns a pr result when a PR was created by the bot after the run', async () => {
    const items = [
      {
        number: 15,
        title: 'chore: update deps',
        body: 'Automated dependency update',
        html_url: 'https://github.com/testuser/my-repo/pull/15',
        created_at: '2024-01-01T09:15:00Z',
        pull_request: { url: 'https://api.github.com/repos/testuser/my-repo/pulls/15' },
      },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(items) }),
    )

    const result = await fetchRunOutput({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      run: baseRun,
      outputDestination: { type: 'pull_request' },
    })

    expect(result).not.toBeNull()
    expect(result!.type).toBe('pr')
    expect(result!.title).toBe('#15 chore: update deps')
    expect(result!.body).toBe('Automated dependency update')
    expect(result!.htmlUrl).toBe('https://github.com/testuser/my-repo/pull/15')
  })

  it('returns null for pull_request when no PR found after the run', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) }))

    const result = await fetchRunOutput({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      run: baseRun,
      outputDestination: { type: 'pull_request' },
    })

    expect(result).toBeNull()
  })

  it('returns a file_link result for a specific file path without an API call', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchRunOutput({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      run: baseRun,
      outputDestination: { type: 'file', filePath: 'reports/weekly.md' },
      defaultBranch: 'main',
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result).not.toBeNull()
    expect(result!.type).toBe('file_link')
    expect(result!.title).toBe('reports/weekly.md')
    expect(result!.htmlUrl).toBe('https://github.com/testuser/my-repo/blob/main/reports/weekly.md')
  })

  it('returns a tree link for a directory file path', async () => {
    vi.stubGlobal('fetch', vi.fn())

    const result = await fetchRunOutput({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      run: baseRun,
      outputDestination: { type: 'file', filePath: 'reports/' },
      defaultBranch: 'main',
    })

    expect(result!.htmlUrl).toBe('https://github.com/testuser/my-repo/tree/main/reports')
  })

  it('ignores pre-existing issues updated after run start for new_issue type (since filters by updated_at)', async () => {
    // Pre-existing issue: created_at BEFORE the run but updated_at after (would match `since` filter)
    const staleIssue = {
      number: 5,
      title: 'Old issue updated after run',
      body: 'Stale',
      html_url: 'https://github.com/testuser/my-repo/issues/5',
      created_at: '2024-01-01T08:00:00Z', // before run.createdAt (09:00)
    }
    const freshIssue = {
      number: 42,
      title: 'New issue from this run',
      body: 'Fresh',
      html_url: 'https://github.com/testuser/my-repo/issues/42',
      created_at: '2024-01-01T09:10:00Z', // after run.createdAt
    }
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: () => Promise.resolve([staleIssue, freshIssue]) }),
    )

    const result = await fetchRunOutput({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      run: baseRun,
      outputDestination: { type: 'new_issue' },
    })

    expect(result).not.toBeNull()
    expect(result!.title).toBe('New issue from this run')
  })

  it('ignores pre-existing PRs updated after run start for pull_request type', async () => {
    const stalePr = {
      number: 3,
      title: 'Old PR',
      body: 'Stale',
      html_url: 'https://github.com/testuser/my-repo/pull/3',
      created_at: '2024-01-01T08:00:00Z', // before run.createdAt
      pull_request: {},
    }
    const freshPr = {
      number: 10,
      title: 'New PR from this run',
      body: 'Fresh',
      html_url: 'https://github.com/testuser/my-repo/pull/10',
      created_at: '2024-01-01T09:05:00Z', // after run.createdAt
      pull_request: {},
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([stalePr, freshPr]) }),
    )

    const result = await fetchRunOutput({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      run: baseRun,
      outputDestination: { type: 'pull_request' },
    })

    expect(result).not.toBeNull()
    expect(result!.title).toBe('#10 New PR from this run')
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
