import { useState, useEffect, useRef } from 'react'
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

function FoundOrMissing({ found }: { found: boolean }) {
  return found ? (
    <Pill label="Found" />
  ) : (
    <span className="font-mono text-xs text-black/25">Not found</span>
  )
}

function SectionHeader({ label }: { label: string }) {
  return <p className="font-mono text-xs tracking-widest text-black/50 uppercase">{label}</p>
}

function ConfigBody({ config }: { config: RepoAgentConfig }) {
  return (
    <div className="flex flex-col gap-4 border-t border-black px-4 py-4">
      <div className="flex flex-col gap-3">
        <SectionHeader label="Claude" />
        <Row label="CLAUDE.md">
          <FoundOrMissing found={config.hasClaude} />
        </Row>
        <Row label="settings.json">
          <FoundOrMissing found={config.hasSettings} />
        </Row>
        <Row label="Skills">
          {config.skills.length === 0 ? (
            <span className="font-mono text-xs text-black/25">None</span>
          ) : (
            config.skills.map((s) => <Pill key={s} label={s} />)
          )}
        </Row>
        <Row label="Agents">
          {config.agents.length === 0 ? (
            <span className="font-mono text-xs text-black/25">None</span>
          ) : (
            config.agents.map((a) => <Pill key={a} label={a} />)
          )}
        </Row>
      </div>
      <div className="flex flex-col gap-3">
        <SectionHeader label="Codex CLI / Kimi" />
        <Row label="AGENTS.md">
          <FoundOrMissing found={config.hasAgentsMd} />
        </Row>
        <Row label="config.toml">
          <FoundOrMissing found={config.hasCodexConfig} />
        </Row>
        <Row label="hooks.json">
          <FoundOrMissing found={config.hasCodexHooks} />
        </Row>
      </div>
    </div>
  )
}

export function AgentConfig({ token, owner, repo }: Props) {
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState<RepoAgentConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    requestIdRef.current += 1
    setConfig(null)
    setOpen(false)
  }, [owner, repo])

  useEffect(() => {
    if (!open || config !== null) return
    const id = (requestIdRef.current += 1)
    setLoading(true)
    setError(null)
    fetchRepoAgentConfig({ token, owner, repo })
      .then((result) => {
        if (id !== requestIdRef.current) return
        setConfig(result)
      })
      .catch((err: unknown) => {
        if (id !== requestIdRef.current) return
        setError(err instanceof Error ? err.message : 'Failed to load config')
      })
      .finally(() => {
        if (id !== requestIdRef.current) return
        setLoading(false)
      })
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
