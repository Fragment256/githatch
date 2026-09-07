import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
})
