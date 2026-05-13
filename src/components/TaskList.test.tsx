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
}

const BASE_PROPS = {
  token: 'gho_test',
  owner: 'testuser',
  repo: 'my-repo',
  defaultBranch: 'main',
  loading: false,
  error: null,
  onRefresh: vi.fn(),
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

  it('renders task name and schedule', () => {
    render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
    expect(screen.getByText('Daily Standup')).toBeInTheDocument()
    expect(screen.getByText('0 9 * * 1-5')).toBeInTheDocument()
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

  it('loads run history when Run history is clicked', async () => {
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
    fireEvent.click(screen.getByRole('button', { name: /run history/i }))
    await waitFor(() => expect(screen.getByText(/Success/)).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /view logs/i })).toBeInTheDocument()
  })

  it('shows empty run history message when no runs', async () => {
    vi.spyOn(workflows, 'getWorkflowRuns').mockResolvedValue([])
    render(<TaskList {...BASE_PROPS} tasks={[TASK]} />)
    fireEvent.click(screen.getByRole('button', { name: /run history/i }))
    await waitFor(() => expect(screen.getByText(/no runs yet/i)).toBeInTheDocument())
  })

  it('places scheduled tasks under Scheduled section and manual tasks under Manual section', () => {
    const manualTask: GithatchTask = {
      ...TASK,
      slug: 'ad-hoc',
      displayName: 'Ad Hoc Task',
      schedule: '',
    }
    render(<TaskList {...BASE_PROPS} tasks={[TASK, manualTask]} />)
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
    expect(screen.getByText('Manual')).toBeInTheDocument()
    expect(screen.getByText('Daily Standup')).toBeInTheDocument()
    expect(screen.getByText('Ad Hoc Task')).toBeInTheDocument()
  })

  it('shows delete confirmation then calls deleteWorkflowFile on confirm', async () => {
    vi.spyOn(github, 'deleteWorkflowFile').mockResolvedValue(undefined)
    const onRefresh = vi.fn()
    render(<TaskList {...BASE_PROPS} tasks={[TASK]} onRefresh={onRefresh} />)
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    expect(screen.getByText(/delete this task\?/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    await waitFor(() => expect(github.deleteWorkflowFile).toHaveBeenCalledOnce())
    expect(onRefresh).toHaveBeenCalled()
  })

  it('shows Edit schedule button for scheduled tasks and Set schedule for manual tasks', () => {
    const manualTask: GithatchTask = {
      ...TASK,
      slug: 'ad-hoc',
      displayName: 'Ad Hoc Task',
      schedule: '',
    }
    render(<TaskList {...BASE_PROPS} tasks={[TASK, manualTask]} />)
    expect(screen.getByRole('button', { name: /edit schedule/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /set schedule/i })).toBeInTheDocument()
  })
})
