import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ActivityPanel } from './ActivityPanel'
import * as workflows from '@/lib/workflows'
import * as github from '@/lib/github'
import type { GithatchTask, WorkflowRun } from '@/lib/workflows'
import type { CommitSummary } from '@/lib/github'

vi.mock('@/lib/workflows', () => ({
  getWorkflowRuns: vi.fn(),
}))
vi.mock('@/lib/github', () => ({
  getRecentCommits: vi.fn(),
  getRecentPRs: vi.fn(),
}))

const mockGetWorkflowRuns = vi.mocked(workflows.getWorkflowRuns)
const mockGetRecentCommits = vi.mocked(github.getRecentCommits)
const mockGetRecentPRs = vi.mocked(github.getRecentPRs)

function makeTask(slug: string, workflowId: number): GithatchTask {
  return {
    slug,
    displayName: slug,
    schedule: '0 8 * * *',
    workflowId,
    path: `.github/workflows/githatch-${slug}.yml`,
    enabled: true,
    outputDestination: { type: 'new_issue' },
    prompt: 'do work',
  }
}

describe('ActivityPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('ignores a stale task-run response that resolves after the repo changes', async () => {
    let resolveStale: (runs: WorkflowRun[]) => void = () => {}
    const stalePromise = new Promise<WorkflowRun[]>((resolve) => {
      resolveStale = resolve
    })
    mockGetWorkflowRuns.mockReturnValueOnce(stalePromise)
    mockGetWorkflowRuns.mockResolvedValueOnce([])
    mockGetRecentCommits.mockResolvedValue([])
    mockGetRecentPRs.mockResolvedValue([])

    const taskA = makeTask('task-a', 1)
    const taskB = makeTask('task-b', 2)

    const { rerender } = render(
      <ActivityPanel tasks={[taskA]} token="t" owner="o" repo="repo-a" defaultBranch="main" />,
    )

    rerender(
      <ActivityPanel tasks={[taskB]} token="t" owner="o" repo="repo-b" defaultBranch="main" />,
    )

    await waitFor(() => expect(screen.getByText(/0 runs/)).toBeInTheDocument())

    await act(async () => {
      resolveStale([
        {
          id: 1,
          status: 'completed',
          conclusion: 'success',
          createdAt: new Date().toISOString(),
          htmlUrl: '',
        },
      ])
    })

    expect(screen.getByText('task-b')).toBeInTheDocument()
    expect(screen.getByText(/0 runs/)).toBeInTheDocument()
  })

  it('ignores a stale commit response that resolves after the repo changes', async () => {
    let resolveStaleCommits: (c: CommitSummary[]) => void = () => {}
    const staleCommits = new Promise<CommitSummary[]>((resolve) => {
      resolveStaleCommits = resolve
    })
    mockGetRecentCommits.mockReturnValueOnce(staleCommits)
    mockGetRecentCommits.mockResolvedValueOnce([])
    mockGetRecentPRs.mockResolvedValue([])
    mockGetWorkflowRuns.mockResolvedValue([])

    const { rerender } = render(
      <ActivityPanel tasks={[]} token="t" owner="o" repo="repo-a" defaultBranch="main" />,
    )

    rerender(<ActivityPanel tasks={[]} token="t" owner="o" repo="repo-b" defaultBranch="main" />)

    await waitFor(() =>
      expect(screen.getByText('No commits in the last 30 days.')).toBeInTheDocument(),
    )

    await act(async () => {
      resolveStaleCommits([
        { sha: 'abc1234', message: 'stale commit', date: new Date().toISOString(), author: 'x' },
      ])
    })

    expect(screen.getByText('No commits in the last 30 days.')).toBeInTheDocument()
    expect(screen.queryByText('stale commit')).not.toBeInTheDocument()
  })
})
