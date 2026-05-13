import { useState, useEffect } from 'react'
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

  useEffect(() => {
    checkToolInstalled({ token, owner, repo, fileName: tool.workflowFileName })
      .then(setInstalled)
      .catch(() => setInstalled(false))
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
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">{tool.name}</h3>
            {installed === true && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Installed
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-gray-500">{tool.description}</p>
        </div>
        {installed !== null && (
          <button
            onClick={handleInstall}
            disabled={installing || installed === true}
            className="shrink-0 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-40"
          >
            {installing ? 'Installing…' : installed ? 'Reinstall' : 'Install'}
          </button>
        )}
      </div>

      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

      <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-700">Setup required</p>
          <ol className="space-y-1">
            {tool.setupSteps.map((step, i) => (
              <li key={i} className="flex gap-2 text-xs text-gray-600">
                <span className="shrink-0 font-medium text-gray-400">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <a
            href={`https://github.com/${owner}/${repo}/settings/secrets/actions`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-gray-500 underline hover:text-gray-700"
          >
            Open repo secrets →
          </a>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-700">Usage in prompt</p>
          <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 font-mono text-xs text-gray-700">
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
        <h2 className="text-sm font-semibold text-gray-700">Tools ({TOOLS.length})</h2>
        <p className="mt-0.5 text-xs text-gray-400">
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
