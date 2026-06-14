import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaskList } from './TaskList'
import type { GithatchTask } from '@/lib/workflows'
import * as workflows from '@/lib/workflows'
import * as github from '@/lib/github'

const TASK: GithatchTask = {
  slug: 'daily-standup',
  displayName: 'Daily Standup',
  schedule: '0 9 * * 1-5',
  workflowId: 42,
  path: '.github/workflows/githatch-daily-standup.yml',
  enabled: true,
  outputDestination: { type: 'new_issue' },
}

const BASE_PROPS = {
  token: 'gho_test',
  owner: 'testuser',
  repo: 'my-repo',
  defaultBranch: 'main',
  loading: false,
  error: null,
  onRefresh: vi.fn(),
  onEdit: vi.fn(),
  onDuplicate: vi.fn(),
}

describe('TaskList', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue([])
  })

  it('shows loading state', () => {
    render(<TaskList {...BASE_PROPS} tasks={[]} loading={true} />)
    expect(screen.getByText(/loading tasks/i)).toBeInTheDocument()
  })

  it('shows error with retry button', () => {
    const onRefresh = vi.fn()
    render(<TaskList {...BASE_PROPS} tasks={[]} error="API error" onRefresh={onRefresh} />)
    expect(screen.getByText(/API error/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRefresh).toHaveBeenCalledOnce()
  })

  it('shows empty state when no tasks', () => {
    render(<TaskList {...BASE_PROPS} tasks={[]} />)
    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument()
  })

  it('renders task name and human-readable schedule', () => {
    render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
    expect(screen.getAllByText('Daily Standup').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Weekdays at 9 AM UTC').length).toBeGreaterThanOrEqual(1)
  })

  it('calls triggerWorkflow when Run now is clicked', async () => {
    vi.spyOn(workflows, 'triggerWorkflow').mockResolvedValue(undefined)
    render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
    fireEvent.click(screen.getByRole('button', { name: /run now/i }))
    await waitFor(() => expect(workflows.triggerWorkflow).toHaveBeenCalledOnce())
    expect(workflows.triggerWorkflow).toHaveBeenCalledWith({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      workflowId: 42,
      defaultBranch: 'main',
    })
  })

  it('shows trigger error when triggerWorkflow rejects', async () => {
    vi.spyOn(workflows, 'triggerWorkflow').mockRejectedValue(new Error('Permission denied'))
    render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
    fireEvent.click(screen.getByRole('button', { name: /run now/i }))
    await waitFor(() => expect(screen.getByText(/Permission denied/)).toBeInTheDocument())
  })

  it('loads run history when History is clicked', async () => {
    vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue([
      {
        id: 100,
        status: 'completed',
        conclusion: 'success',
        createdAt: '2024-01-01T09:00:00Z',
        htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/100',
      },
    ])
    render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
    fireEvent.click(screen.getAllByRole('button', { name: /^history$/i })[0])
    await waitFor(() => expect(screen.getByText(/Success/)).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /view logs/i })).toBeInTheDocument()
  })

  it('shows empty run history message when no runs', async () => {
    render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
    fireEvent.click(screen.getAllByRole('button', { name: /^history$/i })[0])
    await waitFor(() => expect(screen.getByText(/no runs yet/i)).toBeInTheDocument())
  })

  it('renders all tasks without duplication', () => {
    const manualTask: GithatchTask = {
      ...TASK,
      slug: 'ad-hoc',
      displayName: 'Ad Hoc Task',
      schedule: '',
    }
    render(<TaskList {...BASE_PROPS} tasks={[TASK, manualTask]} />)
    expect(screen.getAllByText('Daily Standup').length).toBe(1)
    expect(screen.getByText('Ad Hoc Task')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^cancel$/i })).not.toBeInTheDocument()
  })

  it('shows delete confirmation then calls deleteWorkflowFile on confirm', async () => {
    vi.spyOn(github, 'deleteWorkflowFile').mockResolvedValue(undefined)
    const onRefresh = vi.fn()
    render(<TaskList {...BASE_PROPS} tasks={[TASK]} onRefresh={onRefresh} />)
    fireEvent.click(screen.getByRole('button', { name: /delete task/i }))
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    await waitFor(() => expect(github.deleteWorkflowFile).toHaveBeenCalledOnce())
    expect(onRefresh).toHaveBeenCalled()
  })

  it('shows Pause button for an enabled task and calls disableWorkflow on click', async () => {
    vi.spyOn(workflows, 'disableWorkflow').mockResolvedValue(undefined)
    render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
    const pauseBtn = screen.getByRole('button', { name: /pause task/i })
    expect(pauseBtn).toBeInTheDocument()
    fireEvent.click(pauseBtn)
    await waitFor(() => expect(workflows.disableWorkflow).toHaveBeenCalledOnce())
    expect(screen.getByRole('button', { name: /resume task/i })).toBeInTheDocument()
  })

  it('shows Resume button for a disabled task and calls enableWorkflow on click', async () => {
    vi.spyOn(workflows, 'enableWorkflow').mockResolvedValue(undefined)
    const disabledTask: GithatchTask = { ...TASK, enabled: false }
    render(<TaskList {...BASE_PROPS} tasks={[disabledTask]} />)
    const resumeBtn = screen.getByRole('button', { name: /resume task/i })
    expect(resumeBtn).toBeInTheDocument()
    expect(screen.getByText(/paused/i)).toBeInTheDocument()
    fireEvent.click(resumeBtn)
    await waitFor(() => expect(workflows.enableWorkflow).toHaveBeenCalledOnce())
    expect(screen.getByRole('button', { name: /pause task/i })).toBeInTheDocument()
  })

  it('shows next-run time for an enabled scheduled task', () => {
    render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
    expect(screen.getByText(/^Next:/)).toBeInTheDocument()
  })

  it('does not show next-run time for a paused task', () => {
    const paused: GithatchTask = { ...TASK, enabled: false }
    render(<TaskList {...BASE_PROPS} tasks={[paused]} />)
    expect(screen.queryByText(/^Next:/)).not.toBeInTheDocument()
  })

  it('does not show next-run time for a task with no schedule', () => {
    const noSchedule: GithatchTask = { ...TASK, schedule: '' }
    render(<TaskList {...BASE_PROPS} tasks={[noSchedule]} />)
    expect(screen.queryByText(/^Next:/)).not.toBeInTheDocument()
  })

  describe('last-run status badge', () => {
    it('shows Failed badge when last run conclusion is failure', async () => {
      vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue([
        {
          id: 1,
          status: 'completed',
          conclusion: 'failure',
          createdAt: '2024-01-01T09:00:00Z',
          htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/1',
        },
      ])
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      await waitFor(() => expect(screen.getByText(/^Failed$/i)).toBeInTheDocument())
    })

    it('shows Cancelled badge when last run is cancelled', async () => {
      vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue([
        {
          id: 2,
          status: 'completed',
          conclusion: 'cancelled',
          createdAt: '2024-01-01T09:00:00Z',
          htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/2',
        },
      ])
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      await waitFor(() => expect(screen.getByText(/^Cancelled$/i)).toBeInTheDocument())
    })

    it('shows Running badge when last run is in_progress', async () => {
      vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue([
        {
          id: 3,
          status: 'in_progress',
          conclusion: null,
          createdAt: '2024-01-01T09:00:00Z',
          htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/3',
        },
      ])
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      await waitFor(() => expect(screen.getByText(/^Running$/i)).toBeInTheDocument())
    })

    it('shows no status badge when last run is success', async () => {
      vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue([
        {
          id: 4,
          status: 'completed',
          conclusion: 'success',
          createdAt: '2024-01-01T09:00:00Z',
          htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/4',
        },
      ])
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      await waitFor(() =>
        expect(workflows.getWorkflowRuns).toHaveBeenCalledWith(
          expect.objectContaining({ workflowId: 42, perPage: 1 }),
        ),
      )
      expect(screen.queryByText(/^Failed$/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/^Running$/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/^Cancelled$/i)).not.toBeInTheDocument()
    })

    it('shows no badge when there are no runs', async () => {
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      await waitFor(() =>
        expect(workflows.getWorkflowRuns).toHaveBeenCalledWith(
          expect.objectContaining({ workflowId: 42, perPage: 1 }),
        ),
      )
      expect(screen.queryByText(/^Failed$/i)).not.toBeInTheDocument()
    })

    it('swallows fetch errors silently — no crash or error text', async () => {
      vi.spyOn(workflows, 'getWorkflowRuns').mockRejectedValue(new Error('Network error'))
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      await waitFor(() =>
        expect(workflows.getWorkflowRuns).toHaveBeenCalledWith(
          expect.objectContaining({ workflowId: 42 }),
        ),
      )
      expect(screen.queryByText(/Network error/i)).not.toBeInTheDocument()
    })

    it('does not fetch for a task with no workflowId', () => {
      const unregistered: GithatchTask = { ...TASK, workflowId: undefined }
      render(<TaskList {...BASE_PROPS} tasks={[unregistered]} />)
      expect(workflows.getWorkflowRuns).not.toHaveBeenCalled()
    })

    it('Failed badge is an anchor linking to the run URL', async () => {
      vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue([
        {
          id: 10,
          status: 'completed',
          conclusion: 'failure',
          createdAt: '2024-01-01T09:00:00Z',
          htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/10',
        },
      ])
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      await waitFor(() =>
        expect(screen.getByRole('link', { name: /^Failed$/i })).toBeInTheDocument(),
      )
      expect(screen.getByRole('link', { name: /^Failed$/i })).toHaveAttribute(
        'href',
        'https://github.com/testuser/my-repo/actions/runs/10',
      )
    })

    it('Running badge is an anchor linking to the run URL', async () => {
      vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue([
        {
          id: 11,
          status: 'in_progress',
          conclusion: null,
          createdAt: '2024-01-01T09:00:00Z',
          htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/11',
        },
      ])
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      await waitFor(() =>
        expect(screen.getByRole('link', { name: /^Running$/i })).toBeInTheDocument(),
      )
      expect(screen.getByRole('link', { name: /^Running$/i })).toHaveAttribute(
        'href',
        'https://github.com/testuser/my-repo/actions/runs/11',
      )
    })
  })

  describe('duplicate task', () => {
    it('renders a Duplicate button for a task with a workflowId', () => {
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      expect(screen.getByRole('button', { name: /duplicate/i })).toBeInTheDocument()
    })

    it('calls onDuplicate with the task when Duplicate is clicked', () => {
      const onDuplicate = vi.fn()
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} onDuplicate={onDuplicate} />)
      fireEvent.click(screen.getByRole('button', { name: /duplicate/i }))
      expect(onDuplicate).toHaveBeenCalledOnce()
      expect(onDuplicate).toHaveBeenCalledWith(TASK)
    })
  })

  describe('output destination label', () => {
    it('shows "→ New issue" for new_issue output', () => {
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      expect(screen.getByText('→ New issue')).toBeInTheDocument()
    })

    it('shows "→ Issue #42" for issue_comment output', () => {
      const commentTask: GithatchTask = {
        ...TASK,
        outputDestination: { type: 'issue_comment', issueNumber: 42 },
      }
      render(<TaskList {...BASE_PROPS} tasks={[commentTask]} />)
      expect(screen.getByText('→ Issue #42')).toBeInTheDocument()
    })

    it('shows "→ Pull request" for pull_request output', () => {
      const prTask: GithatchTask = { ...TASK, outputDestination: { type: 'pull_request' } }
      render(<TaskList {...BASE_PROPS} tasks={[prTask]} />)
      expect(screen.getByText('→ Pull request')).toBeInTheDocument()
    })

    it('shows the file path for file output', () => {
      const fileTask: GithatchTask = {
        ...TASK,
        outputDestination: { type: 'file', filePath: 'reports/weekly.md' },
      }
      render(<TaskList {...BASE_PROPS} tasks={[fileTask]} />)
      expect(screen.getByText('→ reports/weekly.md')).toBeInTheDocument()
    })

    it('shows no output destination label for agent_managed', () => {
      const agentTask: GithatchTask = { ...TASK, outputDestination: { type: 'agent_managed' } }
      render(<TaskList {...BASE_PROPS} tasks={[agentTask]} />)
      expect(screen.queryByText(/^→/)).not.toBeInTheDocument()
    })
  })
})
