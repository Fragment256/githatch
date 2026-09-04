import { useState, useEffect, useRef } from 'react'
import { TOOLS, checkToolInstalled, installTool, type Tool } from '@/lib/tools'

interface Props {
  token: string
  owner: string
  repo: string
}

function ToolCard({
  tool,
  token,
  owner,
  repo,
}: {
  tool: Tool
  token: string
  owner: string
  repo: string
}) {
  const [installed, setInstalled] = useState<boolean | null>(null)
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestIdRef = useRef(0)

  useEffect(() => {
    const id = ++requestIdRef.current
    checkToolInstalled({ token, owner, repo, fileName: tool.workflowFileName })
      .then((result) => {
        if (id !== requestIdRef.current) return
        setInstalled(result)
      })
      .catch(() => {
        if (id !== requestIdRef.current) return
        setInstalled(false)
      })
  }, [token, owner, repo, tool.workflowFileName])

  const handleInstall = async () => {
    setInstalling(true)
    setError(null)
    try {
      await installTool({ token, owner, repo, tool })
      setInstalled(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Install failed')
    } finally {
      setInstalling(false)
    }
  }

  return (
    <div className="border-2 border-black bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-black">{tool.name}</h3>
            {installed === true && (
              <span className="border border-black px-2 py-0.5 font-mono text-xs tracking-widest text-black uppercase">
                Installed
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-black/50">{tool.description}</p>
        </div>
        {installed !== null && (
          <button
            onClick={handleInstall}
            disabled={installing}
            className="shrink-0 border-2 border-black bg-black px-3 py-1.5 font-mono text-xs tracking-widest text-white uppercase transition-colors duration-100 hover:bg-white hover:text-black disabled:opacity-50"
          >
            {installing ? 'Installing…' : installed ? 'Reinstall' : 'Install'}
          </button>
        )}
      </div>

      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

      <div className="mt-4 space-y-4 border-t border-black/10 pt-4">
        <div>
          <p className="mb-1.5 font-mono text-xs tracking-widest text-black uppercase">
            Setup required
          </p>
          <ol className="space-y-1">
            {tool.setupSteps.map((step, i) => (
              <li key={i} className="flex gap-2 text-xs text-black/70">
                <span className="shrink-0 font-mono text-black/30">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <a
            href={`https://github.com/${owner}/${repo}/settings/secrets/actions`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block font-mono text-xs tracking-widest text-black/40 uppercase underline hover:text-black"
          >
            Open repo secrets →
          </a>
        </div>

        <div>
          <p className="mb-1.5 font-mono text-xs tracking-widest text-black uppercase">
            Usage in prompt
          </p>
          <pre className="overflow-x-auto border border-black/20 bg-white p-3 font-mono text-xs text-black/70">
            {tool.usageExample}
          </pre>
        </div>
      </div>
    </div>
  )
}

export function ToolsPanel({ token, owner, repo }: Props) {
  return (
    <div className="w-full">
      <div className="mb-3">
        <h2 className="font-mono text-xs tracking-widest text-black uppercase">
          Tools ({TOOLS.length})
        </h2>
        <p className="mt-0.5 font-mono text-xs text-black/50">
          Utility workflows that your agent tasks can call via the GitHub CLI.
        </p>
      </div>
      <ul className="space-y-3">
        {TOOLS.map((tool) => (
          <li key={tool.id}>
            <ToolCard tool={tool} token={token} owner={owner} repo={repo} />
          </li>
        ))}
      </ul>
    </div>
  )
}
