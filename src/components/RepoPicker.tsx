import { useEffect, useRef, useState } from 'react'
import type { GitHubRepo } from '@/lib/github'

interface Props {
  repos: GitHubRepo[]
  activeRepo: GitHubRepo | null
  loading: boolean
  error: Error | null
  onSelect: (repo: GitHubRepo) => void
}

export function RepoPicker({ repos, activeRepo, loading, error, onSelect }: Props) {
  const [query, setQuery] = useState(activeRepo?.full_name ?? '')
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setQuery(activeRepo?.full_name ?? '')
  }, [activeRepo])

  if (loading) {
    return <p className="text-sm text-gray-500">Loading repositories…</p>
  }

  if (error) {
    return <p className="text-sm text-red-600">Failed to load repositories: {error.message}</p>
  }

  const filtered = repos.filter((r) => r.full_name.toLowerCase().includes(query.toLowerCase()))

  const select = (repo: GitHubRepo) => {
    onSelect(repo)
    setOpen(false)
  }

  const revert = () => {
    setQuery(activeRepo?.full_name ?? '')
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const repo = filtered[highlightedIndex]
      if (repo) select(repo)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      revert()
      inputRef.current?.blur()
    }
  }

  return (
    <div className="relative w-full max-w-sm">
      <label
        htmlFor="repo-select"
        className="mb-1 block font-mono text-xs tracking-widest uppercase"
      >
        Active repository
      </label>
      <input
        ref={inputRef}
        id="repo-select"
        role="combobox"
        type="text"
        autoComplete="off"
        aria-expanded={open}
        aria-controls="repo-select-list"
        value={query}
        onFocus={() => {
          setOpen(true)
          setHighlightedIndex(0)
        }}
        onBlur={() => revert()}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setHighlightedIndex(0)
        }}
        onKeyDown={handleKeyDown}
        className="block w-full border-2 border-black bg-white px-3 py-2 text-sm focus:outline-none"
      />
      {open && (
        <ul
          id="repo-select-list"
          role="listbox"
          className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto border-2 border-black bg-white"
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">No repositories match.</li>
          )}
          {filtered.map((repo, index) => (
            <li key={repo.id} role="option" aria-selected={index === highlightedIndex}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(repo)}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  index === highlightedIndex ? 'bg-black text-white' : 'text-black hover:bg-gray-50'
                }`}
              >
                {repo.full_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
