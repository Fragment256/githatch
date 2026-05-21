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
}

describe('TaskList', () => {
  beforeEach(() => vi.restoreAllMocks())

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
    vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue([])
    render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
    fireEvent.click(screen.getAllByRole('button', { name: /^history$/i })[0])
    await waitFor(() => expect(screen.getByText(/no runs yet/i)).toBeInTheDocument())
  })

  it('renders all tasks in the Tasks section and no Manual section', () => {
    const manualTask: GithatchTask = {
      ...TASK,
      slug: 'ad-hoc',
      displayName: 'Ad Hoc Task',
      schedule: '',
    }
    render(<TaskList {...BASE_PROPS} tasks={[TASK, manualTask]} />)
    expect(screen.queryByText('Manual')).not.toBeInTheDocument()
    expect(screen.getAllByText('Daily Standup').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Ad Hoc Task')).toBeInTheDocument()
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
    // The "Next:" label should appear for a scheduled, enabled task
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

  it('shows Scheduled section only for tasks that have a schedule', () => {
    const manualTask: GithatchTask = {
      ...TASK,
      slug: 'ad-hoc',
      displayName: 'Ad Hoc Task',
      schedule: '',
    }
    render(<TaskList {...BASE_PROPS} tasks={[TASK, manualTask]} />)
    // Scheduled task appears in both Tasks and Scheduled sections
    expect(screen.getAllByText('Daily Standup').length).toBe(2)
    // Manual task appears only in Tasks section
    expect(screen.getAllByText('Ad Hoc Task').length).toBe(1)
    // Cancel button appears in Scheduled section
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })
})
