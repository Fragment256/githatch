import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkToolInstalled, installTool, TOOLS } from './tools'

const sendGmail = TOOLS.find((t) => t.id === 'send-gmail')!

describe('TOOLS', () => {
  it('includes send-gmail', () => {
    expect(sendGmail).toBeDefined()
    expect(sendGmail.workflowFileName).toBe('githatch-tool-send-gmail.yml')
  })

  it('send-gmail yaml includes workflow_dispatch inputs', () => {
    expect(sendGmail.workflowYaml).toContain('workflow_dispatch')
    expect(sendGmail.workflowYaml).toContain('inputs:')
    expect(sendGmail.workflowYaml).toContain('to:')
    expect(sendGmail.workflowYaml).toContain('subject:')
    expect(sendGmail.workflowYaml).toContain('file:')
  })

  it('send-gmail yaml references Gmail secrets', () => {
    expect(sendGmail.workflowYaml).toContain('GMAIL_USERNAME')
    expect(sendGmail.workflowYaml).toContain('GMAIL_APP_PASSWORD')
  })

  it('send-gmail has setup steps and usage example', () => {
    expect(sendGmail.setupSteps.length).toBeGreaterThan(0)
    expect(sendGmail.usageExample).toContain('githatch-tool-send-gmail.yml')
  })
})

describe('checkToolInstalled', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('returns true when the file exists (200)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    const result = await checkToolInstalled({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      fileName: 'githatch-tool-send-gmail.yml',
    })
    expect(result).toBe(true)
  })

  it('returns false when the file does not exist (404)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    const result = await checkToolInstalled({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      fileName: 'githatch-tool-send-gmail.yml',
    })
    expect(result).toBe(false)
  })

  it('calls the correct GitHub contents URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    await checkToolInstalled({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      fileName: 'githatch-tool-send-gmail.yml',
    })
    expect(fetchMock.mock.calls[0][0]).toContain(
      '/repos/testuser/my-repo/contents/.github/workflows/githatch-tool-send-gmail.yml',
    )
  })
})

describe('installTool', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('PUTs the workflow file when not already installed', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await installTool({ token: 'gho_test', owner: 'testuser', repo: 'my-repo', tool: sendGmail })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [url, opts] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(url).toContain('/contents/.github/workflows/githatch-tool-send-gmail.yml')
    expect(opts.method).toBe('PUT')
  })

  it('includes sha when updating an existing file', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ sha: 'abc123' }) })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await installTool({ token: 'gho_test', owner: 'testuser', repo: 'my-repo', tool: sendGmail })

    const body = JSON.parse(
      (fetchMock.mock.calls[1] as [string, RequestInit])[1].body as string,
    ) as { sha: string }
    expect(body.sha).toBe('abc123')
  })

  it('throws on failed PUT', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 403 })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      installTool({ token: 'gho_test', owner: 'testuser', repo: 'my-repo', tool: sendGmail }),
    ).rejects.toThrow()
  })

  it('throws when GET returns a non-404 error and does not attempt PUT', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 500 })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      installTool({ token: 'gho_test', owner: 'testuser', repo: 'my-repo', tool: sendGmail }),
    ).rejects.toThrow('500')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
