import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TokenSetup } from './TokenSetup'
import * as secrets from '@/lib/secrets'

const BASE_PROPS = {
  token: 'gho_test',
  owner: 'testuser',
  repo: 'my-repo',
  secretName: 'CLAUDE_CODE_OAUTH_TOKEN',
  onDone: vi.fn(),
}

describe('TokenSetup — CLAUDE_CODE_OAUTH_TOKEN', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    BASE_PROPS.onDone.mockReset()
  })

  it('shows checking state while checking existence', () => {
    vi.spyOn(secrets, 'checkSecretExists').mockImplementation(() => new Promise(() => {}))
    render(<TokenSetup {...BASE_PROPS} />)
    expect(screen.getByText(/checking for existing token/i)).toBeInTheDocument()
  })

  it('shows not-needed state when secret already exists', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(true)
    render(<TokenSetup {...BASE_PROPS} />)
    await waitFor(() => expect(screen.getByText(/already set on this repo/i)).toBeInTheDocument())
  })

  it('calls onDone when Continue is clicked in not-needed state', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(true)
    render(<TokenSetup {...BASE_PROPS} />)
    await waitFor(() => screen.getByRole('button', { name: /continue/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(BASE_PROPS.onDone).toHaveBeenCalledOnce()
  })

  it('shows setup form when secret does not exist', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(false)
    render(<TokenSetup {...BASE_PROPS} />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /save to repo/i })).toBeInTheDocument(),
    )
    expect(screen.getByLabelText(/paste token/i)).toBeInTheDocument()
    expect(screen.getByText(/claude setup-token/)).toBeInTheDocument()
  })

  it('shows setup form when checkSecretExists rejects', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockRejectedValue(new Error('Network'))
    render(<TokenSetup {...BASE_PROPS} />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /save to repo/i })).toBeInTheDocument(),
    )
  })

  it('save button is disabled when input is empty', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(false)
    render(<TokenSetup {...BASE_PROPS} />)
    await waitFor(() => screen.getByRole('button', { name: /save to repo/i }))
    expect(screen.getByRole('button', { name: /save to repo/i })).toBeDisabled()
  })

  it('save button is enabled when input has a value', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(false)
    render(<TokenSetup {...BASE_PROPS} />)
    await waitFor(() => screen.getByLabelText(/paste token/i))
    fireEvent.change(screen.getByLabelText(/paste token/i), {
      target: { value: 'gho_mytoken' },
    })
    expect(screen.getByRole('button', { name: /save to repo/i })).toBeEnabled()
  })

  it('shows done state after successful save', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(false)
    vi.spyOn(secrets, 'putRepoSecret').mockResolvedValue(undefined)
    render(<TokenSetup {...BASE_PROPS} />)
    await waitFor(() => screen.getByLabelText(/paste token/i))
    fireEvent.change(screen.getByLabelText(/paste token/i), {
      target: { value: 'gho_mytoken' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save to repo/i }))
    await waitFor(() => expect(screen.getByText(/token stored successfully/i)).toBeInTheDocument())
  })

  it('calls onDone when Continue is clicked in done state', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(false)
    vi.spyOn(secrets, 'putRepoSecret').mockResolvedValue(undefined)
    render(<TokenSetup {...BASE_PROPS} />)
    await waitFor(() => screen.getByLabelText(/paste token/i))
    fireEvent.change(screen.getByLabelText(/paste token/i), {
      target: { value: 'gho_mytoken' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save to repo/i }))
    await waitFor(() => screen.getByRole('button', { name: /continue/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(BASE_PROPS.onDone).toHaveBeenCalledOnce()
  })

  it('shows error message when putRepoSecret fails', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(false)
    vi.spyOn(secrets, 'putRepoSecret').mockRejectedValue(new Error('Forbidden'))
    render(<TokenSetup {...BASE_PROPS} />)
    await waitFor(() => screen.getByLabelText(/paste token/i))
    fireEvent.change(screen.getByLabelText(/paste token/i), {
      target: { value: 'gho_mytoken' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save to repo/i }))
    await waitFor(() => expect(screen.getByText('Forbidden')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /save to repo/i })).toBeInTheDocument()
  })

  it('shows error and allows retry when save fails', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(false)
    const putSpy = vi
      .spyOn(secrets, 'putRepoSecret')
      .mockRejectedValueOnce(new Error('Server error'))
      .mockResolvedValueOnce(undefined)
    render(<TokenSetup {...BASE_PROPS} />)
    await waitFor(() => screen.getByLabelText(/paste token/i))
    fireEvent.change(screen.getByLabelText(/paste token/i), {
      target: { value: 'gho_mytoken' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save to repo/i }))
    await waitFor(() => screen.getByText('Server error'))
    fireEvent.click(screen.getByRole('button', { name: /save to repo/i }))
    await waitFor(() => screen.getByText(/token stored successfully/i))
    expect(putSpy).toHaveBeenCalledTimes(2)
  })

  it('stale checkSecretExists response is ignored when secretName changes mid-flight', async () => {
    let resolveFirst!: (v: boolean) => void
    const firstCheck = new Promise<boolean>((r) => {
      resolveFirst = r
    })

    vi.spyOn(secrets, 'checkSecretExists')
      .mockReturnValueOnce(firstCheck)
      .mockResolvedValueOnce(false)

    const { rerender } = render(<TokenSetup {...BASE_PROPS} secretName="CLAUDE_CODE_OAUTH_TOKEN" />)
    // Re-render with a new secretName while the first check is still in flight
    rerender(<TokenSetup {...BASE_PROPS} secretName="OPENAI_API_KEY" />)

    // Second check resolves → should show setup form for OPENAI_API_KEY
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /save to repo/i })).toBeInTheDocument(),
    )

    // Resolve stale first check as "exists" — must NOT flip state to not-needed
    await act(async () => {
      resolveFirst(true)
    })

    expect(screen.getByRole('button', { name: /save to repo/i })).toBeInTheDocument()
    expect(screen.queryByText(/already set on this repo/i)).not.toBeInTheDocument()
  })
})

describe('TokenSetup — OPENAI_API_KEY', () => {
  const OPENAI_PROPS = { ...BASE_PROPS, secretName: 'OPENAI_API_KEY' }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows openai-specific title', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(false)
    render(<TokenSetup {...OPENAI_PROPS} />)
    await waitFor(() => expect(screen.getByText(/openai api key/i)).toBeInTheDocument())
  })

  it('label reads "Paste key" for non-token secrets', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(false)
    render(<TokenSetup {...OPENAI_PROPS} />)
    await waitFor(() => screen.getByLabelText(/paste key/i))
    expect(screen.getByLabelText(/paste key/i)).toBeInTheDocument()
  })

  it('does not show the generate step for OPENAI_API_KEY', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(false)
    render(<TokenSetup {...OPENAI_PROPS} />)
    await waitFor(() => screen.getByRole('button', { name: /save to repo/i }))
    expect(screen.queryByText(/claude setup-token/)).not.toBeInTheDocument()
  })
})

describe('TokenSetup — unknown secret', () => {
  it('falls back to generic title for unrecognised secret names', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(false)
    render(<TokenSetup {...BASE_PROPS} secretName="MY_CUSTOM_KEY" />)
    await waitFor(() => expect(screen.getByText(/set up api key/i)).toBeInTheDocument())
  })
})

describe('TokenSetup — forceSetup (Update path)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    BASE_PROPS.onDone.mockReset()
  })

  it('shows setup form when forceSetup=true even though secret already exists', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(true)
    render(<TokenSetup {...BASE_PROPS} forceSetup />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /save to repo/i })).toBeInTheDocument(),
    )
    expect(screen.queryByText(/already set on this repo/i)).not.toBeInTheDocument()
  })

  it('still shows not-needed when forceSetup is omitted and secret exists', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(true)
    render(<TokenSetup {...BASE_PROPS} />)
    await waitFor(() => expect(screen.getByText(/already set on this repo/i)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /save to repo/i })).not.toBeInTheDocument()
  })
})
