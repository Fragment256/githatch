import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
    })
    render(<AgentConfig {...BASE_PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /agent config/i }))
    await waitFor(() => expect(screen.getByText('Found')).toBeInTheDocument())
    expect(screen.getByText('research')).toBeInTheDocument()
    expect(screen.getByText('summarise')).toBeInTheDocument()
  })

  it('shows Not found when CLAUDE.md and settings are absent', async () => {
    vi.spyOn(github, 'fetchRepoAgentConfig').mockResolvedValue({
      hasClaude: false,
      hasSettings: false,
      skills: [],
    })
    render(<AgentConfig {...BASE_PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /agent config/i }))
    await waitFor(() => expect(screen.getAllByText(/not found/i).length).toBe(2))
    expect(screen.getByText(/none/i)).toBeInTheDocument()
  })

  it('shows error message when fetch fails', async () => {
    vi.spyOn(github, 'fetchRepoAgentConfig').mockRejectedValue(new Error('Network error'))
    render(<AgentConfig {...BASE_PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /agent config/i }))
    await waitFor(() => expect(screen.getByText(/Network error/)).toBeInTheDocument())
  })

  it('does not fetch again when toggled closed and reopened', async () => {
    const spy = vi
      .spyOn(github, 'fetchRepoAgentConfig')
      .mockResolvedValue({ hasClaude: true, hasSettings: true, skills: [] })
    render(<AgentConfig {...BASE_PROPS} />)
    const btn = screen.getByRole('button', { name: /agent config/i })
    fireEvent.click(btn)
    await waitFor(() => expect(spy).toHaveBeenCalledOnce())
    fireEvent.click(btn) // close
    fireEvent.click(btn) // reopen
    expect(spy).toHaveBeenCalledOnce()
  })

  it('resets and re-fetches when repo changes', async () => {
    const spy = vi
      .spyOn(github, 'fetchRepoAgentConfig')
      .mockResolvedValue({ hasClaude: false, hasSettings: false, skills: [] })
    const { rerender } = render(<AgentConfig {...BASE_PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /agent config/i }))
    await waitFor(() => expect(spy).toHaveBeenCalledOnce())

    rerender(<AgentConfig {...BASE_PROPS} repo="other-repo" />)
    // panel should collapse; opening again triggers a fresh fetch
    fireEvent.click(screen.getByRole('button', { name: /agent config/i }))
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2))
  })
})
