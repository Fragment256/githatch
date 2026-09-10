import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRepo } from './useRepo'
import * as github from '@/lib/github'

vi.mock('@/lib/github', () => ({
  listPushableRepos: vi.fn(),
}))

const mockListPushableRepos = vi.mocked(github.listPushableRepos)

const REPO: github.GitHubRepo = {
  id: 1,
  name: 'my-repo',
  full_name: 'testuser/my-repo',
  private: false,
  permissions: { push: true, pull: true, admin: false },
  default_branch: 'main',
}

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children)
  return Wrapper
}

describe('useRepo — localStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    mockListPushableRepos.mockResolvedValue([])
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('returns null activeRepo when nothing stored', () => {
    const { result } = renderHook(() => useRepo('gho_test'), { wrapper: createWrapper() })
    expect(result.current.activeRepo).toBeNull()
  })

  it('restores activeRepo from localStorage', () => {
    localStorage.setItem('active_repo', JSON.stringify(REPO))
    const { result } = renderHook(() => useRepo('gho_test'), { wrapper: createWrapper() })
    expect(result.current.activeRepo?.full_name).toBe('testuser/my-repo')
  })

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('active_repo', 'not-json{')
    const { result } = renderHook(() => useRepo('gho_test'), { wrapper: createWrapper() })
    expect(result.current.activeRepo).toBeNull()
  })

  it('setActiveRepo persists to localStorage', () => {
    const { result } = renderHook(() => useRepo('gho_test'), { wrapper: createWrapper() })
    act(() => {
      result.current.setActiveRepo(REPO)
    })
    const stored = JSON.parse(localStorage.getItem('active_repo')!) as github.GitHubRepo
    expect(stored.full_name).toBe('testuser/my-repo')
    expect(result.current.activeRepo?.full_name).toBe('testuser/my-repo')
  })

  it('setActiveRepo(null) removes from localStorage', () => {
    localStorage.setItem('active_repo', JSON.stringify(REPO))
    const { result } = renderHook(() => useRepo('gho_test'), { wrapper: createWrapper() })
    act(() => {
      result.current.setActiveRepo(null)
    })
    expect(localStorage.getItem('active_repo')).toBeNull()
    expect(result.current.activeRepo).toBeNull()
  })

  it('clears activeRepo and localStorage when token transitions to null', async () => {
    localStorage.setItem('active_repo', JSON.stringify(REPO))
    const { result, rerender } = renderHook(({ token }) => useRepo(token), {
      wrapper: createWrapper(),
      initialProps: { token: 'gho_test' as string | null },
    })
    expect(result.current.activeRepo?.full_name).toBe('testuser/my-repo')
    rerender({ token: null })
    await waitFor(() => expect(result.current.activeRepo).toBeNull())
    expect(localStorage.getItem('active_repo')).toBeNull()
  })
})

describe('useRepo — repos query', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('returns repos when query resolves', async () => {
    mockListPushableRepos.mockResolvedValue([REPO])
    const { result } = renderHook(() => useRepo('gho_test'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.reposLoading).toBe(false))
    expect(result.current.repos).toEqual([REPO])
    expect(mockListPushableRepos).toHaveBeenCalledWith('gho_test')
  })

  it('returns empty repos when token is null (query disabled)', () => {
    const { result } = renderHook(() => useRepo(null), { wrapper: createWrapper() })
    expect(result.current.repos).toEqual([])
    expect(result.current.reposLoading).toBe(false)
    expect(mockListPushableRepos).not.toHaveBeenCalled()
  })

  it('exposes reposError when query fails', async () => {
    mockListPushableRepos.mockRejectedValue(new Error('API error'))
    const { result } = renderHook(() => useRepo('gho_test'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.reposError).toBeTruthy())
    expect(result.current.repos).toEqual([])
  })
})
