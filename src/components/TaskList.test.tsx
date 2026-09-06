import { StrictMode } from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TaskList } from './TaskList'
import type { GithatchTask, WorkflowRun, WorkflowRunsResult } from '@/lib/workflows'
import * as workflows from '@/lib/workflows'
import * as github from '@/lib/github'

function asResult(runs: WorkflowRun[], totalCount?: number): WorkflowRunsResult {
  return { runs, totalCount: totalCount ?? runs.length }
}

const TASK: GithatchTask = {
  slug: 'daily-standup',
  displayName: 'Daily Standup',
  schedule: '0 9 * * 1-5',
  workflowId: 42,
  path: '.github/workflows/githatch-daily-standup.yml',
  enabled: true,
  outputDestination: { type: 'new_issue' },
  prompt: 'Summarize the last week of activity in this repository.',
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
    vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue(asResult([]))
    vi.spyOn(workflows, 'fetchRunOutput').mockResolvedValue(null)
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
    vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue(
      asResult([
        {
          id: 100,
          status: 'completed',
          conclusion: 'success',
          createdAt: '2024-01-01T09:00:00Z',
          htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/100',
        },
      ]),
    )
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

  describe('failure summary banner', () => {
    it('shows a banner counting tasks whose last run failed', async () => {
      const okTask: GithatchTask = {
        ...TASK,
        slug: 'ok-task',
        displayName: 'OK Task',
        workflowId: 99,
      }
      vi.spyOn(workflows, 'getWorkflowRuns').mockImplementation(({ workflowId }) => {
        if (workflowId === TASK.workflowId) {
          return Promise.resolve(
            asResult([
              {
                id: 1,
                status: 'completed',
                conclusion: 'failure',
                createdAt: '2024-01-01T09:00:00Z',
                htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/1',
              },
            ]),
          )
        }
        return Promise.resolve(
          asResult([
            {
              id: 2,
              status: 'completed',
              conclusion: 'success',
              createdAt: '2024-01-01T09:00:00Z',
              htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/2',
            },
          ]),
        )
      })
      render(<TaskList {...BASE_PROPS} tasks={[TASK, okTask]} />)
      await waitFor(() =>
        expect(screen.getByText(/1 of 2 tasks failed last run/i)).toBeInTheDocument(),
      )
    })

    it('does not show a banner when no task has a failed last run', async () => {
      vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue(
        asResult([
          {
            id: 1,
            status: 'completed',
            conclusion: 'success',
            createdAt: '2024-01-01T09:00:00Z',
            htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/1',
          },
        ]),
      )
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      await waitFor(() =>
        expect(workflows.getWorkflowRuns).toHaveBeenCalledWith(
          expect.objectContaining({ workflowId: 42, perPage: 1 }),
        ),
      )
      expect(screen.queryByText(/tasks failed last run/i)).not.toBeInTheDocument()
    })

    it('does not count a Running task as failed', async () => {
      vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue(
        asResult([
          {
            id: 1,
            status: 'in_progress',
            conclusion: null,
            createdAt: '2024-01-01T09:00:00Z',
            htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/1',
          },
        ]),
      )
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      await waitFor(() =>
        expect(workflows.getWorkflowRuns).toHaveBeenCalledWith(
          expect.objectContaining({ workflowId: 42, perPage: 1 }),
        ),
      )
      expect(screen.queryByText(/tasks failed last run/i)).not.toBeInTheDocument()
    })

    it('counts errored-fetch tasks in banner denominator', async () => {
      const errorTask: GithatchTask = {
        ...TASK,
        slug: 'error-task',
        displayName: 'Error Task',
        workflowId: 77,
      }
      vi.spyOn(workflows, 'getWorkflowRuns').mockImplementation(({ workflowId }) => {
        if (workflowId === TASK.workflowId) {
          return Promise.resolve(
            asResult([
              {
                id: 1,
                status: 'completed',
                conclusion: 'failure',
                createdAt: '2024-01-01T09:00:00Z',
                htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/1',
              },
            ]),
          )
        }
        // errorTask fetch fails — denominator must still include it
        return Promise.reject(new Error('rate limited'))
      })
      render(<TaskList {...BASE_PROPS} tasks={[TASK, errorTask]} />)
      await waitFor(() =>
        expect(screen.getByText(/1 of 2 tasks failed last run/i)).toBeInTheDocument(),
      )
    })

    it('removes deleted task from banner denominator after re-render', async () => {
      const okTask: GithatchTask = {
        ...TASK,
        slug: 'ok-task',
        displayName: 'OK Task',
        workflowId: 99,
      }
      vi.spyOn(workflows, 'getWorkflowRuns').mockImplementation(({ workflowId }) => {
        if (workflowId === TASK.workflowId) {
          return Promise.resolve(
            asResult([
              {
                id: 1,
                status: 'completed',
                conclusion: 'failure',
                createdAt: '2024-01-01T09:00:00Z',
                htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/1',
              },
            ]),
          )
        }
        return Promise.resolve(
          asResult([
            {
              id: 2,
              status: 'completed',
              conclusion: 'success',
              createdAt: '2024-01-01T09:00:00Z',
              htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/2',
            },
          ]),
        )
      })
      const { rerender } = render(<TaskList {...BASE_PROPS} tasks={[TASK, okTask]} />)
      await waitFor(() =>
        expect(screen.getByText(/1 of 2 tasks failed last run/i)).toBeInTheDocument(),
      )

      // okTask deleted — only TASK remains; stale entry for ok-task must not inflate denominator
      rerender(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      await waitFor(() =>
        expect(screen.getByText(/1 of 1 tasks? failed last run/i)).toBeInTheDocument(),
      )
    })

    it('clears stale lastRuns on repo switch — banner must not show stale failure for new repo', async () => {
      const FAILED_RUN: WorkflowRun = {
        id: 1,
        status: 'completed',
        conclusion: 'failure',
        createdAt: '2024-01-01T09:00:00Z',
        htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/1',
      }
      vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue(asResult([FAILED_RUN]))

      const { rerender } = render(<TaskList {...BASE_PROPS} repo="my-repo" tasks={[TASK]} />)
      await waitFor(() =>
        expect(screen.getByText(/1 of 1 tasks? failed last run/i)).toBeInTheDocument(),
      )

      // Switch repo — new getWorkflowRuns never resolves (simulates in-flight fetch)
      vi.spyOn(workflows, 'getWorkflowRuns').mockReturnValue(new Promise(() => {}))
      rerender(<TaskList {...BASE_PROPS} repo="other-repo" tasks={[TASK]} />)

      // Banner must be gone immediately — stale lastRuns cleared on repo change
      expect(screen.queryByText(/tasks failed last run/i)).not.toBeInTheDocument()
    })
  })

  describe('last-run status badge', () => {
    it('shows Failed badge when last run conclusion is failure', async () => {
      vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue(
        asResult([
          {
            id: 1,
            status: 'completed',
            conclusion: 'failure',
            createdAt: '2024-01-01T09:00:00Z',
            htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/1',
          },
        ]),
      )
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      await waitFor(() => expect(screen.getByText(/^Failed$/i)).toBeInTheDocument())
    })

    it('shows Cancelled badge when last run is cancelled', async () => {
      vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue(
        asResult([
          {
            id: 2,
            status: 'completed',
            conclusion: 'cancelled',
            createdAt: '2024-01-01T09:00:00Z',
            htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/2',
          },
        ]),
      )
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      await waitFor(() => expect(screen.getByText(/^Cancelled$/i)).toBeInTheDocument())
    })

    it('shows Running badge when last run is in_progress', async () => {
      vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue(
        asResult([
          {
            id: 3,
            status: 'in_progress',
            conclusion: null,
            createdAt: '2024-01-01T09:00:00Z',
            htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/3',
          },
        ]),
      )
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      await waitFor(() => expect(screen.getByText(/^Running$/i)).toBeInTheDocument())
    })

    it('shows no status badge when last run is success', async () => {
      vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue(
        asResult([
          {
            id: 4,
            status: 'completed',
            conclusion: 'success',
            createdAt: '2024-01-01T09:00:00Z',
            htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/4',
          },
        ]),
      )
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
      vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue(
        asResult([
          {
            id: 10,
            status: 'completed',
            conclusion: 'failure',
            createdAt: '2024-01-01T09:00:00Z',
            htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/10',
          },
        ]),
      )
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
      vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue(
        asResult([
          {
            id: 11,
            status: 'in_progress',
            conclusion: null,
            createdAt: '2024-01-01T09:00:00Z',
            htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/11',
          },
        ]),
      )
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      await waitFor(() =>
        expect(screen.getByRole('link', { name: /^Running$/i })).toBeInTheDocument(),
      )
      expect(screen.getByRole('link', { name: /^Running$/i })).toHaveAttribute(
        'href',
        'https://github.com/testuser/my-repo/actions/runs/11',
      )
    })

    it('banner counts only filtered tasks — hides when failing tasks are filtered out', async () => {
      const okTask: GithatchTask = {
        ...TASK,
        slug: 'ok-task',
        displayName: 'Ok Task',
        workflowId: 99,
      }
      vi.spyOn(workflows, 'getWorkflowRuns').mockImplementation(({ workflowId }) => {
        if (workflowId === TASK.workflowId) {
          return Promise.resolve(
            asResult([
              {
                id: 1,
                status: 'completed',
                conclusion: 'failure',
                createdAt: '2024-01-01T09:00:00Z',
                htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/1',
              },
            ]),
          )
        }
        return Promise.resolve(
          asResult([
            {
              id: 2,
              status: 'completed',
              conclusion: 'success',
              createdAt: '2024-01-01T09:00:00Z',
              htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/2',
            },
          ]),
        )
      })
      render(<TaskList {...BASE_PROPS} tasks={[TASK, okTask]} />)
      // Unfiltered: banner shows "1 of 2 tasks failed"
      await waitFor(() =>
        expect(screen.getByText(/1 of 2 tasks failed last run/i)).toBeInTheDocument(),
      )
      // Filter to show only the ok task — banner must disappear
      fireEvent.change(screen.getByRole('textbox', { name: /filter/i }), {
        target: { value: 'Ok Task' },
      })
      expect(screen.queryByText(/tasks failed last run/i)).not.toBeInTheDocument()
    })
  })

  describe('task filter', () => {
    const manualTask: GithatchTask = {
      ...TASK,
      slug: 'ad-hoc',
      displayName: 'Ad Hoc Task',
      schedule: '',
      workflowId: 43,
    }

    it('does not show a filter input when there are no tasks', () => {
      render(<TaskList {...BASE_PROPS} tasks={[]} />)
      expect(screen.queryByRole('textbox', { name: /filter/i })).not.toBeInTheDocument()
    })

    it('shows a filter input when there are tasks', () => {
      render(<TaskList {...BASE_PROPS} tasks={[TASK, manualTask]} />)
      expect(screen.getByRole('textbox', { name: /filter/i })).toBeInTheDocument()
    })

    it('filters tasks by display name', () => {
      render(<TaskList {...BASE_PROPS} tasks={[TASK, manualTask]} />)
      fireEvent.change(screen.getByRole('textbox', { name: /filter/i }), {
        target: { value: 'Daily' },
      })
      expect(screen.getByText('Daily Standup')).toBeInTheDocument()
      expect(screen.queryByText('Ad Hoc Task')).not.toBeInTheDocument()
    })

    it('filter matching is case-insensitive', () => {
      render(<TaskList {...BASE_PROPS} tasks={[TASK, manualTask]} />)
      fireEvent.change(screen.getByRole('textbox', { name: /filter/i }), {
        target: { value: 'ad hoc' },
      })
      expect(screen.getByText('Ad Hoc Task')).toBeInTheDocument()
      expect(screen.queryByText('Daily Standup')).not.toBeInTheDocument()
    })

    it('shows a message when no tasks match the filter', () => {
      render(<TaskList {...BASE_PROPS} tasks={[TASK, manualTask]} />)
      fireEvent.change(screen.getByRole('textbox', { name: /filter/i }), {
        target: { value: 'nonexistent' },
      })
      expect(screen.getByText(/no tasks match/i)).toBeInTheDocument()
      expect(screen.queryByText('Daily Standup')).not.toBeInTheDocument()
      expect(screen.queryByText('Ad Hoc Task')).not.toBeInTheDocument()
    })

    it('clearing the filter shows all tasks again', () => {
      render(<TaskList {...BASE_PROPS} tasks={[TASK, manualTask]} />)
      const input = screen.getByRole('textbox', { name: /filter/i })
      fireEvent.change(input, { target: { value: 'Daily' } })
      expect(screen.queryByText('Ad Hoc Task')).not.toBeInTheDocument()
      fireEvent.change(input, { target: { value: '' } })
      expect(screen.getByText('Daily Standup')).toBeInTheDocument()
      expect(screen.getByText('Ad Hoc Task')).toBeInTheDocument()
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

  describe('prompt viewer', () => {
    it('renders a Prompt button for a task with a workflowId', () => {
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      expect(screen.getByRole('button', { name: /^prompt$/i })).toBeInTheDocument()
    })

    it('shows the prompt text when Prompt is clicked', () => {
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      expect(screen.queryByText(TASK.prompt)).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /^prompt$/i }))
      expect(screen.getByText(TASK.prompt)).toBeInTheDocument()
    })

    it('hides the prompt panel when Hide prompt is clicked', () => {
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      fireEvent.click(screen.getByRole('button', { name: /^prompt$/i }))
      expect(screen.getByText(TASK.prompt)).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /^hide prompt$/i }))
      expect(screen.queryByText(TASK.prompt)).not.toBeInTheDocument()
    })

    it('shows "(no prompt)" for a task with an empty prompt', () => {
      const noPromptTask: GithatchTask = { ...TASK, prompt: '' }
      render(<TaskList {...BASE_PROPS} tasks={[noPromptTask]} />)
      fireEvent.click(screen.getByRole('button', { name: /^prompt$/i }))
      expect(screen.getByText('(no prompt)')).toBeInTheDocument()
    })
  })

  describe('auto-poll after trigger', () => {
    beforeEach(() => {
      // Fake only setInterval/clearInterval so waitFor (which uses setTimeout) still works
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    })

    afterEach(() => {
      vi.clearAllTimers()
      vi.useRealTimers()
    })

    it('shows Queued badge immediately after Run now succeeds', async () => {
      vi.spyOn(workflows, 'triggerWorkflow').mockResolvedValue(undefined)
      vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue(asResult([]))
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      fireEvent.click(screen.getByRole('button', { name: /run now/i }))
      await waitFor(() => expect(screen.getByText(/^Queued$/i)).toBeInTheDocument())
    })

    it('Queued badge is not a link', async () => {
      vi.spyOn(workflows, 'triggerWorkflow').mockResolvedValue(undefined)
      vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue(asResult([]))
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      fireEvent.click(screen.getByRole('button', { name: /run now/i }))
      await waitFor(() => expect(screen.getByText(/^Queued$/i)).toBeInTheDocument())
      expect(screen.queryByRole('link', { name: /^Queued$/i })).not.toBeInTheDocument()
    })

    it('transitions from Queued to Running when a new run appears via poll', async () => {
      vi.spyOn(workflows, 'triggerWorkflow').mockResolvedValue(undefined)
      const runsMock = vi.spyOn(workflows, 'getWorkflowRuns')
      // Initial mount: no previous runs
      runsMock.mockResolvedValue(asResult([]))

      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)

      // Let initial load resolve
      await act(async () => {
        await Promise.resolve()
      })

      // After trigger, polls will return a new in_progress run with a different ID
      runsMock.mockResolvedValue(
        asResult([
          {
            id: 999,
            status: 'in_progress',
            conclusion: null,
            createdAt: new Date().toISOString(),
            htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/999',
          },
        ]),
      )

      fireEvent.click(screen.getByRole('button', { name: /run now/i }))
      await waitFor(() => expect(screen.getByText(/^Queued$/i)).toBeInTheDocument())

      // Advance setInterval by one tick (8 s) to fire the first poll
      await act(async () => {
        vi.advanceTimersByTime(8000)
        await Promise.resolve()
      })

      await waitFor(() => expect(screen.getByText(/^Running$/i)).toBeInTheDocument())
      expect(screen.queryByText(/^Queued$/i)).not.toBeInTheDocument()
    })

    it('stops polling and clears Queued badge when run completes successfully', async () => {
      vi.spyOn(workflows, 'triggerWorkflow').mockResolvedValue(undefined)
      const runsMock = vi.spyOn(workflows, 'getWorkflowRuns')
      runsMock.mockResolvedValue(asResult([]))

      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      await act(async () => {
        await Promise.resolve()
      })

      runsMock.mockResolvedValue(
        asResult([
          {
            id: 999,
            status: 'completed',
            conclusion: 'success',
            createdAt: new Date().toISOString(),
            htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/999',
          },
        ]),
      )

      fireEvent.click(screen.getByRole('button', { name: /run now/i }))
      await waitFor(() => expect(screen.getByText(/^Queued$/i)).toBeInTheDocument())

      await act(async () => {
        vi.advanceTimersByTime(8000)
        await Promise.resolve()
      })

      // Run completed with success — neither Queued nor any failure badge
      await waitFor(() => expect(screen.queryByText(/^Queued$/i)).not.toBeInTheDocument())
      expect(screen.queryByText(/^Running$/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/^Failed$/i)).not.toBeInTheDocument()
    })

    it('disables the trigger button while polling', async () => {
      vi.spyOn(workflows, 'triggerWorkflow').mockResolvedValue(undefined)
      vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue(asResult([]))
      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      fireEvent.click(screen.getByRole('button', { name: /run now/i }))
      await waitFor(() => expect(screen.getByText(/^Queued$/i)).toBeInTheDocument())
      // Button shows "Triggered!" for 3 s then returns to "Run now" — either way disabled
      const triggerBtn = screen.getByRole('button', { name: /^(run now|triggered!)$/i })
      expect(triggerBtn).toBeDisabled()
    })
  })

  describe('auto-output after successful trigger', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    })

    afterEach(() => {
      vi.clearAllTimers()
      vi.useRealTimers()
    })

    it('shows output inline after poll detects success for new_issue task', async () => {
      vi.spyOn(workflows, 'triggerWorkflow').mockResolvedValue(undefined)
      const runsMock = vi.spyOn(workflows, 'getWorkflowRuns')
      runsMock.mockResolvedValue(asResult([]))
      vi.spyOn(workflows, 'fetchRunOutput').mockResolvedValue({
        type: 'issue',
        title: 'Weekly Report',
        body: 'Agent findings here',
        htmlUrl: 'https://github.com/testuser/my-repo/issues/1',
        createdAt: new Date().toISOString(),
      })

      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      await act(async () => {
        await Promise.resolve()
      })

      runsMock.mockResolvedValue(
        asResult([
          {
            id: 999,
            status: 'completed',
            conclusion: 'success',
            createdAt: new Date().toISOString(),
            htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/999',
          },
        ]),
      )

      fireEvent.click(screen.getByRole('button', { name: /run now/i }))
      await waitFor(() => expect(screen.getByText(/^Queued$/i)).toBeInTheDocument())

      await act(async () => {
        vi.advanceTimersByTime(8000)
        await Promise.resolve()
      })

      await waitFor(() => expect(workflows.fetchRunOutput).toHaveBeenCalledOnce())
      await waitFor(() => expect(screen.getByText('Weekly Report')).toBeInTheDocument())
      expect(screen.getByText('Agent findings here')).toBeInTheDocument()
    })

    it('does not fetch output when run fails', async () => {
      vi.spyOn(workflows, 'triggerWorkflow').mockResolvedValue(undefined)
      const runsMock = vi.spyOn(workflows, 'getWorkflowRuns')
      runsMock.mockResolvedValue(asResult([]))
      const fetchOutput = vi.spyOn(workflows, 'fetchRunOutput')

      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      await act(async () => {
        await Promise.resolve()
      })

      runsMock.mockResolvedValue(
        asResult([
          {
            id: 999,
            status: 'completed',
            conclusion: 'failure',
            createdAt: new Date().toISOString(),
            htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/999',
          },
        ]),
      )

      fireEvent.click(screen.getByRole('button', { name: /run now/i }))
      await waitFor(() => expect(screen.getByText(/^Queued$/i)).toBeInTheDocument())

      await act(async () => {
        vi.advanceTimersByTime(8000)
        await Promise.resolve()
      })

      await waitFor(() => expect(screen.queryByText(/^Queued$/i)).not.toBeInTheDocument())
      expect(fetchOutput).not.toHaveBeenCalled()
    })

    it('shows file link inline after poll detects success for file task', async () => {
      const fileTask: GithatchTask = {
        ...TASK,
        outputDestination: { type: 'file', filePath: 'reports/weekly.md' },
      }
      vi.spyOn(workflows, 'triggerWorkflow').mockResolvedValue(undefined)
      const runsMock = vi.spyOn(workflows, 'getWorkflowRuns')
      runsMock.mockResolvedValue(asResult([]))
      vi.spyOn(workflows, 'fetchRunOutput').mockResolvedValue({
        type: 'file_link',
        title: 'reports/weekly.md',
        htmlUrl: 'https://github.com/testuser/my-repo/blob/main/reports/weekly.md',
      })

      render(<TaskList {...BASE_PROPS} tasks={[fileTask]} />)
      await act(async () => {
        await Promise.resolve()
      })

      runsMock.mockResolvedValue(
        asResult([
          {
            id: 999,
            status: 'completed',
            conclusion: 'success',
            createdAt: new Date().toISOString(),
            htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/999',
          },
        ]),
      )

      fireEvent.click(screen.getByRole('button', { name: /run now/i }))
      await waitFor(() => expect(screen.getByText(/^Queued$/i)).toBeInTheDocument())

      await act(async () => {
        vi.advanceTimersByTime(8000)
        await Promise.resolve()
      })

      await waitFor(() => expect(workflows.fetchRunOutput).toHaveBeenCalledOnce())
      await waitFor(() => expect(screen.getByText(/committed to file/i)).toBeInTheDocument())
      expect(screen.getByText('reports/weekly.md')).toBeInTheDocument()
    })

    it('shows pr link inline after poll detects success for pull_request task', async () => {
      const prTask: GithatchTask = {
        ...TASK,
        outputDestination: { type: 'pull_request' },
      }
      vi.spyOn(workflows, 'triggerWorkflow').mockResolvedValue(undefined)
      const runsMock = vi.spyOn(workflows, 'getWorkflowRuns')
      runsMock.mockResolvedValue(asResult([]))
      vi.spyOn(workflows, 'fetchRunOutput').mockResolvedValue({
        type: 'pr',
        title: '#7 chore: update deps',
        body: 'Bumps lodash to 4.17.21',
        htmlUrl: 'https://github.com/testuser/my-repo/pull/7',
        createdAt: new Date().toISOString(),
      })

      render(<TaskList {...BASE_PROPS} tasks={[prTask]} />)
      await act(async () => {
        await Promise.resolve()
      })

      runsMock.mockResolvedValue(
        asResult([
          {
            id: 999,
            status: 'completed',
            conclusion: 'success',
            createdAt: new Date().toISOString(),
            htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/999',
          },
        ]),
      )

      fireEvent.click(screen.getByRole('button', { name: /run now/i }))
      await waitFor(() => expect(screen.getByText(/^Queued$/i)).toBeInTheDocument())

      await act(async () => {
        vi.advanceTimersByTime(8000)
        await Promise.resolve()
      })

      await waitFor(() => expect(workflows.fetchRunOutput).toHaveBeenCalledOnce())
      await waitFor(() => expect(screen.getByText(/created pull request/i)).toBeInTheDocument())
      expect(screen.getByText('#7 chore: update deps')).toBeInTheDocument()
    })

    it('dismissing the output panel clears it', async () => {
      vi.spyOn(workflows, 'triggerWorkflow').mockResolvedValue(undefined)
      const runsMock = vi.spyOn(workflows, 'getWorkflowRuns')
      runsMock.mockResolvedValue(asResult([]))
      vi.spyOn(workflows, 'fetchRunOutput').mockResolvedValue({
        type: 'issue',
        title: 'Sprint Report',
        body: 'Done.',
        htmlUrl: 'https://github.com/testuser/my-repo/issues/2',
        createdAt: new Date().toISOString(),
      })

      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      await act(async () => {
        await Promise.resolve()
      })

      runsMock.mockResolvedValue(
        asResult([
          {
            id: 999,
            status: 'completed',
            conclusion: 'success',
            createdAt: new Date().toISOString(),
            htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/999',
          },
        ]),
      )

      fireEvent.click(screen.getByRole('button', { name: /run now/i }))
      await waitFor(() => expect(screen.getByText(/^Queued$/i)).toBeInTheDocument())

      await act(async () => {
        vi.advanceTimersByTime(8000)
        await Promise.resolve()
      })

      await waitFor(() => expect(screen.getByText('Sprint Report')).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /^close$/i }))
      expect(screen.queryByText('Sprint Report')).not.toBeInTheDocument()
    })

    it('clears stale output from run 1 immediately when run 2 is triggered', async () => {
      vi.spyOn(workflows, 'triggerWorkflow').mockResolvedValue(undefined)
      const runsMock = vi.spyOn(workflows, 'getWorkflowRuns')
      runsMock.mockResolvedValue(asResult([]))
      const fetchOutput = vi
        .spyOn(workflows, 'fetchRunOutput')
        .mockResolvedValueOnce({
          type: 'issue',
          title: 'Run 1 Output',
          body: 'First run result',
          htmlUrl: 'https://github.com/testuser/my-repo/issues/1',
          createdAt: new Date().toISOString(),
        })
        .mockResolvedValue(null)

      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      await act(async () => {
        await Promise.resolve()
      })

      runsMock.mockResolvedValue(
        asResult([
          {
            id: 100,
            status: 'completed',
            conclusion: 'success',
            createdAt: new Date().toISOString(),
            htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/100',
          },
        ]),
      )

      // Trigger run 1 and wait for its output to appear
      fireEvent.click(screen.getByRole('button', { name: /run now/i }))
      await waitFor(() => expect(screen.getByText(/^Queued$/i)).toBeInTheDocument())
      await act(async () => {
        vi.advanceTimersByTime(8000)
        await Promise.resolve()
      })
      await waitFor(() => expect(screen.getByText('Run 1 Output')).toBeInTheDocument())

      // The 3s setTriggered(false) setTimeout is a real timer — not yet fired at this point.
      // Button shows "Triggered!" (triggered=true) but is enabled (polling=false, triggering=false).
      // Clicking it must clear triggeredOutput immediately before the new trigger resolves.
      runsMock.mockResolvedValue(
        asResult([
          {
            id: 101,
            status: 'in_progress',
            conclusion: null,
            createdAt: new Date().toISOString(),
            htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/101',
          },
        ]),
      )
      fireEvent.click(screen.getByRole('button', { name: /triggered!/i }))
      expect(screen.queryByText('Run 1 Output')).not.toBeInTheDocument()
      expect(fetchOutput).toHaveBeenCalledOnce()
    })
  })

  describe('RunHistoryPanel output race condition', () => {
    const TWO_RUNS = [
      {
        id: 1,
        status: 'completed',
        conclusion: 'success',
        createdAt: '2024-01-01T09:00:00Z',
        htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/1',
      },
      {
        id: 2,
        status: 'completed',
        conclusion: 'success',
        createdAt: '2024-01-01T10:00:00Z',
        htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/2',
      },
    ]

    it('discards stale output when a second click fires before the first resolves', async () => {
      vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue(asResult(TWO_RUNS))

      let resolveRun1!: (v: { type: 'issue'; title: string; htmlUrl: string } | null) => void
      let resolveRun2!: (v: { type: 'issue'; title: string; htmlUrl: string } | null) => void
      const p1 = new Promise<{ type: 'issue'; title: string; htmlUrl: string } | null>((r) => {
        resolveRun1 = r
      })
      const p2 = new Promise<{ type: 'issue'; title: string; htmlUrl: string } | null>((r) => {
        resolveRun2 = r
      })

      vi.spyOn(workflows, 'fetchRunOutput')
        .mockImplementationOnce(() => p1)
        .mockImplementationOnce(() => p2)

      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)

      fireEvent.click(screen.getAllByRole('button', { name: /^history$/i })[0])
      await waitFor(() =>
        expect(screen.getAllByRole('button', { name: /view output/i })).toHaveLength(2),
      )

      // Click View output for run 1 (slow fetch)
      fireEvent.click(screen.getAllByRole('button', { name: /view output/i })[0])
      // Click View output for run 2 immediately — supersedes run 1
      fireEvent.click(screen.getByRole('button', { name: /view output/i }))

      // Resolve run 1 (stale — run 2 was requested more recently)
      await act(async () => {
        resolveRun1({
          type: 'issue',
          title: 'Run 1 output',
          htmlUrl: 'https://github.com/testuser/my-repo/issues/1',
        })
      })

      // Stale result must be discarded
      expect(screen.queryByText('Run 1 output')).not.toBeInTheDocument()
      // Run 2 must still show Loading… — loadingOutput must not be cleared prematurely
      expect(screen.getByRole('button', { name: /loading/i })).toBeInTheDocument()

      // Resolve run 2 (current request)
      await act(async () => {
        resolveRun2({
          type: 'issue',
          title: 'Run 2 output',
          htmlUrl: 'https://github.com/testuser/my-repo/issues/2',
        })
      })

      await waitFor(() => expect(screen.getByText('Run 2 output')).toBeInTheDocument())
      expect(screen.queryByText('Run 1 output')).not.toBeInTheDocument()
    })

    it('shows output correctly when single View output click resolves normally', async () => {
      vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue(asResult(TWO_RUNS))

      vi.spyOn(workflows, 'fetchRunOutput').mockResolvedValue({
        type: 'issue',
        title: 'Run 1 output',
        htmlUrl: 'https://github.com/testuser/my-repo/issues/1',
      })

      render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
      fireEvent.click(screen.getAllByRole('button', { name: /^history$/i })[0])
      await waitFor(() =>
        expect(screen.getAllByRole('button', { name: /view output/i })).toHaveLength(2),
      )

      fireEvent.click(screen.getAllByRole('button', { name: /view output/i })[0])
      await waitFor(() => expect(screen.getByText('Run 1 output')).toBeInTheDocument())
    })
  })

  describe('RunHistoryPanel fetchRuns race condition', () => {
    const STALE_RUN: WorkflowRun = {
      id: 1,
      status: 'completed',
      conclusion: 'failure',
      createdAt: '2024-01-01T09:00:00Z',
      htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/1',
    }
    const CURRENT_RUN: WorkflowRun = {
      id: 2,
      status: 'completed',
      conclusion: 'success',
      createdAt: '2024-01-02T09:00:00Z',
      htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/2',
    }

    it('discards stale run list when StrictMode effect fires fetchRuns twice concurrently', async () => {
      let resolveFirst!: (v: WorkflowRunsResult) => void
      let resolveSecond!: (v: WorkflowRunsResult) => void
      const p1 = new Promise<WorkflowRunsResult>((r) => {
        resolveFirst = r
      })
      const p2 = new Promise<WorkflowRunsResult>((r) => {
        resolveSecond = r
      })

      // StrictMode doubles all effects. TaskRow.useEffect fires twice (calls 1+2) on initial
      // render; RunHistoryPanel.fetchRuns fires twice (calls 3+4) after History is clicked.
      vi.spyOn(workflows, 'getWorkflowRuns')
        .mockResolvedValueOnce(asResult([])) // TaskRow StrictMode effect — call 1
        .mockResolvedValueOnce(asResult([])) // TaskRow StrictMode effect — call 2
        .mockImplementationOnce(() => p1) // RunHistoryPanel first effect (stale)
        .mockImplementationOnce(() => p2) // RunHistoryPanel second effect (current)

      render(
        <StrictMode>
          <TaskList {...BASE_PROPS} tasks={[TASK]} />
        </StrictMode>,
      )

      // Open panel — StrictMode fires useEffect twice (p1 and p2 both in-flight)
      fireEvent.click(screen.getAllByRole('button', { name: /^history$/i })[0])

      // Resolve p2 first (the current/second request — "Success" run)
      await act(async () => {
        resolveSecond(asResult([CURRENT_RUN]))
      })

      await waitFor(() => expect(screen.getByText('Success')).toBeInTheDocument())

      // Resolve p1 (stale — should be discarded)
      await act(async () => {
        resolveFirst(asResult([STALE_RUN]))
      })

      // Stale "failure" conclusion must not overwrite the current "Success"
      expect(screen.queryByText('failure')).not.toBeInTheDocument()
      expect(screen.getByText('Success')).toBeInTheDocument()
    })
  })

  describe('TaskRow last-run fetch race condition', () => {
    const STALE_RUN: WorkflowRun = {
      id: 10,
      status: 'completed',
      conclusion: 'success',
      createdAt: '2024-01-01T09:00:00Z',
      htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/10',
    }
    const CURRENT_RUN: WorkflowRun = {
      id: 11,
      status: 'completed',
      conclusion: 'failure',
      createdAt: '2024-01-02T09:00:00Z',
      htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/11',
    }

    it('discards stale last-run when StrictMode fires initial fetch twice', async () => {
      let resolveFirst!: (v: WorkflowRunsResult) => void
      let resolveSecond!: (v: WorkflowRunsResult) => void
      const p1 = new Promise<WorkflowRunsResult>((r) => {
        resolveFirst = r
      })
      const p2 = new Promise<WorkflowRunsResult>((r) => {
        resolveSecond = r
      })

      // StrictMode fires TaskRow's initial useEffect twice: p1 (stale success) and p2 (current failure).
      vi.spyOn(workflows, 'getWorkflowRuns')
        .mockImplementationOnce(() => p1)
        .mockImplementationOnce(() => p2)

      render(
        <StrictMode>
          <TaskList {...BASE_PROPS} tasks={[TASK]} />
        </StrictMode>,
      )

      // Resolve p2 first (current — failure → "Failed" badge)
      await act(async () => {
        resolveSecond(asResult([CURRENT_RUN]))
      })
      await waitFor(() => expect(screen.getByText('Failed')).toBeInTheDocument())

      // Resolve p1 (stale — success → no badge — must not overwrite current failure)
      await act(async () => {
        resolveFirst(asResult([STALE_RUN]))
      })

      expect(screen.getByText('Failed')).toBeInTheDocument()
    })

    it('re-fetches last run when repo changes while workflowId stays the same', async () => {
      const firstRun: WorkflowRun = {
        id: 1,
        status: 'completed',
        conclusion: 'success',
        createdAt: '2024-01-01T09:00:00Z',
        htmlUrl: 'https://github.com/testuser/my-repo/actions/runs/1',
      }
      const secondRun: WorkflowRun = {
        id: 2,
        status: 'completed',
        conclusion: 'failure',
        createdAt: '2024-01-02T09:00:00Z',
        htmlUrl: 'https://github.com/otheruser/other-repo/actions/runs/2',
      }

      vi.spyOn(workflows, 'getWorkflowRuns')
        .mockResolvedValueOnce(asResult([firstRun]))
        .mockResolvedValueOnce(asResult([secondRun]))

      const { rerender } = render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)

      await waitFor(() =>
        expect(workflows.getWorkflowRuns).toHaveBeenCalledWith(
          expect.objectContaining({ owner: 'testuser', repo: 'my-repo' }),
        ),
      )
      // firstRun is success — no badge shown
      expect(screen.queryByText('Failed')).not.toBeInTheDocument()

      // Switch repo; workflowId (42) stays the same
      rerender(<TaskList {...BASE_PROPS} owner="otheruser" repo="other-repo" tasks={[TASK]} />)

      // Effect must re-fire with new owner/repo and surface the failure from the new repo
      await waitFor(() => expect(screen.getByText('Failed')).toBeInTheDocument())
      expect(workflows.getWorkflowRuns).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'otheruser', repo: 'other-repo' }),
      )
    })
  })

  it('syncs enabled state when task.enabled prop changes on re-render', async () => {
    const enabledTask: GithatchTask = { ...TASK, enabled: true }
    const { rerender } = render(<TaskList {...BASE_PROPS} tasks={[enabledTask]} />)
    expect(screen.getByRole('button', { name: /pause task/i })).toBeInTheDocument()

    // Parent refreshes and the task is now disabled (e.g. user disabled it on GitHub)
    const disabledTask: GithatchTask = { ...TASK, enabled: false }
    rerender(<TaskList {...BASE_PROPS} tasks={[disabledTask]} />)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /resume task/i })).toBeInTheDocument(),
    )
    expect(screen.queryByRole('button', { name: /pause task/i })).not.toBeInTheDocument()
  })
})
