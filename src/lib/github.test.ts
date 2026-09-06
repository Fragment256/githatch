import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  listPushableRepos,
  listRepoSecrets,
  upsertWorkflowFile,
  deleteWorkflowFile,
  fetchFileContent,
  fetchRepoAgentConfig,
  getRecentCommits,
  getRecentPRs,
  getPRCounts,
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

  it('throws when GET returns a non-404 error without attempting the PUT', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 403 })
    vi.stubGlobal('fetch', fetchMock)

    await expect(upsertWorkflowFile(params)).rejects.toThrow('403')
    expect(fetchMock).toHaveBeenCalledTimes(1)
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

  it('throws a permission/server error message (not "not found") when GET returns 403', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    await expect(deleteWorkflowFile(params)).rejects.toThrow(/failed to fetch workflow file/i)
    await expect(deleteWorkflowFile(params)).rejects.not.toThrow(/not found/i)
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

  it('requests per_page=100 to avoid the 30-secret default truncation', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ total_count: 0, secrets: [] }),
    })
    vi.stubGlobal('fetch', fetchMock)
    await listRepoSecrets({ token: 'gho_test', owner: 'alice', repo: 'my-repo' })
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('per_page=100')
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

  it('paginates across multiple pages until total_count is satisfied', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({
      name: `SECRET_${String(i).padStart(3, '0')}`,
    }))
    const page2 = [{ name: 'CLAUDE_CODE_OAUTH_TOKEN' }]
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ total_count: 101, secrets: page1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ total_count: 101, secrets: page2 }),
      })
    vi.stubGlobal('fetch', fetchMock)
    const names = await listRepoSecrets({ token: 'gho_test', owner: 'alice', repo: 'my-repo' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(names).toHaveLength(101)
    expect(names).toContain('CLAUDE_CODE_OAUTH_TOKEN')
    const url2 = fetchMock.mock.calls[1][0] as string
    expect(url2).toContain('page=2')
  })
})

describe('fetchFileContent', () => {
  const params = { token: 'gho_test', owner: 'testuser', repo: 'my-repo', path: 'CLAUDE.md' }

  beforeEach(() => vi.restoreAllMocks())

  it('fetches and decodes a UTF-8 file', async () => {
    const text = 'Hello, world!'
    const encoded = btoa(unescape(encodeURIComponent(text)))
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: encoded }),
      }),
    )
    const result = await fetchFileContent(params)
    expect(result).toBe(text)
  })

  it('handles base64 with whitespace (multi-line GitHub encoding)', async () => {
    const text = 'test content'
    const raw = btoa(unescape(encodeURIComponent(text)))
    const withNewlines = raw.slice(0, 4) + '\n' + raw.slice(4)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: withNewlines }),
      }),
    )
    const result = await fetchFileContent(params)
    expect(result).toBe(text)
  })

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    await expect(fetchFileContent(params)).rejects.toThrow('404')
  })
})

describe('fetchRepoAgentConfig', () => {
  const params = { token: 'gho_test', owner: 'testuser', repo: 'my-repo' }

  beforeEach(() => vi.restoreAllMocks())

  it('returns hasClaude=true when CLAUDE.md exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) }))
    const config = await fetchRepoAgentConfig(params)
    expect(config.hasClaude).toBe(true)
  })

  it('returns hasClaude=false when CLAUDE.md does not exist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    const config = await fetchRepoAgentConfig(params)
    expect(config.hasClaude).toBe(false)
    expect(config.hasSettings).toBe(false)
    expect(config.skills).toEqual([])
    expect(config.agents).toEqual([])
  })

  it('parses skill directory names from skills listing', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // CLAUDE.md
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // settings.json
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { name: 'my-skill', type: 'dir' },
            { name: 'readme.md', type: 'file' },
            { name: 'not-md', type: 'file' },
          ]),
      }) // skills
      .mockResolvedValueOnce({ ok: false }) // agents
      .mockResolvedValueOnce({ ok: false }) // AGENTS.md
      .mockResolvedValueOnce({ ok: false }) // codex config
      .mockResolvedValueOnce({ ok: false }) // codex hooks
    vi.stubGlobal('fetch', fetchMock)
    const config = await fetchRepoAgentConfig(params)
    expect(config.skills).toEqual(['my-skill', 'readme'])
  })
})

describe('getRecentCommits', () => {
  const params = { token: 'gho_test', owner: 'testuser', repo: 'my-repo' }

  beforeEach(() => vi.restoreAllMocks())

  it('returns commit summaries', async () => {
    const raw = [
      {
        sha: 'abcdef1234567',
        commit: {
          message: 'feat: add something\n\nbody',
          author: { date: '2026-01-01', name: 'Alice' },
        },
      },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => null },
        json: () => Promise.resolve(raw),
      }),
    )
    const commits = await getRecentCommits(params)
    expect(commits).toHaveLength(1)
    expect(commits[0].sha).toBe('abcdef1')
    expect(commits[0].message).toBe('feat: add something')
    expect(commits[0].author).toBe('Alice')
  })

  it('handles null commit.author gracefully', async () => {
    const raw = [{ sha: 'abc1234', commit: { message: 'msg', author: null } }]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => null },
        json: () => Promise.resolve(raw),
      }),
    )
    const commits = await getRecentCommits(params)
    expect(commits[0].author).toBe('')
    expect(commits[0].date).toBe('')
  })

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    await expect(getRecentCommits(params)).rejects.toThrow()
  })

  it('paginates across multiple pages via Link header — returns commits from all pages', async () => {
    const page1 = [
      {
        sha: 'aaaaaaa1234567',
        commit: { message: 'fix: page-1 commit', author: { date: '2026-01-01', name: 'Alice' } },
      },
    ]
    const page2 = [
      {
        sha: 'bbbbbbb1234567',
        commit: { message: 'feat: page-2 commit', author: { date: '2026-01-02', name: 'Bob' } },
      },
    ]
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => '<https://api.github.com/repos/testuser/my-repo/commits?page=2>; rel="next"',
        },
        json: () => Promise.resolve(page1),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => null },
        json: () => Promise.resolve(page2),
      })
    vi.stubGlobal('fetch', fetchMock)

    const commits = await getRecentCommits(params)
    expect(commits).toHaveLength(2)
    expect(commits[0].sha).toBe('aaaaaaa')
    expect(commits[1].sha).toBe('bbbbbbb')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('getRecentPRs', () => {
  const params = { token: 'gho_test', owner: 'testuser', repo: 'my-repo' }

  beforeEach(() => vi.restoreAllMocks())

  it('returns PR summaries with merged flag', async () => {
    const raw = [
      {
        number: 42,
        title: 'fix: something',
        state: 'closed',
        merged_at: '2026-01-02T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
        html_url: 'https://github.com/testuser/my-repo/pull/42',
      },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(raw) }),
    )
    const prs = await getRecentPRs(params)
    expect(prs).toHaveLength(1)
    expect(prs[0].number).toBe(42)
    expect(prs[0].merged).toBe(true)
    expect(prs[0].state).toBe('closed')
  })

  it('returns merged=false for open PRs', async () => {
    const raw = [
      {
        number: 1,
        title: 'wip',
        state: 'open',
        merged_at: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        html_url: 'https://github.com/testuser/my-repo/pull/1',
      },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(raw) }),
    )
    const prs = await getRecentPRs(params)
    expect(prs[0].merged).toBe(false)
  })

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    await expect(getRecentPRs(params)).rejects.toThrow()
  })
})

describe('getPRCounts', () => {
  const params = { token: 'gho_test', owner: 'testuser', repo: 'my-repo' }

  beforeEach(() => vi.restoreAllMocks())

  it('uses Link header last-page to return exact open PR count for large repos', async () => {
    const fetchMock = vi
      .fn()
      // open PRs call: Link header says page 80 = last → 80 open PRs
      .mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (h: string) =>
            h === 'Link'
              ? '<https://api.github.com/repos/testuser/my-repo/pulls?state=open&per_page=1&page=2>; rel="next", <https://api.github.com/repos/testuser/my-repo/pulls?state=open&per_page=1&page=80>; rel="last"'
              : null,
        },
        json: () => Promise.resolve([{ number: 1 }]),
      })
      // merged PRs search call: total_count = 200
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => null },
        json: () => Promise.resolve({ total_count: 200 }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const counts = await getPRCounts(params)
    expect(counts.open).toBe(80)
    expect(counts.merged).toBe(200)
  })

  it('returns open=1 when there is exactly one open PR (no Link header)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => null },
        json: () => Promise.resolve([{ number: 1 }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => null },
        json: () => Promise.resolve({ total_count: 0 }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const counts = await getPRCounts(params)
    expect(counts.open).toBe(1)
    expect(counts.merged).toBe(0)
  })

  it('returns open=0 when there are no open PRs', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => null },
        json: () => Promise.resolve([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => null },
        json: () => Promise.resolve({ total_count: 5 }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const counts = await getPRCounts(params)
    expect(counts.open).toBe(0)
  })

  it('throws when open PR fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 403, headers: { get: () => null } }),
    )
    await expect(getPRCounts(params)).rejects.toThrow('403')
  })
})
