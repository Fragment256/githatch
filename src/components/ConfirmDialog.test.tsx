import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('shows confirmLabel in loading state, not hardcoded "Deleting…"', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Archive item"
        message="Are you sure?"
        confirmLabel="Archive"
        loading={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.queryByText('Deleting…')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Archive…' })).toBeInTheDocument()
  })

  it('shows "Delete…" in loading state when using the default Delete label', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Delete item"
        message="Are you sure?"
        loading={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Delete…' })).toBeInTheDocument()
  })

  it('does not call onCancel on Escape key while loading', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        title="Delete item"
        message="Are you sure?"
        loading={true}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )
    const dialog = document.querySelector('dialog')!
    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }))
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('does not call onCancel on backdrop click while loading', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        title="Delete item"
        message="Are you sure?"
        loading={true}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )
    const dialog = document.querySelector('dialog')!
    fireEvent.click(dialog)
    expect(onCancel).not.toHaveBeenCalled()
  })
})
