import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmDialog } from './ConfirmDialog'

function withStrictShowModal(fn: () => void) {
  let isOpen = false
  const origShow = HTMLDialogElement.prototype.showModal
  const origClose = HTMLDialogElement.prototype.close
  HTMLDialogElement.prototype.showModal = function () {
    if (isOpen) throw new DOMException('The dialog is already open.', 'InvalidStateError')
    isOpen = true
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    isOpen = false
    this.removeAttribute('open')
  }
  try {
    fn()
  } finally {
    HTMLDialogElement.prototype.showModal = origShow
    HTMLDialogElement.prototype.close = origClose
  }
}

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

  it('effect cleanup closes the dialog so a re-invoked showModal does not throw', () => {
    // Regression: useEffect for open=true had no cleanup, so StrictMode's unmount+remount
    // sequence would call showModal() on an already-open dialog → DOMException.
    withStrictShowModal(() => {
      const props = {
        open: true as boolean,
        title: 'Test',
        message: 'msg',
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      }
      const { unmount } = render(<ConfirmDialog {...props} />)
      // Simulates StrictMode cleanup — cleanup must close the dialog
      expect(() => {
        unmount()
        render(<ConfirmDialog {...props} />)
      }).not.toThrow()
    })
  })
})
