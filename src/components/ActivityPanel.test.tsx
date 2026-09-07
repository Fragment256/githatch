import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ActivityPanel } from './ActivityPanel'
import * as workflows from '@/lib/workflows'
import * as github from '@/lib/github'
import type { GithatchTask, WorkflowRunsResult } from '@/lib/workflows'
import type { CommitSummary } from '@/lib/github'

vi.mock('@/lib/workflows', () => ({
  getWorkflowRuns: vi.fn(),
}))
vi.mock('@/lib/github', () => ({
  getRecentCommits: vi.fn(),
  getRecentPRs: vi.fn(),
  getPRCounts: vi.fn(),
}))

const mockGetWorkflowRuns = vi.mocked(workflows.getWorkflowRuns)
const mockGetRecentCommits = vi.mocked(github.getRecentCommits)
const mockGetRecentPRs = vi.mocked(github.getRecentPRs)
const mockGetPRCounts = vi.mocked(github.getPRCounts)

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
    let resolveStale: (result: WorkflowRunsResult) => void = () => {}
    const stalePromise = new Promise<WorkflowRunsResult>((resolve) => {
      resolveStale = resolve
    })
    mockGetWorkflowRuns.mockReturnValueOnce(stalePromise)
    mockGetWorkflowRuns.mockResolvedValueOnce({ runs: [], totalCount: 0 })
    mockGetRecentCommits.mockResolvedValue([])
    mockGetRecentPRs.mockResolvedValue([])
    mockGetPRCounts.mockResolvedValue({ open: 0, merged: 0 })

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
      resolveStale({
        runs: [
          {
            id: 1,
            status: 'completed',
            conclusion: 'success',
            createdAt: new Date().toISOString(),
            htmlUrl: '',
          },
        ],
        totalCount: 1,
      })
    })

    expect(screen.getByText('task-b')).toBeInTheDocument()
    expect(screen.getByText(/0 runs/)).toBeInTheDocument()
  })

  it('fetches workflow runs when tasks arrive after initial empty render', async () => {
    const task = makeTask('task-a', 1)
    mockGetWorkflowRuns.mockResolvedValue({
      runs: [
        {
          id: 1,
          status: 'completed',
          conclusion: 'success',
          createdAt: new Date().toISOString(),
          htmlUrl: '',
        },
      ],
      totalCount: 1,
    })
    mockGetRecentCommits.mockResolvedValue([])
    mockGetRecentPRs.mockResolvedValue([])
    mockGetPRCounts.mockResolvedValue({ open: 0, merged: 0 })

    const { rerender } = render(
      <ActivityPanel tasks={[]} token="t" owner="o" repo="r" defaultBranch="main" />,
    )
    // No task rows on initial render with empty tasks
    expect(screen.queryByText('task-a')).not.toBeInTheDocument()

    // Tasks arrive via props (simulating async load)
    rerender(<ActivityPanel tasks={[task]} token="t" owner="o" repo="r" defaultBranch="main" />)

    // Effect should re-run and populate the task activity row
    await waitFor(() => expect(screen.getByText('task-a')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText(/1 run/)).toBeInTheDocument())
  })

  it('ignores a stale commit response that resolves after the repo changes', async () => {
    let resolveStaleCommits: (c: CommitSummary[]) => void = () => {}
    const staleCommits = new Promise<CommitSummary[]>((resolve) => {
      resolveStaleCommits = resolve
    })
    mockGetRecentCommits.mockReturnValueOnce(staleCommits)
    mockGetRecentCommits.mockResolvedValueOnce([])
    mockGetRecentPRs.mockResolvedValue([])
    mockGetPRCounts.mockResolvedValue({ open: 0, merged: 0 })
    mockGetWorkflowRuns.mockResolvedValue({ runs: [], totalCount: 0 })

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

  it('shows … for run counts when a task workflow fetch errors', async () => {
    const task = makeTask('task-a', 1)
    mockGetWorkflowRuns.mockRejectedValue(new Error('rate limited'))
    mockGetRecentCommits.mockResolvedValue([])
    mockGetRecentPRs.mockResolvedValue([])
    mockGetPRCounts.mockResolvedValue({ open: 0, merged: 0 })

    render(<ActivityPanel tasks={[task]} token="t" owner="o" repo="r" defaultBranch="main" />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
    })

    // After a task fetch error, "Runs this week" and "Total runs" must show … not a (wrong) number
    const allStatValues = screen.getAllByText((_, el) => {
      return el?.tagName === 'P' && el.classList.contains('text-2xl')
    })
    expect(allStatValues[0].textContent).toBe('…')
    expect(allStatValues[1].textContent).toBe('…')
  })

  it('does not show 0 for PR counts when repo API calls fail', async () => {
    mockGetWorkflowRuns.mockResolvedValue({ runs: [], totalCount: 0 })
    mockGetRecentCommits.mockRejectedValue(new Error('network error'))
    mockGetRecentPRs.mockRejectedValue(new Error('network error'))
    mockGetPRCounts.mockRejectedValue(new Error('network error'))

    render(<ActivityPanel tasks={[]} token="t" owner="o" repo="repo-a" defaultBranch="main" />)

    // Wait for loading to complete (loading spinner disappears means API call finished)
    await waitFor(() => {
      expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
    })

    // After the error, PR counts must NOT show 0 — showing 0 implies "no PRs" which is factually wrong.
    // "Runs this week" and "Total runs" may legitimately be 0 (no tasks), but
    // "Open PRs" and "Merged PRs" (indices 2 and 3 in the stat grid) must not be 0 after an API failure.
    const allStatValues = screen.getAllByText((_, el) => {
      return el?.tagName === 'P' && el.classList.contains('text-2xl')
    })
    expect(allStatValues[2].textContent).not.toBe('0')
    expect(allStatValues[3].textContent).not.toBe('0')
  })

  it('does not show stale PR counts from previous repo when new repo API fails', async () => {
    mockGetWorkflowRuns.mockResolvedValue({ runs: [], totalCount: 0 })
    mockGetRecentCommits.mockResolvedValue([])
    mockGetRecentPRs.mockResolvedValue([])
    mockGetPRCounts.mockResolvedValueOnce({ open: 3, merged: 7 })
    mockGetPRCounts.mockRejectedValueOnce(new Error('network error'))

    const { rerender } = render(
      <ActivityPanel tasks={[]} token="t" owner="o" repo="repo-a" defaultBranch="main" />,
    )

    // Wait for repo A PR counts to load (Open PRs tile shows 3)
    await waitFor(() => {
      const values = screen.getAllByText((_, el) => {
        return el?.tagName === 'P' && el.classList.contains('text-2xl')
      })
      expect(values[2].textContent).toBe('3')
    })

    // Switch to repo B whose getPRCounts rejects
    rerender(<ActivityPanel tasks={[]} token="t" owner="o" repo="repo-b" defaultBranch="main" />)

    // Wait for repo B error to appear (shows in both PRs and commits sections)
    await waitFor(() => screen.getAllByText('Failed to load repository activity'))

    // Stat tiles must show '…' — not the stale '3'/'7' from repo A
    const allStatValues = screen.getAllByText((_, el) => {
      return el?.tagName === 'P' && el.classList.contains('text-2xl')
    })
    expect(allStatValues[2].textContent).toBe('…')
    expect(allStatValues[3].textContent).toBe('…')
  })

  it('counts run totals/successes/failures from within the 14-day window only', async () => {
    const now = Date.now()
    const task = makeTask('task-x', 1)
    const runsInWindow = [
      {
        id: 1,
        status: 'completed',
        conclusion: 'success',
        createdAt: new Date(now - 1 * 86400_000).toISOString(),
        htmlUrl: '',
      },
      {
        id: 2,
        status: 'completed',
        conclusion: 'success',
        createdAt: new Date(now - 5 * 86400_000).toISOString(),
        htmlUrl: '',
      },
      {
        id: 3,
        status: 'completed',
        conclusion: 'failure',
        createdAt: new Date(now - 10 * 86400_000).toISOString(),
        htmlUrl: '',
      },
    ]
    const runsOutsideWindow = [
      {
        id: 4,
        status: 'completed',
        conclusion: 'success',
        createdAt: new Date(now - 20 * 86400_000).toISOString(),
        htmlUrl: '',
      },
      {
        id: 5,
        status: 'completed',
        conclusion: 'success',
        createdAt: new Date(now - 30 * 86400_000).toISOString(),
        htmlUrl: '',
      },
    ]
    mockGetWorkflowRuns.mockResolvedValue({
      runs: [...runsInWindow, ...runsOutsideWindow],
      totalCount: 5,
    })
    mockGetRecentCommits.mockResolvedValue([])
    mockGetRecentPRs.mockResolvedValue([])
    mockGetPRCounts.mockResolvedValue({ open: 0, merged: 0 })

    render(<ActivityPanel tasks={[task]} token="t" owner="o" repo="r" defaultBranch="main" />)

    // Wait for loading to complete (loading spinner gone)
    await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument())

    // Label must reflect only the 3 in-window runs, not the full 5
    const label = screen.getByText(
      (_, el) => el?.tagName === 'P' && /\d+ runs?/.test(el.textContent ?? ''),
    )
    expect(label.textContent).toContain('3 runs')
    expect(label.textContent).toContain('2 ✓')
    expect(label.textContent).toContain('1 ✗')
    expect(label.textContent).not.toContain('5 runs')
  })
})
