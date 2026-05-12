import { describe, it, expect, beforeEach, vi } from 'vitest'
import { listPushableRepos, type GitHubRepo } from './github'

const mockRepo = (overrides: Partial<GitHubRepo> = {}): GitHubRepo => ({
  id: 1,
  name: 'my-repo',
  full_name: 'testuser/my-repo',
  private: false,
  permissions: { push: true, pull: true, admin: false },
  default_branch: 'main',
  ...overrides,
})

describe('listPushableRepos', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches repos and returns only those with push permission', async () => {
    const repos = [
      mockRepo({ id: 1, name: 'pushable', permissions: { push: true, pull: true, admin: false } }),
      mockRepo({
        id: 2,
        name: 'read-only',
        permissions: { push: false, pull: true, admin: false },
      }),
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        headers: { get: () => null },
        json: () => Promise.resolve(repos),
      }),
    )
    const result = await listPushableRepos('gho_test')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('pushable')
  })

  it('paginates until no next link', async () => {
    const page1 = [mockRepo({ id: 1, name: 'repo-1' })]
    const page2 = [mockRepo({ id: 2, name: 'repo-2' })]
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => '<https://api.github.com/user/repos?page=2>; rel="next"' },
        json: () => Promise.resolve(page1),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => null },
        json: () => Promise.resolve(page2),
      })
    vi.stubGlobal('fetch', fetchMock)
    const result = await listPushableRepos('gho_test')
    expect(result).toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('throws on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, headers: { get: () => null } }),
    )
    await expect(listPushableRepos('gho_test')).rejects.toThrow()
  })
})
