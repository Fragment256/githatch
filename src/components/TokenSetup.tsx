import { useState, useEffect, useRef } from 'react'
import { checkSecretExists, putRepoSecret } from '@/lib/secrets'

interface SecretConfig {
  title: string
  preamble: React.ReactNode
  generateStep?: React.ReactNode
  placeholder: string
}

const SECRET_CONFIGS: Record<string, SecretConfig> = {
  CLAUDE_CODE_OAUTH_TOKEN: {
    title: 'Set up Claude OAuth token',
    preamble: (
      <p className="mt-1 text-sm text-gray-500">
        Scheduled tasks run via <strong>Claude Code Action</strong>, which needs a{' '}
        <code className="bg-gray-50 px-1 font-mono text-xs">CLAUDE_CODE_OAUTH_TOKEN</code> secret on
        this repo. Encrypted in your browser before storage.
      </p>
    ),
    generateStep: (
      <div className="border-2 border-black bg-white px-4 py-3">
        <p className="font-mono text-sm tracking-widest uppercase">Generate the token:</p>
        <code className="mt-1 block border border-black bg-gray-50 px-3 py-2 font-mono text-xs">
          claude setup-token
        </code>
        <p className="mt-2 text-xs text-gray-500">
          Run this in your terminal (requires Claude Code CLI). Copy the token it prints.
        </p>
      </div>
    ),
    placeholder: 'gho_…',
  },
  OPENAI_API_KEY: {
    title: 'Set up OpenAI API key',
    preamble: (
      <p className="mt-1 text-sm text-gray-500">
        Tasks using the <strong>Codex</strong> provider need an{' '}
        <code className="bg-gray-50 px-1 font-mono text-xs">OPENAI_API_KEY</code> repo secret. Get
        your key from platform.openai.com/api-keys. Encrypted in your browser before storage.
      </p>
    ),
    placeholder: 'sk-…',
  },
  SYNTHETIC_API_KEY: {
    title: 'Set up Synthetic API key',
    preamble: (
      <p className="mt-1 text-sm text-gray-500">
        Tasks using the <strong>Synthetic</strong> provider need a{' '}
        <code className="bg-gray-50 px-1 font-mono text-xs">SYNTHETIC_API_KEY</code> repo secret.
        Get your key from your Synthetic dashboard at synthetic.new. Encrypted in your browser
        before storage.
      </p>
    ),
    placeholder: 'sk-…',
  },
}

const FALLBACK_CONFIG: SecretConfig = {
  title: 'Set up API key',
  preamble: (
    <p className="mt-1 text-sm text-gray-500">
      Encrypted in your browser before being stored as a GitHub repo secret.
    </p>
  ),
  placeholder: '',
}

interface Props {
  token: string
  owner: string
  repo: string
  secretName: string
  onDone: () => void
}

type Phase = 'checking' | 'not-needed' | 'setup' | 'saving' | 'done' | 'error'

export function TokenSetup({ token, owner, repo, secretName, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const config = SECRET_CONFIGS[secretName] ?? FALLBACK_CONFIG

  useEffect(() => {
    const reqId = ++requestIdRef.current
    checkSecretExists({ token, owner, repo, secretName })
      .then((exists) => {
        if (reqId !== requestIdRef.current) return
        setPhase(exists ? 'not-needed' : 'setup')
      })
      .catch(() => {
        if (reqId !== requestIdRef.current) return
        setPhase('setup')
      })
  }, [token, owner, repo, secretName])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return
    setPhase('saving')
    setError(null)
    try {
      await putRepoSecret({ token, owner, repo, secretName, secretValue: value.trim() })
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
        <strong>{secretName}</strong> is already set on this repo.{' '}
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
        <h2 className="font-display text-2xl font-bold tracking-tight">{config.title}</h2>
        {config.preamble}
      </div>

      {config.generateStep}

      {error && (
        <div className="border-2 border-black bg-white px-4 py-3 text-sm text-black">{error}</div>
      )}

      <div>
        <label
          htmlFor="secret-value"
          className="mb-1 block font-mono text-xs tracking-widest text-black uppercase"
        >
          Paste {secretName === 'CLAUDE_CODE_OAUTH_TOKEN' ? 'token' : 'key'}
        </label>
        <input
          id="secret-value"
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={config.placeholder}
          className="block w-full border-2 border-black bg-white px-3 py-2 font-mono text-sm focus:outline-none"
          autoComplete="off"
        />
      </div>

      <button
        type="submit"
        disabled={phase === 'saving' || !value.trim()}
        className="border-2 border-black bg-black px-4 py-3 font-mono text-xs tracking-widest text-white uppercase transition-colors duration-100 hover:bg-white hover:text-black disabled:opacity-50"
      >
        {phase === 'saving' ? 'Encrypting & storing…' : 'Save to repo'}
      </button>
    </form>
  )
}
