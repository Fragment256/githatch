import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  listPushableRepos,
  listRepoSecrets,
  upsertWorkflowFile,
  deleteWorkflowFile,
  type GitHubRepo,
} from './github'

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

describe('upsertWorkflowFile', () => {
  const params = {
    token: 'gho_test',
    owner: 'testuser',
    repo: 'my-repo',
    slug: 'weekly-digest',
    yaml: 'name: githatch-weekly-digest\n',
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a new file when none exists (GET returns 404)', async () => {
    const fetchMock = vi
      .fn()
      // GET — file not found
      .mockResolvedValueOnce({ ok: false, status: 404 })
      // PUT — creation succeeds
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
    vi.stubGlobal('fetch', fetchMock)

    await upsertWorkflowFile(params)

    const putCall = fetchMock.mock.calls[1] as [string, RequestInit]
    const body = JSON.parse(putCall[1].body as string) as {
      message: string
      content: string
      sha?: string
    }
    expect(putCall[0]).toContain('.github/workflows/githatch-weekly-digest.yml')
    expect(body.sha).toBeUndefined()
    // content should be base64 of the yaml
    expect(atob(body.content)).toBe(params.yaml)
  })

  it('updates an existing file using the SHA from GET', async () => {
    const existingSha = 'abc123def456'
    const fetchMock = vi
      .fn()
      // GET — file exists
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sha: existingSha }),
      })
      // PUT — update succeeds
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
    vi.stubGlobal('fetch', fetchMock)

    await upsertWorkflowFile(params)

    const putCall = fetchMock.mock.calls[1] as [string, RequestInit]
    const body = JSON.parse(putCall[1].body as string) as { sha?: string }
    expect(body.sha).toBe(existingSha)
  })

  it('throws when PUT fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 422, json: () => Promise.resolve({}) })
    vi.stubGlobal('fetch', fetchMock)

    await expect(upsertWorkflowFile(params)).rejects.toThrow()
  })
})

describe('deleteWorkflowFile', () => {
  const params = {
    token: 'gho_test',
    owner: 'testuser',
    repo: 'my-repo',
    path: '.github/workflows/githatch-weekly-digest.yml',
  }

  beforeEach(() => vi.restoreAllMocks())

  it('GETs the file for SHA then DELETEs it', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ sha: 'abc123' }) })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await deleteWorkflowFile(params)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [, opts] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(opts.method).toBe('DELETE')
    const body = JSON.parse(opts.body as string) as { sha: string }
    expect(body.sha).toBe('abc123')
  })

  it('throws when file is not found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    await expect(deleteWorkflowFile(params)).rejects.toThrow()
  })

  it('throws when DELETE fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ sha: 'abc123' }) })
      .mockResolvedValueOnce({ ok: false, status: 403 })
    vi.stubGlobal('fetch', fetchMock)
    await expect(deleteWorkflowFile(params)).rejects.toThrow()
  })
})

describe('listRepoSecrets', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('returns array of secret names on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            total_count: 2,
            secrets: [
              { name: 'GH_TOKEN', created_at: '', updated_at: '' },
              { name: 'CLAUDE_CODE_OAUTH_TOKEN', created_at: '', updated_at: '' },
            ],
          }),
      }),
    )
    const names = await listRepoSecrets({ token: 'gho_test', owner: 'alice', repo: 'my-repo' })
    expect(names).toEqual(['GH_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN'])
  })

  it('returns empty array when no secrets exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ total_count: 0, secrets: [] }),
      }),
    )
    const names = await listRepoSecrets({ token: 'gho_test', owner: 'alice', repo: 'my-repo' })
    expect(names).toEqual([])
  })

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    await expect(
      listRepoSecrets({ token: 'gho_test', owner: 'alice', repo: 'my-repo' }),
    ).rejects.toThrow()
  })
})
