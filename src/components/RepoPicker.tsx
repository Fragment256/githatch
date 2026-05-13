import type { GitHubRepo } from '@/lib/github'

interface Props {
  repos: GitHubRepo[]
  activeRepo: GitHubRepo | null
  loading: boolean
  error: Error | null
  onSelect: (repo: GitHubRepo) => void
}

export function RepoPicker({ repos, activeRepo, loading, error, onSelect }: Props) {
  if (loading) {
    return <p className="text-sm text-gray-500">Loading repositories…</p>
  }

  if (error) {
    return <p className="text-sm text-red-600">Failed to load repositories: {error.message}</p>
  }

  return (
    <div className="w-full max-w-sm">
      <label
        htmlFor="repo-select"
        className="mb-1 block font-mono text-xs tracking-widest uppercase"
      >
        Active repository
      </label>
      <select
        id="repo-select"
        value={activeRepo?.full_name ?? ''}
        onChange={(e) => {
          const repo = repos.find((r) => r.full_name === e.target.value)
          if (repo) onSelect(repo)
        }}
        className="block w-full border-2 border-black bg-white px-3 py-2 text-sm focus:outline-none"
      >
        <option value="" disabled>
          — select a repository —
        </option>
        {repos.map((repo) => (
          <option key={repo.id} value={repo.full_name}>
            {repo.full_name}
          </option>
        ))}
      </select>
    </div>
  )
}
