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
      <div className="border-2 border-black bg-white px-4 py-3 text-sm text-black">
        <strong>CLAUDE_CODE_OAUTH_TOKEN</strong> is already set on this repo.{' '}
        <button onClick={onDone} className="underline">
          Continue
        </button>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="border-2 border-black bg-white px-4 py-3 text-sm text-black">
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
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Set up Claude OAuth token
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Scheduled tasks run via <strong>Claude Code Action</strong>, which needs a{' '}
          <code className="bg-gray-50 px-1 font-mono text-xs">CLAUDE_CODE_OAUTH_TOKEN</code> secret
          on this repo. This token is encrypted in your browser before being stored in GitHub.
        </p>
      </div>

      <div className="border-2 border-black bg-white px-4 py-3">
        <p className="font-mono text-sm tracking-widest uppercase">Generate the token:</p>
        <code className="mt-1 block border border-black bg-gray-50 px-3 py-2 font-mono text-xs">
          claude setup-token
        </code>
        <p className="mt-2 text-xs text-gray-500">
          Run this in your terminal (requires Claude Code CLI). Copy the token it prints.
        </p>
      </div>

      {error && (
        <div className="border-2 border-black bg-white px-4 py-3 text-sm text-black">{error}</div>
      )}

      <div>
        <label
          htmlFor="claude-token"
          className="mb-1 block font-mono text-xs tracking-widest text-black uppercase"
        >
          Paste token
        </label>
        <input
          id="claude-token"
          type="password"
          value={claudeToken}
          onChange={(e) => setClaudeToken(e.target.value)}
          placeholder="gho_…"
          className="block w-full border-2 border-black bg-white px-3 py-2 font-mono text-sm focus:outline-none"
          autoComplete="off"
        />
      </div>

      <button
        type="submit"
        disabled={phase === 'saving' || !claudeToken.trim()}
        className="border-2 border-black bg-black px-4 py-3 font-mono text-xs tracking-widest text-white uppercase transition-colors duration-100 hover:bg-white hover:text-black disabled:opacity-50"
      >
        {phase === 'saving' ? 'Encrypting & storing…' : 'Save token to repo'}
      </button>
    </form>
  )
}
