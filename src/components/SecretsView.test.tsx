import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SecretsView } from './SecretsView'
import * as secrets from '@/lib/secrets'

const BASE_PROPS = {
  token: 'gho_test',
  owner: 'testuser',
  repo: 'my-repo',
  onDone: vi.fn(),
}

describe('SecretsView', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    BASE_PROPS.onDone.mockReset()
  })

  it('shows checking state initially for each secret', () => {
    vi.spyOn(secrets, 'checkSecretExists').mockImplementation(() => new Promise(() => {}))
    render(<SecretsView {...BASE_PROPS} />)
    expect(screen.getAllByText('…').length).toBe(3)
  })

  it('shows Set status after checkSecretExists resolves true', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(true)
    render(<SecretsView {...BASE_PROPS} />)
    await waitFor(() => {
      expect(screen.getAllByText('Set').length).toBeGreaterThan(0)
    })
  })

  it('shows Not set status after checkSecretExists resolves false', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(false)
    render(<SecretsView {...BASE_PROPS} />)
    await waitFor(() => {
      expect(screen.getAllByText('Not set').length).toBeGreaterThan(0)
    })
  })

  it('shows Not set when checkSecretExists rejects', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockRejectedValue(new Error('Network error'))
    render(<SecretsView {...BASE_PROPS} />)
    await waitFor(() => {
      expect(screen.getAllByText('Not set').length).toBeGreaterThan(0)
    })
  })

  it('renders CLAUDE_CODE_OAUTH_TOKEN, OPENAI_API_KEY, and SYNTHETIC_API_KEY', () => {
    vi.spyOn(secrets, 'checkSecretExists').mockImplementation(() => new Promise(() => {}))
    render(<SecretsView {...BASE_PROPS} />)
    expect(screen.getByText('CLAUDE_CODE_OAUTH_TOKEN')).toBeInTheDocument()
    expect(screen.getByText('OPENAI_API_KEY')).toBeInTheDocument()
    expect(screen.getByText('SYNTHETIC_API_KEY')).toBeInTheDocument()
  })

  it('calls onDone when Done button is clicked', () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(false)
    render(<SecretsView {...BASE_PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(BASE_PROPS.onDone).toHaveBeenCalledOnce()
  })

  it('shows TokenSetup for the clicked secret', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(false)
    render(<SecretsView {...BASE_PROPS} />)
    await waitFor(() => screen.getAllByRole('button', { name: /set/i }))
    const setButtons = screen.getAllByRole('button', { name: /^set$/i })
    fireEvent.click(setButtons[0])
    await waitFor(() => expect(screen.getByText(/set up claude oauth token/i)).toBeInTheDocument())
  })

  it('shows Update button label when secret is already set', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(true)
    render(<SecretsView {...BASE_PROPS} />)
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /update/i }).length).toBeGreaterThan(0)
    })
  })

  it('returns to secrets list after TokenSetup onDone is called', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(false)
    vi.spyOn(secrets, 'putRepoSecret').mockResolvedValue(undefined)
    render(<SecretsView {...BASE_PROPS} />)
    await waitFor(() => screen.getAllByRole('button', { name: /^set$/i }))
    fireEvent.click(screen.getAllByRole('button', { name: /^set$/i })[0])
    await waitFor(() => screen.getByRole('button', { name: /save to repo/i }))
    const input = screen.getByLabelText(/paste token/i)
    fireEvent.change(input, { target: { value: 'gho_test_token' } })
    fireEvent.click(screen.getByRole('button', { name: /save to repo/i }))
    await waitFor(() => screen.getByText(/token stored successfully/i))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByText('CLAUDE_CODE_OAUTH_TOKEN')).toBeInTheDocument()
  })
})
