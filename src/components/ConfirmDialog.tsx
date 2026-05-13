import { useEffect, useRef } from 'react'

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

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open) el.showModal()
    else el.close()
  }, [open])

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    const handleCancel = (e: Event) => {
      e.preventDefault()
      onCancel()
    }
    el.addEventListener('cancel', handleCancel)
    return () => el.removeEventListener('cancel', handleCancel)
  }, [onCancel])

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-full max-w-sm border-2 border-black bg-white p-6 backdrop:bg-black/40"
      onClick={(e) => {
        if (e.target === dialogRef.current) onCancel()
      }}
    >
      <h2 className="font-mono text-xs font-bold tracking-widest text-black uppercase">{title}</h2>
      <p className="mt-3 text-sm text-black/70">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onCancel}
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
          {loading ? 'Deleting…' : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
