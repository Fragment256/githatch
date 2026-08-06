import { useState, useEffect } from 'react'
import { checkSecretExists } from '@/lib/secrets'
import { TokenSetup } from './TokenSetup'

interface SecretEntry {
  name: string
  description: string
}

const SECRETS: SecretEntry[] = [
  { name: 'CLAUDE_CODE_OAUTH_TOKEN', description: 'Claude provider' },
  { name: 'OPENAI_API_KEY', description: 'Codex provider' },
  { name: 'SYNTHETIC_API_KEY', description: 'Synthetic provider' },
]

type Status = 'checking' | 'set' | 'unset'

interface Props {
  token: string
  owner: string
  repo: string
  onDone: () => void
}

export function SecretsView({ token, owner, repo, onDone }: Props) {
  const [configuring, setConfiguring] = useState<string | null>(null)
  const [statuses, setStatuses] = useState<Record<string, Status>>({
    CLAUDE_CODE_OAUTH_TOKEN: 'checking',
    OPENAI_API_KEY: 'checking',
    SYNTHETIC_API_KEY: 'checking',
  })

  useEffect(() => {
    SECRETS.forEach(({ name }) => {
      checkSecretExists({ token, owner, repo, secretName: name })
        .then((exists) => setStatuses((s) => ({ ...s, [name]: exists ? 'set' : 'unset' })))
        .catch(() => setStatuses((s) => ({ ...s, [name]: 'unset' })))
    })
  }, [token, owner, repo])

  if (configuring) {
    return (
      <TokenSetup
        token={token}
        owner={owner}
        repo={repo}
        secretName={configuring}
        onDone={() => {
          setStatuses((s) => ({ ...s, [configuring]: 'set' }))
          setConfiguring(null)
        }}
      />
    )
  }

  return (
    <div className="flex w-full max-w-lg flex-col gap-5">
      <h2 className="font-display text-2xl font-bold tracking-tight">Secrets</h2>
      <p className="text-sm text-gray-500">
        Each provider needs an API key stored as an encrypted repo secret. Keys are encrypted in
        your browser before being sent to GitHub.
      </p>

      <div className="flex flex-col gap-3">
        {SECRETS.map(({ name, description }) => (
          <div
            key={name}
            className="flex items-center justify-between border-2 border-black bg-white px-4 py-3"
          >
            <div>
              <p className="font-mono text-sm font-semibold">{name}</p>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
            <div className="flex items-center gap-3">
              {statuses[name] === 'checking' && (
                <span className="font-mono text-xs text-gray-400">…</span>
              )}
              {statuses[name] === 'set' && (
                <span className="font-mono text-xs text-green-700">Set</span>
              )}
              {statuses[name] === 'unset' && (
                <span className="font-mono text-xs text-gray-400">Not set</span>
              )}
              <button
                onClick={() => setConfiguring(name)}
                className="border border-black px-2.5 py-1 font-mono text-xs tracking-widest text-black uppercase transition-colors duration-100 hover:bg-black hover:text-white"
              >
                {statuses[name] === 'set' ? 'Update' : 'Set'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onDone}
        className="self-start border border-black px-2.5 py-1 font-mono text-xs tracking-widest text-black uppercase transition-colors duration-100 hover:bg-black hover:text-white"
      >
        Done
      </button>
    </div>
  )
}
