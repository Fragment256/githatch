import { useEffect, useRef, useId, useCallback } from 'react'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const loadingRef = useRef(loading)
  loadingRef.current = loading
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open) {
      el.showModal()
      cancelRef.current?.focus()
    } else {
      el.close()
    }
  }, [open])

  const handleCancel = useCallback(() => {
    if (!loadingRef.current) onCancel()
  }, [onCancel])

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    const handleCancelEvent = (e: Event) => {
      e.preventDefault()
      handleCancel()
    }
    el.addEventListener('cancel', handleCancelEvent)
    return () => el.removeEventListener('cancel', handleCancelEvent)
  }, [handleCancel])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="m-auto w-full max-w-sm border-2 border-black bg-white p-6 backdrop:bg-black/40"
      onClick={(e) => {
        if (e.target === dialogRef.current) handleCancel()
      }}
    >
      <h2 id={titleId} className="font-mono text-xs font-bold tracking-widest text-black uppercase">
        {title}
      </h2>
      <p id={descId} className="mt-3 text-sm text-black/70">
        {message}
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          ref={cancelRef}
          onClick={handleCancel}
          disabled={loading}
          className="font-mono text-xs tracking-widest text-black/40 uppercase hover:text-black disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="border-2 border-black bg-black px-4 py-2 font-mono text-xs tracking-widest text-white uppercase hover:bg-white hover:text-black disabled:opacity-50"
        >
          {loading ? `${confirmLabel}…` : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
