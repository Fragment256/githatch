import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToolsPanel } from './ToolsPanel'

const defaultProps = { token: 'gho_test', owner: 'testuser', repo: 'my-repo' }

describe('ToolsPanel', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('renders the send-gmail tool card', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    render(<ToolsPanel {...defaultProps} />)
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
})
