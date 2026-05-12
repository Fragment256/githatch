import { useState, useEffect } from 'react'
import { checkSecretExists, putRepoSecret } from '@/lib/secrets'

const SECRET_NAME = 'CLAUDE_CODE_OAUTH_TOKEN'

interface Props {
  token: string
  owner: string
  repo: string
  onDone: () => void
}

type Phase = 'checking' | 'not-needed' | 'setup' | 'saving' | 'done' | 'error'

export function TokenSetup({ token, owner, repo, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [claudeToken, setClaudeToken] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkSecretExists({ token, owner, repo, secretName: SECRET_NAME })
      .then((exists) => setPhase(exists ? 'not-needed' : 'setup'))
      .catch(() => setPhase('setup'))
  }, [token, owner, repo])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!claudeToken.trim()) return
    setPhase('saving')
    setError(null)
    try {
      await putRepoSecret({
        token,
        owner,
        repo,
        secretName: SECRET_NAME,
        secretValue: claudeToken.trim(),
      })
      setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to store secret')
      setPhase('error')
    }
  }

  if (phase === 'checking') {
    return <p className="text-sm text-gray-500">Checking for existing token…</p>
  }

  if (phase === 'not-needed') {
    return (
      <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
        <strong>CLAUDE_CODE_OAUTH_TOKEN</strong> is already set on this repo.{' '}
        <button onClick={onDone} className="underline">
          Continue
        </button>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
        Token stored successfully.{' '}
        <button onClick={onDone} className="underline">
          Continue
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="flex w-full max-w-lg flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Set up Claude OAuth token</h2>
        <p className="mt-1 text-sm text-gray-500">
          Scheduled tasks run via <strong>Claude Code Action</strong>, which needs a{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">CLAUDE_CODE_OAUTH_TOKEN</code>{' '}
          secret on this repo. This token is encrypted in your browser before being stored in
          GitHub.
        </p>
      </div>

      <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-sm font-medium text-gray-700">Generate the token:</p>
        <code className="mt-1 block rounded bg-gray-100 px-3 py-2 text-xs text-gray-800">
          claude setup-token
        </code>
        <p className="mt-2 text-xs text-gray-500">
          Run this in your terminal (requires Claude Code CLI). Copy the token it prints.
        </p>
      </div>

      {error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div>
        <label htmlFor="claude-token" className="mb-1 block text-sm font-medium text-gray-700">
          Paste token
        </label>
        <input
          id="claude-token"
          type="password"
          value={claudeToken}
          onChange={(e) => setClaudeToken(e.target.value)}
          placeholder="gho_…"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
          autoComplete="off"
        />
      </div>

      <button
        type="submit"
        disabled={phase === 'saving' || !claudeToken.trim()}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {phase === 'saving' ? 'Encrypting & storing…' : 'Save token to repo'}
      </button>
    </form>
  )
}
