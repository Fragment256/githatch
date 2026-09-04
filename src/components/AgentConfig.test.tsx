import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgentConfig } from './AgentConfig'
import * as github from '@/lib/github'

const BASE_PROPS = {
  token: 'gho_test',
  owner: 'testuser',
  repo: 'my-repo',
}

describe('AgentConfig', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('renders collapsed by default', () => {
    render(<AgentConfig {...BASE_PROPS} />)
    expect(screen.getByRole('button', { name: /agent config/i })).toBeInTheDocument()
    expect(screen.queryByText(/CLAUDE.md/i)).not.toBeInTheDocument()
  })

  it('fetches and displays config when opened', async () => {
    vi.spyOn(github, 'fetchRepoAgentConfig').mockResolvedValue({
      hasClaude: true,
      hasSettings: false,
      skills: ['research', 'summarise'],
      agents: ['analyst'],
      hasAgentsMd: true,
      hasCodexConfig: false,
      hasCodexHooks: false,
    })
    render(<AgentConfig {...BASE_PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /agent config/i }))
    await waitFor(() => expect(screen.getAllByText('Found').length).toBeGreaterThan(0))
    expect(screen.getByText('research')).toBeInTheDocument()
    expect(screen.getByText('summarise')).toBeInTheDocument()
    expect(screen.getByText('analyst')).toBeInTheDocument()
  })

  it('shows Not found when CLAUDE.md and settings are absent', async () => {
    vi.spyOn(github, 'fetchRepoAgentConfig').mockResolvedValue({
      hasClaude: false,
      hasSettings: false,
      skills: [],
      agents: [],
      hasAgentsMd: false,
      hasCodexConfig: false,
      hasCodexHooks: false,
    })
    render(<AgentConfig {...BASE_PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /agent config/i }))
    await waitFor(() => expect(screen.getAllByText(/not found/i).length).toBe(5))
    expect(screen.getAllByText(/none/i).length).toBe(2)
  })

  it('shows Codex CLI section with found/not found states', async () => {
    vi.spyOn(github, 'fetchRepoAgentConfig').mockResolvedValue({
      hasClaude: false,
      hasSettings: false,
      skills: [],
      agents: [],
      hasAgentsMd: true,
      hasCodexConfig: true,
      hasCodexHooks: false,
    })
    render(<AgentConfig {...BASE_PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /agent config/i }))
    await waitFor(() => expect(screen.getByText(/codex cli/i)).toBeInTheDocument())
    expect(screen.getAllByText('Found').length).toBe(2)
  })

  it('shows error message when fetch fails', async () => {
    vi.spyOn(github, 'fetchRepoAgentConfig').mockRejectedValue(new Error('Network error'))
    render(<AgentConfig {...BASE_PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /agent config/i }))
    await waitFor(() => expect(screen.getByText(/Network error/)).toBeInTheDocument())
  })

  it('does not fetch again when toggled closed and reopened', async () => {
    const spy = vi.spyOn(github, 'fetchRepoAgentConfig').mockResolvedValue({
      hasClaude: true,
      hasSettings: true,
      skills: [],
      agents: [],
      hasAgentsMd: false,
      hasCodexConfig: false,
      hasCodexHooks: false,
    })
    render(<AgentConfig {...BASE_PROPS} />)
    const btn = screen.getByRole('button', { name: /agent config/i })
    fireEvent.click(btn)
    await waitFor(() => expect(spy).toHaveBeenCalledOnce())
    fireEvent.click(btn) // close
    fireEvent.click(btn) // reopen
    expect(spy).toHaveBeenCalledOnce()
  })

  it('ignores stale fetch response when repo changes mid-flight', async () => {
    let resolveStale!: (v: Awaited<ReturnType<typeof github.fetchRepoAgentConfig>>) => void
    const repoBConfig = {
      hasClaude: false,
      hasSettings: false,
      skills: ['repo-b-skill'],
      agents: [],
      hasAgentsMd: false,
      hasCodexConfig: false,
      hasCodexHooks: false,
    }
    // First call (repo-a): paused so we can resolve it as stale later.
    // All subsequent calls (repo-b, and any re-fetch after accordion re-opens): resolve immediately.
    vi.spyOn(github, 'fetchRepoAgentConfig')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveStale = resolve
          }),
      )
      .mockResolvedValue(repoBConfig)

    const { rerender } = render(<AgentConfig {...BASE_PROPS} repo="repo-a" />)

    // open for repo-a — fetch starts, paused
    fireEvent.click(screen.getByRole('button', { name: /agent config/i }))

    // switch repo before fetch resolves
    rerender(<AgentConfig {...BASE_PROPS} repo="repo-b" />)

    // open for repo-b — fetch resolves immediately with repo-b data
    fireEvent.click(screen.getByRole('button', { name: /agent config/i }))
    await waitFor(() => expect(screen.getByText('repo-b-skill')).toBeInTheDocument())

    // resolve stale repo-a response
    await act(async () => {
      resolveStale({
        hasClaude: true,
        hasSettings: true,
        skills: ['repo-a-skill'],
        agents: [],
        hasAgentsMd: false,
        hasCodexConfig: false,
        hasCodexHooks: false,
      })
    })

    // stale data must not overwrite repo-b's result
    expect(screen.queryByText('repo-a-skill')).toBeNull()
    expect(screen.getByText('repo-b-skill')).toBeInTheDocument()
  })

  it('resets and re-fetches when repo changes', async () => {
    const spy = vi.spyOn(github, 'fetchRepoAgentConfig').mockResolvedValue({
      hasClaude: false,
      hasSettings: false,
      skills: [],
      agents: [],
      hasAgentsMd: false,
      hasCodexConfig: false,
      hasCodexHooks: false,
    })
    const { rerender } = render(<AgentConfig {...BASE_PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /agent config/i }))
    await waitFor(() => expect(spy).toHaveBeenCalledOnce())

    rerender(<AgentConfig {...BASE_PROPS} repo="other-repo" />)
    // panel should collapse; opening again triggers a fresh fetch
    fireEvent.click(screen.getByRole('button', { name: /agent config/i }))
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2))
  })
})
