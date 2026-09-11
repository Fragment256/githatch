import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTasks } from './useTasks'
import * as workflows from '@/lib/workflows'
import type { GithatchTask } from '@/lib/workflows'

vi.mock('@/lib/workflows', () => ({
  listGithatchTasks: vi.fn(),
}))

const mockListGithatchTasks = vi.mocked(workflows.listGithatchTasks)

function makeTask(slug: string): GithatchTask {
  return {
    slug,
    displayName: slug,
    schedule: '0 8 * * *',
    workflowId: 1,
    path: `.github/workflows/githatch-${slug}.yml`,
    enabled: true,
    outputDestination: { type: 'new_issue' },
    prompt: 'do work',
  }
}

describe('useTasks', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads tasks for the given repo', async () => {
    mockListGithatchTasks.mockResolvedValue([makeTask('a')])
    const { result } = renderHook(() => useTasks('gho_test', 'owner', 'repo-a'))

    act(() => {
      result.current.load()
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.tasks).toEqual([makeTask('a')])
  })

  it('ignores a stale response that resolves after a newer request for a different repo', async () => {
    let resolveStale: (tasks: GithatchTask[]) => void = () => {}
    const stalePromise = new Promise<GithatchTask[]>((resolve) => {
      resolveStale = resolve
    })
    mockListGithatchTasks.mockReturnValueOnce(stalePromise)
    mockListGithatchTasks.mockResolvedValueOnce([makeTask('b')])

    const { result, rerender } = renderHook(({ repo }) => useTasks('gho_test', 'owner', repo), {
      initialProps: { repo: 'repo-a' },
    })

    act(() => {
      result.current.load()
    })

    rerender({ repo: 'repo-b' })

    await act(async () => {
      result.current.load()
    })

    await waitFor(() => expect(result.current.tasks).toEqual([makeTask('b')]))

    await act(async () => {
      resolveStale([makeTask('a')])
    })

    expect(result.current.tasks).toEqual([makeTask('b')])
  })

  it('surfaces the error message on failure', async () => {
    mockListGithatchTasks.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useTasks('gho_test', 'owner', 'repo'))

    act(() => {
      result.current.load()
    })

    await waitFor(() => expect(result.current.error).toBe('boom'))
    expect(result.current.loading).toBe(false)
  })

  it('does nothing when token is null', () => {
    const { result } = renderHook(() => useTasks(null, 'owner', 'repo'))

    act(() => {
      result.current.load()
    })

    expect(mockListGithatchTasks).not.toHaveBeenCalled()
  })

  it('addTask prepends a new task', () => {
    const { result } = renderHook(() => useTasks('gho_test', 'owner', 'repo'))

    act(() => {
      result.current.addTask(makeTask('new'))
    })

    expect(result.current.tasks).toEqual([makeTask('new')])
  })

  it('addTask replaces an existing task with the same slug', () => {
    const { result } = renderHook(() => useTasks('gho_test', 'owner', 'repo'))

    act(() => {
      result.current.addTask(makeTask('x'))
    })
    const updated = { ...makeTask('x'), displayName: 'Updated' }
    act(() => {
      result.current.addTask(updated)
    })

    expect(result.current.tasks).toEqual([updated])
  })

  it('optimistic addTask is visible before the fetch resolves and preserved during eventual-consistency window', async () => {
    // Regression: handleTaskFormSubmit calls load() before addTask() so that React 18
    // batching applies setTasks([]) first and the functional updater in addTask() receives
    // [] as prev — producing [optimistic]. Reversed order loses the insert.
    //
    // Additionally: when GitHub hasn't propagated the new file yet, the fetch result should
    // not wipe the optimistic entry. The optimistic task is preserved until the server
    // confirms it (i.e., returns a task with the same slug).
    let resolve: (t: GithatchTask[]) => void = () => {}
    mockListGithatchTasks.mockReturnValueOnce(
      new Promise<GithatchTask[]>((r) => {
        resolve = r
      }),
    )

    const { result } = renderHook(() => useTasks('gho_test', 'owner', 'repo'))

    act(() => {
      result.current.load()
      result.current.addTask(makeTask('optimistic'))
    })

    expect(result.current.tasks).toEqual([makeTask('optimistic')])
    expect(result.current.loading).toBe(true)

    // Server responds without the new task yet (GitHub eventual consistency window).
    // The optimistic entry must survive.
    await act(async () => {
      resolve([makeTask('fetched')])
    })
    expect(result.current.tasks).toEqual([makeTask('optimistic'), makeTask('fetched')])
  })

  it('optimistic task is dropped once the server confirms it', async () => {
    let resolve: (t: GithatchTask[]) => void = () => {}
    mockListGithatchTasks.mockReturnValueOnce(
      new Promise<GithatchTask[]>((r) => {
        resolve = r
      }),
    )

    const { result } = renderHook(() => useTasks('gho_test', 'owner', 'repo'))

    act(() => {
      result.current.load()
      result.current.addTask(makeTask('optimistic'))
    })

    // Server now returns the task — optimistic duplicate must not appear.
    await act(async () => {
      resolve([makeTask('optimistic'), makeTask('fetched')])
    })
    expect(result.current.tasks).toEqual([makeTask('optimistic'), makeTask('fetched')])
  })

  it('clears tasks immediately when load is called — stale tasks from previous repo do not persist during fetch', async () => {
    mockListGithatchTasks.mockResolvedValueOnce([makeTask('old')])
    const { result } = renderHook(() => useTasks('gho_test', 'owner', 'repo-a'))

    await act(async () => {
      result.current.load()
    })
    await waitFor(() => expect(result.current.tasks).toEqual([makeTask('old')]))

    // Second load (repo switch): tasks should be [] before the new fetch resolves
    let resolve: (t: GithatchTask[]) => void = () => {}
    mockListGithatchTasks.mockReturnValueOnce(
      new Promise<GithatchTask[]>((r) => {
        resolve = r
      }),
    )

    act(() => {
      result.current.load()
    })

    // Cleared immediately, before resolve fires
    expect(result.current.tasks).toEqual([])

    await act(async () => {
      resolve([makeTask('new')])
    })
    await waitFor(() => expect(result.current.tasks).toEqual([makeTask('new')]))
  })
})
