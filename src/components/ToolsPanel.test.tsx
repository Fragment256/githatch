import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToolsPanel } from './ToolsPanel'
import * as tools from '@/lib/tools'

const defaultProps = { token: 'gho_test', owner: 'testuser', repo: 'my-repo' }

describe('ToolsPanel', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('renders the send-gmail tool card', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    render(<ToolsPanel {...defaultProps} />)
    await waitFor(() => screen.getByRole('button', { name: 'Install' }))
    expect(screen.getByText('Send Gmail')).toBeDefined()
  })

  it('shows Install button when tool is not installed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    render(<ToolsPanel {...defaultProps} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Install' })).toBeDefined())
  })

  it('shows Installed badge when tool is already installed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    render(<ToolsPanel {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Installed')).toBeDefined())
    expect(screen.getByRole('button', { name: 'Reinstall' })).toBeDefined()
  })

  it('calls installTool and shows Installed badge after clicking Install', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    render(<ToolsPanel {...defaultProps} />)
    const btn = await screen.findByRole('button', { name: 'Install' })
    await userEvent.click(btn)

    await waitFor(() => expect(screen.getByText('Installed')).toBeDefined())
    expect(screen.getByRole('button', { name: 'Reinstall' })).toBeDefined()
  })

  it('shows setup steps', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    render(<ToolsPanel {...defaultProps} />)
    await screen.findByRole('button', { name: 'Install' })
    expect(screen.getByText(/GMAIL_USERNAME/)).toBeDefined()
    expect(screen.getByText(/GMAIL_APP_PASSWORD/)).toBeDefined()
  })

  it('shows usage example', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    render(<ToolsPanel {...defaultProps} />)
    await screen.findByRole('button', { name: 'Install' })
    expect(screen.getByText(/githatch-tool-send-gmail\.yml/)).toBeDefined()
  })

  it('shows link to repo secrets page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    render(<ToolsPanel {...defaultProps} />)
    await screen.findByRole('button', { name: 'Install' })
    const link = screen.getByRole('link', { name: /Open repo secrets/ })
    expect((link as HTMLAnchorElement).href).toContain('testuser/my-repo/settings/secrets')
  })

  it('discards stale checkToolInstalled response when repo changes', async () => {
    let staleResolve!: (result: boolean) => void
    vi.spyOn(tools, 'checkToolInstalled')
      .mockImplementationOnce(
        () =>
          new Promise<boolean>((resolve) => {
            staleResolve = resolve
          }),
      )
      .mockResolvedValue(false)

    const { rerender } = render(<ToolsPanel token="gho_test" owner="testuser" repo="repo-a" />)

    // Switch repo before repo-a's check resolves
    rerender(<ToolsPanel token="gho_test" owner="testuser" repo="repo-b" />)

    // Wait for repo-b's result (not installed → Install button)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Install' })).toBeDefined())

    // Resolve stale repo-a response as "installed"
    await act(async () => {
      staleResolve(true)
    })

    // Stale result must be discarded — still "Install", not "Reinstall"/"Installed"
    expect(screen.queryByText('Installed')).toBeNull()
    expect(screen.getByRole('button', { name: 'Install' })).toBeDefined()
  })

  it('resets install button to hidden immediately when repo changes before new check resolves', async () => {
    vi.spyOn(tools, 'checkToolInstalled')
      .mockResolvedValueOnce(true) // repo-a: installed
      .mockImplementation(() => new Promise(() => {})) // repo-b: never resolves

    const { rerender } = render(<ToolsPanel token="gho_test" owner="testuser" repo="repo-a" />)
    // repo-a result: installed=true → Reinstall button visible
    await screen.findByRole('button', { name: 'Reinstall' })

    // Switch to repo-b — check is in-flight and never resolves
    rerender(<ToolsPanel token="gho_test" owner="testuser" repo="repo-b" />)

    // installed must reset to null → both Install and Reinstall hidden during check
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Reinstall' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Install' })).toBeNull()
    })
  })

  it('Reinstall button is enabled when tool is already installed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    render(<ToolsPanel {...defaultProps} />)
    const btn = await screen.findByRole('button', { name: 'Reinstall' })
    expect((btn as HTMLButtonElement).disabled).toBe(false)
  })

  it('shows check error and hides Install button when checkToolInstalled throws (e.g. 403)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    render(<ToolsPanel {...defaultProps} />)
    await waitFor(() => screen.getByText(/403/))
    expect(screen.queryByRole('button', { name: 'Install' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reinstall' })).toBeNull()
  })
})
