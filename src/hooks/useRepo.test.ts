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

describe('useRepo — sessionStorage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
    mockListPushableRepos.mockResolvedValue([])
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('returns null activeRepo when nothing stored', () => {
    const { result } = renderHook(() => useRepo('gho_test'), { wrapper: createWrapper() })
    expect(result.current.activeRepo).toBeNull()
  })

  it('restores activeRepo from sessionStorage', () => {
    sessionStorage.setItem('active_repo', JSON.stringify(REPO))
    const { result } = renderHook(() => useRepo('gho_test'), { wrapper: createWrapper() })
    expect(result.current.activeRepo?.full_name).toBe('testuser/my-repo')
  })

  it('handles corrupted sessionStorage gracefully', () => {
    sessionStorage.setItem('active_repo', 'not-json{')
    const { result } = renderHook(() => useRepo('gho_test'), { wrapper: createWrapper() })
    expect(result.current.activeRepo).toBeNull()
  })

  it('setActiveRepo persists to sessionStorage', () => {
    const { result } = renderHook(() => useRepo('gho_test'), { wrapper: createWrapper() })
    act(() => {
      result.current.setActiveRepo(REPO)
    })
    const stored = JSON.parse(sessionStorage.getItem('active_repo')!) as github.GitHubRepo
    expect(stored.full_name).toBe('testuser/my-repo')
    expect(result.current.activeRepo?.full_name).toBe('testuser/my-repo')
  })

  it('setActiveRepo(null) removes from sessionStorage', () => {
    sessionStorage.setItem('active_repo', JSON.stringify(REPO))
    const { result } = renderHook(() => useRepo('gho_test'), { wrapper: createWrapper() })
    act(() => {
      result.current.setActiveRepo(null)
    })
    expect(sessionStorage.getItem('active_repo')).toBeNull()
    expect(result.current.activeRepo).toBeNull()
  })
})

describe('useRepo — repos query', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    sessionStorage.clear()
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
