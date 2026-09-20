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

function makeOptimistic(slug: string): GithatchTask {
  return { ...makeTask(slug), isOptimistic: true }
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

    expect(result.current.tasks).toEqual([makeOptimistic('new')])
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

    expect(result.current.tasks).toEqual([{ ...updated, isOptimistic: true }])
  })

  it('optimistic addTask is visible before the fetch resolves and preserved during eventual-consistency window', async () => {
    // Regression guard: handleTaskFormSubmit calls load() before addTask() — both
    // fire inside the same React 18 batch. addTask() must see the correct prev state
    // and not lose the optimistic insert.
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

    expect(result.current.tasks).toEqual([makeOptimistic('optimistic')])
    expect(result.current.loading).toBe(true)

    // Server responds without the new task yet (GitHub eventual consistency window).
    // The optimistic entry must survive.
    await act(async () => {
      resolve([makeTask('fetched')])
    })
    expect(result.current.tasks).toEqual([makeOptimistic('optimistic'), makeTask('fetched')])
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

  it('clears optimistic tasks from a previous repo when the repo prop changes', async () => {
    mockListGithatchTasks.mockResolvedValue([makeTask('b')])

    const { result, rerender } = renderHook(({ repo }) => useTasks('gho_test', 'owner', repo), {
      initialProps: { repo: 'repo-a' },
    })

    // Add an optimistic task in repo-a
    act(() => {
      result.current.addTask(makeTask('optimistic-a'))
    })
    expect(result.current.tasks).toEqual([makeOptimistic('optimistic-a')])

    // Switch to repo-b — tasks should be cleared immediately
    rerender({ repo: 'repo-b' })
    expect(result.current.tasks).toEqual([])

    // load() for repo-b returns only repo-b's tasks — optimistic-a must not appear
    await act(async () => {
      result.current.load()
    })
    await waitFor(() => expect(result.current.tasks).toEqual([makeTask('b')]))
  })

  it('discards an in-flight load when the repo changes even if no new load() is called', async () => {
    // Regression guard: requestId.current was not incremented in the repo-change cleanup
    // effect, so an in-flight load() for the old repo could complete and write its results
    // into the new repo's task list before any new load() was triggered.
    let resolveStale: (tasks: GithatchTask[]) => void = () => {}
    mockListGithatchTasks.mockReturnValueOnce(
      new Promise<GithatchTask[]>((resolve) => {
        resolveStale = resolve
      }),
    )

    const { result, rerender } = renderHook(({ repo }) => useTasks('gho_test', 'owner', repo), {
      initialProps: { repo: 'repo-a' },
    })

    act(() => {
      result.current.load()
    })

    // Switch repo without calling load() — the repo-change effect fires but no new
    // load() is issued yet. The in-flight load for repo-a must still be discarded.
    rerender({ repo: 'repo-b' })
    expect(result.current.tasks).toEqual([])
    expect(result.current.loading).toBe(false)

    // Resolve the stale repo-a fetch — must not pollute repo-b's state
    await act(async () => {
      resolveStale([makeTask('a')])
    })

    expect(result.current.tasks).toEqual([])
  })

  it('keeps existing tasks visible during a reload and replaces them when the fetch resolves', async () => {
    // Repo switches re-create the hook with fresh [] state via React prop changes, so
    // stale-repo tasks never appear. Within the same repo, keeping tasks visible during
    // a refresh avoids a flicker and preserves in-flight optimistic entries.
    mockListGithatchTasks.mockResolvedValueOnce([makeTask('old')])
    const { result } = renderHook(() => useTasks('gho_test', 'owner', 'repo-a'))

    await act(async () => {
      result.current.load()
    })
    await waitFor(() => expect(result.current.tasks).toEqual([makeTask('old')]))

    let resolve: (t: GithatchTask[]) => void = () => {}
    mockListGithatchTasks.mockReturnValueOnce(
      new Promise<GithatchTask[]>((r) => {
        resolve = r
      }),
    )

    act(() => {
      result.current.load()
    })

    // Tasks remain visible while the new fetch is in flight (no flicker).
    expect(result.current.tasks).toEqual([makeTask('old')])
    expect(result.current.loading).toBe(true)

    await act(async () => {
      resolve([makeTask('new')])
    })
    await waitFor(() => expect(result.current.tasks).toEqual([makeTask('new')]))
  })

  it('clears tasks immediately when token changes to null (logout) without a repo change', async () => {
    // Regression guard: token was missing from the reset useEffect deps. A token→null
    // transition (logout) while owner/repo stay the same left stale tasks visible until
    // the next repo change.
    mockListGithatchTasks.mockResolvedValueOnce([makeTask('a')])

    const { result, rerender } = renderHook(({ token }) => useTasks(token, 'owner', 'repo-a'), {
      initialProps: { token: 'gho_test' as string | null },
    })

    await act(async () => {
      result.current.load()
    })
    await waitFor(() => expect(result.current.tasks).toEqual([makeTask('a')]))

    // Token becomes null (logout) — tasks must be cleared immediately.
    rerender({ token: null })
    expect(result.current.tasks).toEqual([])
    expect(result.current.loading).toBe(false)
  })
})
