import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
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

  it('shows Check failed when checkSecretExists rejects', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockRejectedValue(new Error('Network error'))
    render(<SecretsView {...BASE_PROPS} />)
    await waitFor(() => {
      expect(screen.getAllByText('Check failed').length).toBeGreaterThan(0)
    })
  })

  it('renders CLAUDE_CODE_OAUTH_TOKEN, OPENAI_API_KEY, and SYNTHETIC_API_KEY', () => {
    vi.spyOn(secrets, 'checkSecretExists').mockImplementation(() => new Promise(() => {}))
    render(<SecretsView {...BASE_PROPS} />)
    expect(screen.getByText('CLAUDE_CODE_OAUTH_TOKEN')).toBeInTheDocument()
    expect(screen.getByText('OPENAI_API_KEY')).toBeInTheDocument()
    expect(screen.getByText('SYNTHETIC_API_KEY')).toBeInTheDocument()
  })

  it('calls onDone when Done button is clicked', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(false)
    render(<SecretsView {...BASE_PROPS} />)
    await waitFor(() => screen.getAllByText(/not set/i))
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

  it('ignores stale checkSecretExists responses after repo changes', async () => {
    const staleResolvers: Array<(exists: boolean) => void> = []
    vi.spyOn(secrets, 'checkSecretExists')
      .mockImplementationOnce(
        () =>
          new Promise<boolean>((resolve) => {
            staleResolvers.push(resolve)
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<boolean>((resolve) => {
            staleResolvers.push(resolve)
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<boolean>((resolve) => {
            staleResolvers.push(resolve)
          }),
      )
      .mockResolvedValue(false)

    const { rerender } = render(<SecretsView {...BASE_PROPS} />)

    // Switch repo — triggers a second effect invocation
    rerender(<SecretsView {...BASE_PROPS} repo="other-repo" />)

    // Wait for the new repo's results to settle (all "Not set")
    await waitFor(() => expect(screen.getAllByText('Not set').length).toBe(3))

    // Resolve the stale first-repo promises with true (would show "Set" without the guard)
    await act(async () => {
      staleResolvers.forEach((resolve) => resolve(true))
    })

    // Stale responses must be discarded — still "Not set", no "Update" buttons
    expect(screen.getAllByText('Not set').length).toBe(3)
    expect(screen.queryAllByRole('button', { name: /update/i }).length).toBe(0)
  })

  it('resets statuses to checking immediately when repo changes', async () => {
    vi.spyOn(secrets, 'checkSecretExists')
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockImplementation(() => new Promise(() => {})) // second repo hangs

    const { rerender } = render(<SecretsView {...BASE_PROPS} />)

    // First repo settles: all Set
    await waitFor(() => expect(screen.getAllByText('Set').length).toBe(3))

    // Switch repo — statuses should immediately reset to '…' (checking), not keep showing Set
    rerender(<SecretsView {...BASE_PROPS} repo="other-repo" />)

    // Status indicator spans should be '…' (checking), not 'Set'
    expect(screen.getAllByText('…').length).toBe(3)
    // No green "Set" status spans visible (buttons revert to "Set" label, but those are role=button)
    expect(screen.queryAllByRole('button', { name: /update/i }).length).toBe(0)
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

  it('shows the update form (not "already set") when Update is clicked on an existing secret', async () => {
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(true)
    render(<SecretsView {...BASE_PROPS} />)
    await waitFor(() => screen.getAllByRole('button', { name: /update/i }))
    fireEvent.click(screen.getAllByRole('button', { name: /update/i })[0])
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /save to repo/i })).toBeInTheDocument(),
    )
    expect(screen.queryByText(/already set on this repo/i)).not.toBeInTheDocument()
  })

  it('shows setup form (not "already set") when Set is clicked while status is still checking but secret resolves to set', async () => {
    // Regression: clicking Set while statuses[name]==='checking' used to capture
    // configuringIsUpdate=false via stale closure; TokenSetup then received forceSetup=false
    // and showed "already set on this repo" when the secret existed. Fix: derive forceSetup
    // from reactive statuses state so it updates when the check resolves.
    let resolveFirst: (exists: boolean) => void = () => {}
    vi.spyOn(secrets, 'checkSecretExists')
      // SecretsView's 3 initial checks — first one hangs, others always pending
      .mockImplementationOnce(
        () =>
          new Promise<boolean>((r) => {
            resolveFirst = r
          }),
      )
      .mockImplementationOnce(() => new Promise<boolean>(() => {}))
      .mockImplementationOnce(() => new Promise<boolean>(() => {}))
      // TokenSetup's own check (and any re-check when forceSetup flips): secret exists
      .mockResolvedValue(true)

    render(<SecretsView {...BASE_PROPS} />)

    expect(screen.getAllByText('…').length).toBe(3)

    // Click Set while CLAUDE_CODE_OAUTH_TOKEN status is still 'checking'
    fireEvent.click(screen.getAllByRole('button', { name: /^set$/i })[0])

    // SecretsView's check resolves: secret IS set → statuses → 'set' → forceSetup becomes true
    await act(async () => {
      resolveFirst(true)
    })

    // TokenSetup must show the entry form — not the "already set on this repo" message
    await waitFor(() =>
      expect(screen.queryByText(/already set on this repo/i)).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: /save to repo/i })).toBeInTheDocument()
  })

  it('resets configuring state when repo changes so TokenSetup is not shown for new repo', async () => {
    // Regression: configuring state was not cleared by the [token, owner, repo] effect;
    // switching repos while the token-entry form was open left it open for the new repo
    // without the user having clicked Set, potentially confusing or misleading them.
    vi.spyOn(secrets, 'checkSecretExists').mockResolvedValue(false)
    const { rerender } = render(<SecretsView {...BASE_PROPS} />)

    // Wait for secrets to load then open the token-entry form for first secret
    await waitFor(() => screen.getAllByRole('button', { name: /^set$/i }))
    fireEvent.click(screen.getAllByRole('button', { name: /^set$/i })[0])
    await waitFor(() => screen.getByRole('button', { name: /save to repo/i }))

    // Switch to a different repo — configuring should reset → secrets list, not TokenSetup
    rerender(<SecretsView {...BASE_PROPS} repo="other-repo" />)

    // TokenSetup must be dismissed; the secrets list heading must be visible
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /save to repo/i })).not.toBeInTheDocument(),
    )
    expect(screen.getByText('Secrets')).toBeInTheDocument()
  })
})
