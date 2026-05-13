import { useState, useEffect } from 'react'
import { fetchRepoAgentConfig, type RepoAgentConfig } from '@/lib/github'

interface Props {
  token: string
  owner: string
  repo: string
}

function Pill({ label }: { label: string }) {
  return (
    <span className="border border-black px-2 py-0.5 font-mono text-xs tracking-wide">{label}</span>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <span className="w-36 shrink-0 font-mono text-xs tracking-widest text-black/40 uppercase">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  )
}

function ConfigBody({ config }: { config: RepoAgentConfig }) {
  return (
    <div className="flex flex-col gap-3 border-t border-black px-4 py-4">
      <Row label="CLAUDE.md">
        {config.hasClaude ? (
          <Pill label="Found" />
        ) : (
          <span className="font-mono text-xs text-black/25">Not found</span>
        )}
      </Row>
      <Row label="settings.json">
        {config.hasSettings ? (
          <Pill label="Found" />
        ) : (
          <span className="font-mono text-xs text-black/25">Not found</span>
        )}
      </Row>
      <Row label="Skills">
        {config.skills.length === 0 ? (
          <span className="font-mono text-xs text-black/25">None</span>
        ) : (
          config.skills.map((s) => <Pill key={s} label={s} />)
        )}
      </Row>
    </div>
  )
}

export function AgentConfig({ token, owner, repo }: Props) {
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState<RepoAgentConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setConfig(null)
    setOpen(false)
  }, [owner, repo])

  useEffect(() => {
    if (!open || config !== null) return
    setLoading(true)
    setError(null)
    fetchRepoAgentConfig({ token, owner, repo })
      .then(setConfig)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load config'),
      )
      .finally(() => setLoading(false))
  }, [open, config, token, owner, repo])

  return (
    <div className="border border-black">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 font-mono text-xs tracking-widest uppercase hover:bg-gray-50"
      >
        <span>Agent config</span>
        <span className="text-black/30">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <>
          {loading && (
            <div className="border-t border-black px-4 py-4">
              <p className="font-mono text-xs text-black/40">Loading…</p>
            </div>
          )}
          {error && (
            <div className="border-t border-black px-4 py-4">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
          {config && <ConfigBody config={config} />}
        </>
      )}
    </div>
  )
}
