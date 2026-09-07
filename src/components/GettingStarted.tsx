import { useState, useEffect } from 'react'

export type SecretStatus = 'loading' | 'present' | 'absent' | 'unknown'

interface GettingStartedProps {
  repoFullName: string
  repoName: string
  secretStatus: SecretStatus
  hasTasks: boolean
  onSetupToken: () => void
  onNewTask: () => void
}

const dismissKey = (fullName: string) => `githatch:onboarding-dismissed:${fullName}`

export function GettingStarted({
  repoFullName,
  repoName,
  secretStatus,
  hasTasks,
  onSetupToken,
  onNewTask,
}: GettingStartedProps) {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(dismissKey(repoFullName)) === 'true',
  )

  useEffect(() => {
    setDismissed(sessionStorage.getItem(dismissKey(repoFullName)) === 'true')
  }, [repoFullName])

  const allDone = secretStatus === 'present' && hasTasks

  function dismiss() {
    sessionStorage.setItem(dismissKey(repoFullName), 'true')
    setDismissed(true)
  }

  if (allDone && dismissed) return null

  if (allDone) {
    return (
      <div className="flex items-center justify-between border-2 border-black bg-white px-4 py-3">
        <span className="font-mono text-xs tracking-widest uppercase">
          You're set up — agents will run on schedule.
        </span>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="font-mono text-xs tracking-widest text-black/40 uppercase hover:text-black"
        >
          Dismiss
        </button>
      </div>
    )
  }

  const tokenDone = secretStatus === 'present'
  const tokenLoading = secretStatus === 'loading'
  const tokenUnknown = secretStatus === 'unknown'

  return (
    <div className="border-2 border-black bg-white">
      <div className="border-b border-black px-4 py-2">
        <span className="font-mono text-xs tracking-widest uppercase">Getting started</span>
      </div>
      <div className="divide-y divide-black/10">
        <Step done={true} label="Repository selected" detail={repoName} />
        <Step
          done={tokenDone}
          loading={tokenLoading}
          label="Claude token configured"
          detail={tokenUnknown ? "Couldn't verify — set it up to be safe" : undefined}
          action={
            !tokenDone && !tokenLoading
              ? { label: 'Set up token', onClick: onSetupToken }
              : undefined
          }
        />
        <Step
          done={hasTasks}
          label="Create your first task"
          action={!hasTasks ? { label: '+ New task', onClick: onNewTask } : undefined}
        />
      </div>
    </div>
  )
}

interface StepProps {
  done: boolean
  loading?: boolean
  label: string
  detail?: string
  action?: { label: string; onClick: () => void }
}

function Step({ done, loading, label, detail, action }: StepProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`shrink-0 font-mono text-xs tracking-widest uppercase ${done ? 'text-black' : 'text-black/30'}`}
        >
          {done ? '✓' : '○'}
        </span>
        <div className="min-w-0">
          <span className="font-mono text-xs tracking-widest uppercase">{label}</span>
          {detail && <span className="block font-mono text-xs text-black/50">{detail}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {loading && (
          <span className="font-mono text-xs tracking-widest text-black/40 uppercase">
            Checking…
          </span>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className="border border-black px-2.5 py-1 font-mono text-xs tracking-widest uppercase transition-colors duration-100 hover:bg-black hover:text-white"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
